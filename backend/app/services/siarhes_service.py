"""
Serviço de integração com a API SIARHES (Sistema Integrado de Administração
de Recursos Humanos do Estado do Espírito Santo).

Autenticação: OAuth2 Client Credentials (Basic Auth header)
Base URL:     https://apisiarhes.hom.es.gov.br
Auth URL:     https://acessocidadao.es.gov.br/is/connect/token
Escopo:       api-siahres-int-rh
Empresa IPAJM: código 3
"""

import base64
import logging
from datetime import datetime, timedelta
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ─── Credenciais ──────────────────────────────────────────────────────────────
SIARHES_BASE      = "https://apisiarhes.hom.es.gov.br"
AUTH_URL          = "https://acessocidadao.es.gov.br/is/connect/token"
CLIENT_ID         = "641b6f92-e570-42a4-b06c-2b371539ced6"
CLIENT_SECRET     = "gaFt9z5O$50gUuIeMhERKstBNrS3D$"
SCOPE             = "api-siahres-int-rh"
EMPRESA_IPAJM     = 3      # código da empresa IPAJM no SIARHES

# ─── Token cache (in-process) ─────────────────────────────────────────────────
_cached_token: str | None = None
_token_expires: datetime | None = None

TIMEOUT = httpx.Timeout(90.0, connect=10.0)

# ─── Resumo cache (evita consultas repetidas lentas à API SIARHES) ────────────
_resumo_cache: dict | None = None
_resumo_cache_expires: datetime | None = None
RESUMO_CACHE_TTL = timedelta(minutes=5)


async def _get_token() -> str:
    """Obtém (ou reutiliza) um Bearer token via OAuth2 Client Credentials."""
    global _cached_token, _token_expires

    if _cached_token and _token_expires and datetime.utcnow() < _token_expires:
        return _cached_token

    credentials = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode()).decode()

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(
            AUTH_URL,
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "client_credentials",
                "scope": SCOPE,
            },
        )
        resp.raise_for_status()
        payload = resp.json()

    _cached_token = payload["access_token"]
    expires_in = int(payload.get("expires_in", 3600))
    _token_expires = datetime.utcnow() + timedelta(seconds=expires_in - 60)
    return _cached_token


async def _get(path: str, params: dict | None = None) -> Any:
    """Executa GET autenticado na API SIARHES."""
    token = await _get_token()
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(
            f"{SIARHES_BASE}{path}",
            headers={"Authorization": f"Bearer {token}"},
            params=params or {},
        )
        resp.raise_for_status()
        return resp.json()


# ─── Helpers de paginação ─────────────────────────────────────────────────────

async def _fetch_all_pages(path: str, base_params: dict, page_size: int = 100) -> list[dict]:
    """Percorre todas as páginas de um endpoint paginado."""
    results: list[dict] = []
    page = 1
    while True:
        params = {**base_params, "pageNum": page, "pageSize": page_size}
        try:
            data = await _get(path, params)
        except Exception as exc:
            if page == 1:
                raise  # Página 1 falhou — sem dados, propaga o erro
            logger.warning("SIARHES %s page %d falhou: %s", path, page, exc)
            break

        # suporta resposta como lista direta OU como { "items": [...], "total": N }
        if isinstance(data, list):
            results.extend(data)
            if len(data) < page_size:
                break
        elif isinstance(data, dict):
            items = data.get("items") or data.get("data") or data.get("results") or []
            results.extend(items)
            total = data.get("total") or data.get("totalCount") or 0
            if len(results) >= total or len(items) < page_size:
                break
        else:
            break
        page += 1
    return results


# ─── Funções públicas ─────────────────────────────────────────────────────────

async def get_vinculos_resumo(empresa: int = EMPRESA_IPAJM) -> dict:
    """
    Retorna um resumo dos vínculos para a empresa:
    - total ativos
    - estagiários
    - comissionados / DT

    Nota: dataRef é parâmetro obrigatório da API — usamos a data de hoje.
    """
    from datetime import timezone
    data_ref = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00")

    try:
        todos = await _fetch_all_pages(
            "/v2/rh/Vinculos",
            {"codigoEmpresa": empresa, "dataRef": data_ref},
        )
    except Exception as exc:
        logger.error("get_vinculos_resumo: %s", exc)
        return {"total_ativos": None, "estagiarios": None, "comissionados": None, "raw_error": str(exc)}

    # situacao: "ATIVO", "ATIVA", "A", ou vazio (vínculo ainda vigente)
    # O campo pode ser nulo em alguns registros — incluímos todos sem dataVacancia
    hoje_date = datetime.utcnow().date()
    ativos: list[dict] = []
    for v in todos:
        vacancia_raw = v.get("dataVacancia")
        if vacancia_raw:
            try:
                if datetime.fromisoformat(str(vacancia_raw)[:10]).date() <= hoje_date:
                    continue  # já vacou
            except (ValueError, TypeError):
                pass
        aposentadoria_raw = v.get("dataAposentadoria")
        if aposentadoria_raw:
            try:
                if datetime.fromisoformat(str(aposentadoria_raw)[:10]).date() <= hoje_date:
                    continue  # aposentado
            except (ValueError, TypeError):
                pass
        ativos.append(v)

    estagiarios   = [v for v in ativos if "ESTAG" in str(v.get("tipoVinculo") or "").upper()]
    comissionados = [v for v in ativos if str(v.get("tipoVinculo") or "").upper() in ("COMISSIONADO", "DT")]

    return {
        "total_ativos":  len(ativos),
        "estagiarios":   len(estagiarios),
        "comissionados": len(comissionados),
    }


async def get_afastamentos_ativos(empresa: int = EMPRESA_IPAJM) -> dict:
    """
    Conta licenças/afastamentos ativos hoje para a empresa.
    "Ativo" = dataInicio <= hoje AND (dataTermino is null OR dataTermino >= hoje)
    """
    try:
        afastamentos = await _fetch_all_pages(
            "/v2/rh/LicencasAfastamentos",
            {"codigoEmpresa": empresa},
        )
    except Exception as exc:
        logger.error("get_afastamentos_ativos: %s", exc)
        return {"total_afastados": None, "raw_error": str(exc)}

    hoje = datetime.utcnow().date()
    ativos: list[dict] = []
    for a in afastamentos:
        inicio_raw = a.get("dataInicio")
        if not inicio_raw:
            continue
        try:
            inicio = datetime.fromisoformat(str(inicio_raw)[:10]).date()
        except (ValueError, TypeError):
            continue
        if inicio > hoje:
            continue
        # Usa dataTermino real; se nulo, usa dataPrevistaTermino
        fim_raw = a.get("dataTermino") or a.get("dataPrevistaTermino")
        if fim_raw:
            try:
                fim = datetime.fromisoformat(str(fim_raw)[:10]).date()
                if fim < hoje:
                    continue  # já encerrado
            except (ValueError, TypeError):
                pass
        ativos.append(a)

    por_tipo: dict[str, int] = {}
    for a in ativos:
        tipo = str(a.get("descricaoFrequencia") or a.get("mnemonico") or "OUTROS").strip()
        por_tipo[tipo] = por_tipo.get(tipo, 0) + 1

    return {
        "total_afastados": len(ativos),
        "por_tipo": por_tipo,
    }


async def get_ferias_previstas(empresa: int = EMPRESA_IPAJM, meses_futuros: int = 6) -> dict:
    """
    Conta servidores com saldo de férias e períodos próximos de vencer.
    - saldo = diasDireito - faltas - diasVendidos > 0 E dataPrescricao no futuro
    - a_vencer = prescricao dentro dos próximos `meses_futuros` meses
    """
    try:
        periodos = await _fetch_all_pages(
            "/v2/rh/PeriodosAquisitivosFerias",
            {"codigoEmpresa": empresa},
        )
    except Exception as exc:
        logger.error("get_ferias_previstas: %s", exc)
        return {"com_saldo": None, "raw_error": str(exc)}

    hoje = datetime.utcnow().date()
    # Calcular limite (N meses à frente)
    mes_limite = hoje.month + meses_futuros
    ano_limite = hoje.year + (mes_limite - 1) // 12
    mes_limite = (mes_limite - 1) % 12 + 1
    import calendar
    ultimo_dia = calendar.monthrange(ano_limite, mes_limite)[1]
    limite = hoje.replace(year=ano_limite, month=mes_limite, day=min(hoje.day, ultimo_dia))

    com_saldo: list[dict] = []
    proximas: list[dict] = []
    for p in periodos:
        direito  = int(p.get("diasDireito",  0) or 0)
        faltas   = int(p.get("faltas",       0) or 0)
        vendidos = int(p.get("diasVendidos", 0) or 0)
        saldo = direito - faltas - vendidos

        prescricao_raw = p.get("dataPrescricao")
        prescricao = None
        if prescricao_raw:
            try:
                prescricao = datetime.fromisoformat(str(prescricao_raw)[:10]).date()
            except (ValueError, TypeError):
                pass

        # Saldo positivo e não prescrito
        if saldo > 0 and (prescricao is None or prescricao >= hoje):
            com_saldo.append(p)
            if prescricao and hoje <= prescricao <= limite:
                proximas.append(p)

    return {
        "com_saldo":         len(com_saldo),
        "proximas_a_vencer": len(proximas),
    }


async def get_dados_pessoais(numfunc: int, empresa: int = EMPRESA_IPAJM) -> dict:
    """Dados pessoais de um servidor específico."""
    return await _get("/v2/rh/DadosPessoais", {"numfunc": numfunc, "codigoEmpresa": empresa})


async def get_vinculos_servidor(numfunc: int, empresa: int = EMPRESA_IPAJM) -> list:
    """Vínculos de um servidor específico."""
    from datetime import timezone
    data_ref = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00")
    return await _fetch_all_pages(
        "/v2/rh/Vinculos",
        {"numfunc": numfunc, "codigoEmpresa": empresa, "dataRef": data_ref},
    )


async def get_ferias_servidor(numfunc: int, empresa: int = EMPRESA_IPAJM) -> list:
    """Períodos aquisitivos de férias de um servidor."""
    return await _get("/v2/rh/PeriodosAquisitivosFerias", {"numfunc": numfunc, "codigoEmpresa": empresa})


async def get_licencas_servidor(numfunc: int) -> list:
    """Licenças e afastamentos de um servidor."""
    return await _get("/v2/rh/LicencasAfastamentos", {"numfunc": numfunc})


async def get_ficha_financeira(numfunc: int, ano: int, mes: int) -> dict:
    """Contracheque de um servidor para o mês/ano indicado."""
    return await _get(
        "/v2/rh/FichasFinanceiras",
        {"numfunc": numfunc, "anoRef": ano, "mesRef": mes, "expand": "itens"},
    )


async def _fetch_frequencias_mes(empresa: int, ano: int, mes: int) -> list[dict]:
    """
    Busca os registros de frequência lançados para o mês/ano indicado.
    Retorna lista bruta (pode ser vazia se endpoint não existir ou não houver dados).
    """
    try:
        return await _fetch_all_pages(
            "/v2/rh/Frequencias",
            {"codigoEmpresa": empresa, "anoRef": ano, "mesRef": mes},
        )
    except Exception as exc:
        logger.warning("_fetch_frequencias_mes: %s", exc)
        return []


async def get_frequencias_pendentes(
    empresa: int = EMPRESA_IPAJM,
    vinculos_raw: list[dict] | None = None,
) -> dict:
    """
    Conta servidores ativos com frequência pendente no mês atual.

    Parâmetro opcional ``vinculos_raw``:
      - Se fornecido (lista bruta já buscada), evita uma chamada duplicada à
        API de vínculos — padrão de uso dentro de ``get_resumo_geral``.
      - Se omitido, busca os vínculos internamente (uso standalone).
    """
    from datetime import timezone

    hoje = datetime.now(timezone.utc)
    ano, mes = hoje.year, hoje.month

    # ── Busca vínculos brutos (se não fornecidos) ─────────────────────────────
    if vinculos_raw is None:
        data_ref = hoje.strftime("%Y-%m-%dT00:00:00")
        try:
            vinculos_raw = await _fetch_all_pages(
                "/v2/rh/Vinculos",
                {"codigoEmpresa": empresa, "dataRef": data_ref},
            )
        except Exception as exc:
            logger.error("get_frequencias_pendentes (vínculos): %s", exc)
            return {"pendentes": None, "raw_error": str(exc)}

    # ── Busca frequências do mês ───────────────────────────────────────────────
    frequencias = await _fetch_frequencias_mes(empresa, ano, mes)

    # numfuncs que já têm frequência lançada no mês
    com_frequencia: set[str] = {
        str(f.get("numfunc") or f.get("matricula") or "").strip()
        for f in frequencias
        if f.get("numfunc") or f.get("matricula")
    }

    # Filtra vínculos ativos (mesma lógica de get_vinculos_resumo)
    hoje_date = hoje.date()
    pendentes = 0
    for v in vinculos_raw:
        vacancia_raw = v.get("dataVacancia")
        if vacancia_raw:
            try:
                if datetime.fromisoformat(str(vacancia_raw)[:10]).date() <= hoje_date:
                    continue
            except (ValueError, TypeError):
                pass
        aposentadoria_raw = v.get("dataAposentadoria")
        if aposentadoria_raw:
            try:
                if datetime.fromisoformat(str(aposentadoria_raw)[:10]).date() <= hoje_date:
                    continue
            except (ValueError, TypeError):
                pass
        numfunc = str(v.get("numfunc") or v.get("matricula") or "").strip()
        if numfunc and numfunc not in com_frequencia:
            pendentes += 1

    return {"pendentes": pendentes}


async def get_resumo_geral(empresa: int = EMPRESA_IPAJM) -> dict:
    """
    Agrega todos os indicadores de RH em uma única chamada de resumo.
    Usado pelo painel GerenciarRH. Resultado em cache por 5 minutos.

    Estratégia de performance:
      1. Dispara 4 chamadas ao SIARHES em paralelo via asyncio.gather:
         vínculos brutos, afastamentos, férias e frequências do mês.
      2. Processa frequências pendentes localmente reusando os vínculos
         já buscados — zero chamadas duplicadas à API.
    """
    global _resumo_cache, _resumo_cache_expires
    import asyncio
    from datetime import timezone

    if _resumo_cache and _resumo_cache_expires and datetime.utcnow() < _resumo_cache_expires:
        logger.debug("get_resumo_geral: retornando cache")
        return _resumo_cache

    hoje = datetime.now(timezone.utc)
    data_ref = hoje.strftime("%Y-%m-%dT00:00:00")

    # ── Fase única: todas as 4 chamadas à API em paralelo ────────────────────
    # Vínculos, afastamentos, férias e frequências são disparados juntos.
    # O tempo total passa a ser max(t1, t2, t3, t4) em vez de t1+t2+t3+t4.
    vinculos_raw, afastados, ferias, freq_raw = await asyncio.gather(
        _fetch_all_pages(
            "/v2/rh/Vinculos",
            {"codigoEmpresa": empresa, "dataRef": data_ref},
        ),
        get_afastamentos_ativos(empresa),
        get_ferias_previstas(empresa),
        _fetch_frequencias_mes(empresa, hoje.year, hoje.month),
        return_exceptions=True,
    )

    # ── Processa vínculos (igual a get_vinculos_resumo, sem nova chamada) ─────
    def _proc_vinculos(raw) -> dict:
        if isinstance(raw, Exception):
            return {
                "total_ativos": None, "estagiarios": None, "comissionados": None,
                "raw_error": str(raw), "_raw_list": [],
            }
        hoje_date = datetime.utcnow().date()
        ativos: list[dict] = []
        for v in raw:
            vacancia_raw = v.get("dataVacancia")
            if vacancia_raw:
                try:
                    if datetime.fromisoformat(str(vacancia_raw)[:10]).date() <= hoje_date:
                        continue
                except (ValueError, TypeError):
                    pass
            aposentadoria_raw = v.get("dataAposentadoria")
            if aposentadoria_raw:
                try:
                    if datetime.fromisoformat(str(aposentadoria_raw)[:10]).date() <= hoje_date:
                        continue
                except (ValueError, TypeError):
                    pass
            ativos.append(v)
        estagiarios   = [v for v in ativos if "ESTAG" in str(v.get("tipoVinculo") or "").upper()]
        comissionados = [v for v in ativos if str(v.get("tipoVinculo") or "").upper() in ("COMISSIONADO", "DT")]
        return {
            "total_ativos":  len(ativos),
            "estagiarios":   len(estagiarios),
            "comissionados": len(comissionados),
            "_raw_list":     raw,  # reaproveitado no cálculo de pendentes
        }

    # ── Processa frequências pendentes reusando vínculos já buscados ──────────
    def _proc_freq_pendentes(vinculos_dict: dict, freq_list) -> dict:
        raw_list = vinculos_dict.get("_raw_list") or []
        if not raw_list or isinstance(freq_list, Exception):
            return {"pendentes": None}
        freq_list = freq_list if isinstance(freq_list, list) else []
        com_frequencia: set[str] = {
            str(f.get("numfunc") or f.get("matricula") or "").strip()
            for f in freq_list
            if f.get("numfunc") or f.get("matricula")
        }
        hoje_date = datetime.utcnow().date()
        pendentes = 0
        for v in raw_list:
            vacancia_raw = v.get("dataVacancia")
            if vacancia_raw:
                try:
                    if datetime.fromisoformat(str(vacancia_raw)[:10]).date() <= hoje_date:
                        continue
                except (ValueError, TypeError):
                    pass
            aposentadoria_raw = v.get("dataAposentadoria")
            if aposentadoria_raw:
                try:
                    if datetime.fromisoformat(str(aposentadoria_raw)[:10]).date() <= hoje_date:
                        continue
                except (ValueError, TypeError):
                    pass
            numfunc = str(v.get("numfunc") or v.get("matricula") or "").strip()
            if numfunc and numfunc not in com_frequencia:
                pendentes += 1
        return {"pendentes": pendentes}

    vinculos = _proc_vinculos(vinculos_raw)
    freq_res = _proc_freq_pendentes(vinculos, freq_raw)

    def _safe(result, key, default=None):
        if isinstance(result, (Exception, type(None))):
            return default
        return result.get(key, default)

    def _err(result) -> str | None:
        if isinstance(result, Exception):
            return str(result)
        if isinstance(result, dict) and result.get("raw_error"):
            return result["raw_error"]
        return None

    result = {
        "total_colaboradores":   _safe(vinculos,  "total_ativos"),
        "estagiarios":           _safe(vinculos,  "estagiarios"),
        "comissionados":         _safe(vinculos,  "comissionados"),
        "afastados":             _safe(afastados, "total_afastados"),
        "afastados_por_tipo":    _safe(afastados, "por_tipo", {}),
        "ferias_com_saldo":      _safe(ferias,    "com_saldo"),
        "ferias_a_vencer":       _safe(ferias,    "proximas_a_vencer"),
        "frequencias_pendentes": freq_res.get("pendentes"),
        "errors": {
            "vinculos":    _err(vinculos),
            "afastados":   _err(afastados),
            "ferias":      _err(ferias),
            "frequencias": None if isinstance(freq_raw, list) else str(freq_raw),
        },
    }

    # Só armazena em cache se os dados principais não tiveram erros
    if not _err(vinculos):
        _resumo_cache = result
        _resumo_cache_expires = datetime.utcnow() + RESUMO_CACHE_TTL
        logger.debug("get_resumo_geral: cache atualizado")

    return result
