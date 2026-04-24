"""
Serviço de integração com a API SIARHES (Sistema Integrado de Administração
de Recursos Humanos do Estado do Espírito Santo).

Autenticação: OAuth2 Client Credentials (Basic Auth header)
Base URL:     https://apisiarhes.hom.es.gov.br
Auth URL:     https://acessocidadao.es.gov.br/is/connect/token
Escopo:       api-siahres-int-rh
Empresa IPAJM: código 3
"""

import asyncio
import base64
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ─── Fuso horário de Brasília (UTC-3) ─────────────────────────────────────────
BRT = timezone(timedelta(hours=-3))

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

TIMEOUT = httpx.Timeout(20.0, connect=5.0)

# ─── Resumo cache (evita consultas repetidas lentas à API SIARHES) ────────────
_resumo_cache: dict | None = None
_resumo_cache_expires: datetime | None = None
_resumo_refresh_lock: asyncio.Lock | None = None
RESUMO_CACHE_TTL = timedelta(minutes=5)


def _get_resumo_lock() -> asyncio.Lock:
    """Lazy-init do Lock — precisa do event loop ativo na primeira chamada."""
    global _resumo_refresh_lock
    if _resumo_refresh_lock is None:
        _resumo_refresh_lock = asyncio.Lock()
    return _resumo_refresh_lock


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

async def _fetch_all_pages(path: str, base_params: dict, page_size: int = 500) -> list[dict]:
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
    data_ref = datetime.now(BRT).strftime("%Y-%m-%dT00:00:00")

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
    hoje_date = datetime.now(BRT).date()
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

    hoje = datetime.now(BRT).date()
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

    hoje = datetime.now(BRT).date()
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
    data_ref = datetime.now(BRT).strftime("%Y-%m-%dT00:00:00")
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


async def _fetch_frequencias_mes(empresa: int, secretaria: int, ano: int, mes: int) -> list[dict]:
    """
    Busca frequências registradas no SIARHES.
    ATENÇÃO: codigoEmpresa E codigoSecretaria são OBRIGATÓRIOS neste endpoint
    (conforme Dicionário de Dados SIARHES). A API não possui filtro por data;
    filtramos client-side pelo mês/ano indicado usando o campo dataInicio.
    """
    import calendar as cal
    try:
        all_freq = await _fetch_all_pages(
            "/v2/rh/Frequencias",
            {"codigoEmpresa": empresa, "codigoSecretaria": secretaria},
        )
        # Filtra pelo mês/ano de referência via dataInicio
        primeiro = datetime(ano, mes, 1).date()
        ultimo = datetime(ano, mes, cal.monthrange(ano, mes)[1]).date()
        resultado = []
        for f in all_freq:
            inicio_raw = f.get("dataInicio")
            if not inicio_raw:
                resultado.append(f)  # sem data: inclui por precaução
                continue
            try:
                inicio = datetime.fromisoformat(str(inicio_raw)[:10]).date()
                if primeiro <= inicio <= ultimo:
                    resultado.append(f)
            except (ValueError, TypeError):
                pass
        return resultado
    except Exception as exc:
        logger.warning("_fetch_frequencias_mes (emp=%s, sec=%s): %s", empresa, secretaria, exc)
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
    hoje = datetime.now(BRT)
    # Frequências referem-se ao mês anterior
    ano, mes = (hoje.year - 1, 12) if hoje.month == 1 else (hoje.year, hoje.month - 1)

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

    # ── Busca frequências do mês (empresa=3, secretaria=1 fixos para IPAJM) ─────
    all_freq_standalone = await _fetch_frequencias_mes(empresa, 1, ano, mes)

    # numfuncs que já têm frequência lançada no mês
    com_frequencia: set[str] = {
        str(f.get("numfunc") or f.get("matricula") or "").strip()
        for f in all_freq_standalone
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


async def _fetch_resumo_from_api(empresa: int = EMPRESA_IPAJM) -> dict:
    """
    Faz 3 chamadas ao SIARHES em paralelo, processa e atualiza o cache.
    Inclui listas enriquecidas com nomes dos servidores para os modais.
    Protegido por Lock: nunca dispara chamadas duplicadas simultâneas.
    """
    import calendar as cal
    global _resumo_cache, _resumo_cache_expires

    async with _get_resumo_lock():
        now = datetime.utcnow()
        if _resumo_cache and _resumo_cache_expires and now < _resumo_cache_expires:
            logger.debug("_fetch_resumo_from_api: cache já fresco")
            return _resumo_cache

        hoje = datetime.now(BRT)
        data_ref = hoje.strftime("%Y-%m-%dT00:00:00")
        hoje_date = hoje.date()
        # Frequências referem-se ao mês anterior
        ano, mes = (hoje.year - 1, 12) if hoje.month == 1 else (hoje.year, hoje.month - 1)

        # ── 3 chamadas paralelas ────────────────────────────────────────────
        vinculos_r, afastamentos_r, ferias_r = await asyncio.gather(
            _fetch_all_pages("/v2/rh/Vinculos", {"codigoEmpresa": empresa, "dataRef": data_ref}),
            _fetch_all_pages("/v2/rh/LicencasAfastamentos", {"codigoEmpresa": empresa}),
            _fetch_all_pages("/v2/rh/PeriodosAquisitivosFerias", {"codigoEmpresa": empresa}),
            return_exceptions=True,
        )

        errors: dict[str, str | None] = {"vinculos": None, "afastados": None, "ferias": None, "frequencias": None}

        # ── Vínculos → ativos + mapa de nomes ────────────────────────────────
        if isinstance(vinculos_r, Exception):
            errors["vinculos"] = str(vinculos_r)
            ativos: list[dict] = []
            nome_map: dict[str, str] = {}
        else:
            ativos = []
            for v in vinculos_r:
                vac = v.get("dataVacancia")
                if vac:
                    try:
                        if datetime.fromisoformat(str(vac)[:10]).date() <= hoje_date:
                            continue
                    except (ValueError, TypeError):
                        pass
                apos = v.get("dataAposentadoria")
                if apos:
                    try:
                        if datetime.fromisoformat(str(apos)[:10]).date() <= hoje_date:
                            continue
                    except (ValueError, TypeError):
                        pass
                ativos.append(v)
            nome_map = {
                str(v.get("numfunc")): v.get("nome") or ""
                for v in ativos if v.get("numfunc")
            }

        estagiarios_list  = [v for v in ativos if "ESTAG" in str(v.get("tipoVinculo") or "").upper()]
        comissionados_list = [v for v in ativos if str(v.get("tipoVinculo") or "").upper() in ("COMISSIONADO", "DT")]

        colaboradores_lista = sorted(
            [
                {
                    "numfunc":    v.get("numfunc"),
                    "nome":       v.get("nome") or "Nome não disponível",
                    "tipoVinculo": v.get("tipoVinculo") or "",
                    "categoria":  v.get("categoria") or "",
                }
                for v in ativos
            ],
            key=lambda x: str(x.get("nome") or ""),
        )

        # Mapa completo numfunc → vínculo bruto (para lookup rápido sem API extra)
        vinculos_map: dict[int, dict] = {
            int(v["numfunc"]): v for v in ativos if v.get("numfunc")
        }

        # ── Afastamentos → filtra ativos + lista com nomes ────────────────────
        if isinstance(afastamentos_r, Exception):
            errors["afastados"] = str(afastamentos_r)
            afastados_ativos: list[dict] = []
        else:
            afastados_ativos = []
            for a in afastamentos_r:
                inicio_raw = a.get("dataInicio")
                if not inicio_raw:
                    continue
                try:
                    inicio = datetime.fromisoformat(str(inicio_raw)[:10]).date()
                except (ValueError, TypeError):
                    continue
                if inicio > hoje_date:
                    continue
                fim_raw = a.get("dataTermino") or a.get("dataPrevistaTermino")
                if fim_raw:
                    try:
                        if datetime.fromisoformat(str(fim_raw)[:10]).date() < hoje_date:
                            continue
                    except (ValueError, TypeError):
                        pass
                afastados_ativos.append(a)

        afastados_por_tipo: dict[str, int] = {}
        afastados_lista: list[dict] = []
        for a in afastados_ativos:
            tipo = str(a.get("descricaoFrequencia") or a.get("mnemonico") or "OUTROS").strip()
            afastados_por_tipo[tipo] = afastados_por_tipo.get(tipo, 0) + 1
            nf = str(a.get("numfunc") or "")
            afastados_lista.append({
                "numfunc":    a.get("numfunc"),
                "nome":       nome_map.get(nf) or "Nome não disponível",
                "tipo":       tipo,
                "dataInicio": str(a.get("dataInicio") or "")[:10],
                "dataTermino": str(a.get("dataTermino") or a.get("dataPrevistaTermino") or "")[:10],
            })
        afastados_lista.sort(key=lambda x: str(x.get("nome") or ""))

        # ── Férias → filtra com saldo + lista com nomes ────────────────────────
        if isinstance(ferias_r, Exception):
            errors["ferias"] = str(ferias_r)
            ferias_com_saldo_list: list[dict] = []
            ferias_a_vencer_list: list[dict] = []
        else:
            mes_lim = hoje_date.month + 6
            ano_lim = hoje_date.year + (mes_lim - 1) // 12
            mes_lim = (mes_lim - 1) % 12 + 1
            limite = hoje_date.replace(
                year=ano_lim, month=mes_lim,
                day=min(hoje_date.day, cal.monthrange(ano_lim, mes_lim)[1]),
            )
            ferias_com_saldo_list = []
            ferias_a_vencer_list  = []
            for p in ferias_r:
                direito  = int(p.get("diasDireito",  0) or 0)
                faltas   = int(p.get("faltas",       0) or 0)
                vendidos = int(p.get("diasVendidos", 0) or 0)
                saldo = direito - faltas - vendidos
                prescricao = None
                presc_raw = p.get("dataPrescricao")
                if presc_raw:
                    try:
                        prescricao = datetime.fromisoformat(str(presc_raw)[:10]).date()
                    except (ValueError, TypeError):
                        pass
                if saldo > 0 and (prescricao is None or prescricao >= hoje_date):
                    nf = str(p.get("numfunc") or "")
                    item = {
                        "numfunc":    p.get("numfunc"),
                        "nome":       p.get("nome") or nome_map.get(nf) or "Nome não disponível",
                        "saldo":      saldo,
                        "prescricao": str(prescricao) if prescricao else None,
                    }
                    ferias_com_saldo_list.append(item)
                    if prescricao and hoje_date <= prescricao <= limite:
                        ferias_a_vencer_list.append(item)
            ferias_com_saldo_list.sort(key=lambda x: str(x.get("prescricao") or "9999-12-31"))
            ferias_a_vencer_list.sort(key=lambda x: str(x.get("prescricao") or "9999-12-31"))

        # ── Frequências → empresa=3, secretaria=1 fixos para IPAJM ─────────────
        frequencias_pendentes = None
        total_com_frequencia  = 0
        pendentes_lista: list[dict] = []
        if not errors["vinculos"]:
            all_freq = await _fetch_frequencias_mes(empresa, 1, ano, mes)
            com_freq_set = {
                str(f.get("numfunc") or "").strip()
                for f in all_freq if f.get("numfunc")
            }
            total_com_frequencia = len(com_freq_set)
            ativos_set = {str(v.get("numfunc") or "") for v in ativos if v.get("numfunc")}
            pendentes_set = ativos_set - com_freq_set
            frequencias_pendentes = len(pendentes_set)
            pendentes_lista = sorted(
                [
                    {"numfunc": int(nf) if nf.isdigit() else nf,
                     "nome":    nome_map.get(nf) or "Nome não disponível"}
                    for nf in pendentes_set
                ],
                key=lambda x: str(x.get("nome") or ""),
            )

        # ── Monta resultado ────────────────────────────────────────────────────
        fetch_time = datetime.utcnow()
        result = {
            "total_colaboradores":   len(ativos) if not errors["vinculos"] else None,
            "estagiarios":           len(estagiarios_list) if not errors["vinculos"] else None,
            "comissionados":         len(comissionados_list) if not errors["vinculos"] else None,
            "afastados":             len(afastados_ativos) if not errors["afastados"] else None,
            "afastados_por_tipo":    afastados_por_tipo,
            "ferias_com_saldo":      len(ferias_com_saldo_list) if not errors["ferias"] else None,
            "ferias_a_vencer":       len(ferias_a_vencer_list) if not errors["ferias"] else None,
            "frequencias_pendentes": frequencias_pendentes,
            "frequencias_detalhes": {
                "total_ativos":         len(ativos) if not errors["vinculos"] else None,
                "total_com_frequencia": total_com_frequencia,
                "mes_referencia":       mes,
                "ano_referencia":       ano,
            },
            # Listas enriquecidas para os modais do frontend
            "colaboradores_lista":          colaboradores_lista,
            "vinculos_map":                 vinculos_map,   # lookup interno numfunc→vínculo
            "afastados_lista":              afastados_lista,
            "ferias_lista":                 ferias_com_saldo_list,
            "ferias_a_vencer_lista":        ferias_a_vencer_list,
            "pendentes_frequencia_lista":   pendentes_lista,
            "cache_at": fetch_time.isoformat() + "Z",
            "errors":   errors,
        }

        if not errors["vinculos"]:
            _resumo_cache = result
            _resumo_cache_expires = fetch_time + RESUMO_CACHE_TTL
            logger.info("SIARHES cache atualizado (expira em %s min)", int(RESUMO_CACHE_TTL.total_seconds() // 60))
        else:
            logger.warning("SIARHES: vínculos falharam — cache NÃO atualizado. Erro: %s", errors["vinculos"])

        return result


async def get_capacitacoes_servidor(
    numfunc: int | None = None,
    nome: str | None = None,
    empresa: int = EMPRESA_IPAJM,
) -> list[dict]:
    """
    Retorna o histórico de capacitações/cursos de um servidor via SIARHES.
    Aceita numfunc OU nome — quando apenas nome é fornecido, resolve via cache.
    Endpoint: /v2/rh/Capacitacoes
    """
    import unicodedata

    def _norm(text: str) -> str:
        return unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode().upper().strip()

    # ── Resolve numfunc a partir do nome (via cache) ──────────────────────────
    if numfunc is None and nome:
        nome_norm = _norm(nome)
        nome_tokens = set(nome_norm.split())

        def _score(v_nome: str) -> float:
            tokens = set(_norm(v_nome).split())
            return len(tokens & nome_tokens) / len(nome_tokens) if nome_tokens else 0.0

        if _resumo_cache:
            cached_lista = _resumo_cache.get("colaboradores_lista") or []
            match = next((v for v in cached_lista if _norm(str(v.get("nome") or "")) == nome_norm), None)
            if not match:
                match = next((v for v in cached_lista if _score(str(v.get("nome") or "")) >= 0.70), None)
            if match and match.get("numfunc"):
                numfunc = int(match["numfunc"])
                logger.info("get_capacitacoes_servidor: numfunc=%s encontrado no cache para nome=%r", numfunc, nome)

        if numfunc is None:
            # Cache vazio — fallback: scan completo de vínculos por nome (lento, uma vez)
            logger.warning("get_capacitacoes_servidor: cache vazio, fazendo scan de vínculos para nome=%r", nome)
            data_ref = datetime.now(BRT).strftime("%Y-%m-%dT00:00:00")
            try:
                todos = await _fetch_all_pages(
                    "/v2/rh/Vinculos",
                    {"codigoEmpresa": empresa, "dataRef": data_ref},
                )
            except Exception as exc:
                logger.error("get_capacitacoes_servidor scan vínculos: %s", exc)
                return []
            match_v = next((v for v in todos if _norm(str(v.get("nome") or "")) == nome_norm), None)
            if not match_v:
                match_v = next((v for v in todos if _score(str(v.get("nome") or "")) >= 0.70), None)
            if match_v and match_v.get("numfunc"):
                numfunc = int(match_v["numfunc"])
                logger.info("get_capacitacoes_servidor: numfunc=%s encontrado via scan para nome=%r", numfunc, nome)
            else:
                logger.warning("get_capacitacoes_servidor: nenhum vínculo encontrado para nome=%r", nome)
                return []

    if numfunc is None:
        logger.error("get_capacitacoes_servidor: numfunc ou nome obrigatório")
        return []

    try:
        registros = await _fetch_all_pages(
            "/v2/rh/Capacitacoes",
            {"numfunc": numfunc, "codigoEmpresa": empresa},
        )
    except Exception as exc:
        logger.error("get_capacitacoes_servidor numfunc=%s: %s", numfunc, exc)
        return []

    def _str_date(v: Any) -> str | None:
        raw = str(v or "")[:10]
        return raw if len(raw) == 10 else None

    result = [
        {
            "sigla":       r.get("siglaEvento") or "",
            "nome_evento": r.get("nomeEvento") or "",
            "data_inicio": _str_date(r.get("dataInicioEvento")),
            "data_fim":    _str_date(r.get("dataFimEvento")),
            "carga_horaria": r.get("cargaHoraria"),
            "entidade":    r.get("entidade") or "",
            "pontos":      r.get("pontos"),
            "num_bi_ato":  r.get("numBIouAto") or "",
            "data_bi":     _str_date(r.get("dataBIouDoe")),
        }
        for r in registros
    ]
    # Ordena por data de início decrescente (mais recentes primeiro)
    result.sort(key=lambda x: x.get("data_inicio") or "0000-00-00", reverse=True)
    return result


async def get_progressao_carreira(numfunc: int | None = None, nome: str | None = None, empresa: int = EMPRESA_IPAJM) -> dict:
    """
    Retorna dados de progressão de carreira de um servidor.
    Aceita numfunc (número funcional) OU nome (fullName do AD) para localizar o vínculo.
    """
    import unicodedata

    def _norm(text: str) -> str:
        return unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode().upper().strip()

    data_ref = datetime.now(BRT).strftime("%Y-%m-%dT00:00:00")
    hoje_date = datetime.now(BRT).date()

    # ── Busca vínculos: por numfunc direto OU pesquisa por nome ──────────────
    if numfunc is not None:
        # Tenta servir direto do cache (evita chamada à API)
        cached_vin = (_resumo_cache or {}).get("vinculos_map", {}).get(int(numfunc)) if _resumo_cache else None
        if cached_vin:
            logger.info("get_progressao_carreira: servindo do cache para numfunc=%s", numfunc)
            vinculos = [cached_vin]
        else:
            try:
                vinculos = await _fetch_all_pages(
                    "/v2/rh/Vinculos",
                    {"numfunc": numfunc, "codigoEmpresa": empresa, "dataRef": data_ref},
                )
            except Exception as exc:
                logger.error("get_progressao_carreira numfunc=%s: %s", numfunc, exc)
                return {"erro": str(exc), "numfunc": numfunc}
    elif nome:
        nome_norm = _norm(nome)
        nome_tokens = set(nome_norm.split())

        def _score(v_nome: str) -> float:
            tokens = set(_norm(v_nome).split())
            return len(tokens & nome_tokens) / len(nome_tokens) if nome_tokens else 0.0

        # ── Atalho: usa o cache do resumo (já em memória) para achar o numfunc ──
        numfunc_from_cache: int | None = None
        if _resumo_cache:
            cached_lista = _resumo_cache.get("colaboradores_lista") or []
            # 1) Match exato
            match = next((v for v in cached_lista if _norm(str(v.get("nome") or "")) == nome_norm), None)
            # 2) Sobreposição de tokens ≥ 70%
            if not match:
                match = next(
                    (v for v in cached_lista if _score(str(v.get("nome") or "")) >= 0.70),
                    None,
                )
            if match and match.get("numfunc"):
                numfunc_from_cache = int(match["numfunc"])
                logger.info("get_progressao_carreira: numfunc=%s encontrado no cache para nome=%r", numfunc_from_cache, nome)

        if numfunc_from_cache is not None:
            # ── Caminho rápido: vínculo já está no cache em memória ──────────
            cached_vin = (_resumo_cache.get("vinculos_map") or {}).get(numfunc_from_cache)
            if cached_vin:
                logger.info("get_progressao_carreira: servindo vínculo do cache para numfunc=%s", numfunc_from_cache)
                ativo = cached_vin
                numfunc = numfunc_from_cache
                # Pula direto para o bloco de montagem do retorno
                vinculos = [ativo]
                goto_build = True
            else:
                goto_build = False
        else:
            goto_build = False

        if not goto_build:
            if numfunc_from_cache is not None:
                numfunc = numfunc_from_cache
            # Busca direta por numfunc via API (cache miss no vinculos_map)
            if numfunc is not None:
                try:
                    vinculos = await _fetch_all_pages(
                        "/v2/rh/Vinculos",
                        {"numfunc": numfunc, "codigoEmpresa": empresa, "dataRef": data_ref},
                    )
                except Exception as exc:
                    logger.error("get_progressao_carreira numfunc=%s (via cache): %s", numfunc, exc)
                    return {"erro": str(exc), "numfunc": numfunc}
            else:
                # Fallback lento: scan completo por nome
                logger.warning("get_progressao_carreira: cache vazio, buscando todos os vínculos para nome=%r", nome)
                try:
                    todos = await _fetch_all_pages(
                        "/v2/rh/Vinculos",
                        {"codigoEmpresa": empresa, "dataRef": data_ref},
                    )
                except Exception as exc:
                    logger.error("get_progressao_carreira (busca por nome) nome=%r: %s", nome, exc)
                    return {"erro": str(exc)}

                vinculos = [v for v in todos if _norm(str(v.get("nome") or "")) == nome_norm]
                if not vinculos:
                    vinculos = [v for v in todos if _score(str(v.get("nome") or "")) >= 0.70]
                if not vinculos:
                    return {"vinculo_ativo": None, "mensagem": f"Nenhum vínculo encontrado para o nome: {nome}"}
    else:
        return {"erro": "Informe numfunc ou nome"}

    if not vinculos:
        return {"numfunc": numfunc, "vinculo_ativo": None, "mensagem": "Nenhum vínculo encontrado para este servidor"}

    # Seleciona o vínculo ativo (sem vacância/aposentadoria no passado)
    ativo: dict | None = None
    for v in vinculos:
        vac = v.get("dataVacancia")
        if vac:
            try:
                if datetime.fromisoformat(str(vac)[:10]).date() <= hoje_date:
                    continue
            except (ValueError, TypeError):
                pass
        apos = v.get("dataAposentadoria")
        if apos:
            try:
                if datetime.fromisoformat(str(apos)[:10]).date() <= hoje_date:
                    continue
            except (ValueError, TypeError):
                pass
        ativo = v
        break

    if ativo is None:
        return {
            "numfunc": numfunc,
            "vinculo_ativo": None,
            "mensagem": "Servidor não possui vínculo ativo",
        }

    def _str_date(v: Any) -> str | None:
        raw = str(v or "")[:10]
        return raw if len(raw) == 10 else None

    return {
        # ── Identificação ────────────────────────────────────────────────────
        "numfunc":   numfunc,
        "nome":      ativo.get("nome") or "",
        "funcao":    ativo.get("funcao") or "",           # ex: "ANALISTA DO EXECUTIVO"
        "categoria": ativo.get("categoria") or "",        # ex: "QUADRO PERMANENTE"
        "situacao":  ativo.get("situacao") or "",         # ex: "ATIVO"
        # ── Vínculo ──────────────────────────────────────────────────────────
        "tipo_vinculo":         ativo.get("tipoVinculo") or "",        # ex: "REQUISITADO"
        "regime_juridico":      ativo.get("regimeJuridico") or "",     # ex: "ESTATUTARIO"
        "regime_previdenciario":ativo.get("regimePrevidenciario") or "",# ex: "PROPRIO-IPAJM/FP"
        "tipo_de_onus":         ativo.get("tipoDeOnus") or "",         # ex: "COM ONUS"
        # ── Lotação / Requisição ──────────────────────────────────────────────
        "orgao":                ativo.get("orgao") or "",              # ex: "SEGER"
        "tipo_de_orgao":        ativo.get("tipoDeOrgao") or "",        # ex: "DIRETA ES"
        "tipo_de_requis":       ativo.get("tipoDeRequis") or "",       # ex: "DISTRIBUICAO"
        "tipo_de_ressarcimento":ativo.get("tipoDeRessarcimento") or "",# ex: "SEM RESSARC"
        "categ_org_origem":     ativo.get("categOrgOrigem") or "",
        "empresa":              ativo.get("fantasiaEmpresa") or "",
        "secretaria":           ativo.get("fantasiaSecretaria") or "",
        # ── Datas ────────────────────────────────────────────────────────────
        "data_nomeacao":          _str_date(ativo.get("dataNomeacao")),
        "data_posse":             _str_date(ativo.get("dataPosse")),
        "data_exercicio":         _str_date(ativo.get("dataExercicio")),
        "data_exerc_org_origem":  _str_date(ativo.get("dataExercOrgOrigem")),
        "data_inicio_contrato":   _str_date(ativo.get("dataInicioContrato")),
        "data_termino_contrato":  _str_date(ativo.get("dataTerminoContrato")),
        "data_prorrogacao":       _str_date(ativo.get("dataProrrogacaoContrato")),
        "dt_concurso":            _str_date(ativo.get("dtConcurso")),
        # ── Extras ───────────────────────────────────────────────────────────
        "matricula_esocial":    ativo.get("matriculaESocialOrgOrigem") or "",
        "numero_vinculo":       ativo.get("vinculo"),
        "fone":                 ativo.get("fone") or "",
        # ── Compatibilidade legada ────────────────────────────────────────────
        "cargo":                ativo.get("funcao") or ativo.get("categoria") or "",
        "data_admissao":        _str_date(ativo.get("dataExercicio") or ativo.get("dataNomeacao")),
        "vinculo_raw":          ativo,
    }


async def get_resumo_geral(empresa: int = EMPRESA_IPAJM) -> dict:
    """
    Retorna o resumo de RH com estratégia stale-while-revalidate:
    - Cache fresco   → resposta imediata (<1 ms)
    - Cache expirado → retorna stale imediatamente + dispara refresh em background
    - Sem cache      → aguarda o primeiro fetch (cold start após restart)
    """
    global _resumo_cache, _resumo_cache_expires
    now = datetime.utcnow()

    # 1. Cache fresco — caminho mais rápido
    if _resumo_cache and _resumo_cache_expires and now < _resumo_cache_expires:
        return _resumo_cache

    # 2. Cache expirado (stale) — responde imediatamente, atualiza em background
    if _resumo_cache is not None:
        if not _get_resumo_lock().locked():
            asyncio.ensure_future(_fetch_resumo_from_api(empresa))
        logger.debug("get_resumo_geral: stale-while-revalidate — retornando cache expirado")
        return _resumo_cache

    # 3. Cold start — nenhum cache disponível, precisa aguardar
    logger.info("get_resumo_geral: cold start — aguardando SIARHES...")
    return await _fetch_resumo_from_api(empresa)
