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
        situacao = str(v.get("situacao") or "").upper()
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


async def get_frequencias_mes(empresa: int = EMPRESA_IPAJM, ano: int | None = None, mes: int | None = None) -> dict:
    """
    Busca frequências registradas para um mês específico.
    Se não informar ano/mês, usa o mês anterior (já que frequência é sempre do mês anterior).
    
    Retorna:
    - total_com_frequencia: quantidade de servidores com frequência registrada
    - servidores_com_frequencia: lista de numfunc com frequência
    - raw_error: erro se houver
    """
    hoje = datetime.utcnow().date()
    
    # Se não informar, usa mês anterior
    if ano is None or mes is None:
        if hoje.month == 1:
            mes = 12
            ano = hoje.year - 1
        else:
            mes = hoje.month - 1
            ano = hoje.year
    
    try:
        # Busca frequências do mês especificado
        frequencias = await _fetch_all_pages(
            "/v2/rh/Frequencias",
            {"codigoEmpresa": empresa, "anoRef": ano, "mesRef": mes},
        )
    except Exception as exc:
        logger.error("get_frequencias_mes: %s", exc)
        return {
            "total_com_frequencia": None,
            "servidores_com_frequencia": [],
            "raw_error": str(exc)
        }
    
    # Extrai numfunc únicos (alguns podem ter múltiplos registros)
    numfuncs_com_frequencia = set()
    for freq in frequencias:
        numfunc = freq.get("numfunc")
        if numfunc:
            numfuncs_com_frequencia.add(numfunc)
    
    return {
        "total_com_frequencia": len(numfuncs_com_frequencia),
        "servidores_com_frequencia": list(numfuncs_com_frequencia),
        "mes": mes,
        "ano": ano,
    }


async def get_frequencias_pendentes(empresa: int = EMPRESA_IPAJM) -> dict:
    """
    Calcula quantos servidores ATIVOS não fizeram frequência no mês anterior.
    
    Lógica:
    1. Busca total de servidores ativos
    2. Busca frequências do mês anterior
    3. Retorna: total_ativos - total_com_frequencia = frequencias_pendentes
    """
    import asyncio
    
    try:
        # Busca dados em paralelo
        vinculos_task = get_vinculos_resumo(empresa)
        frequencias_task = get_frequencias_mes(empresa)
        
        vinculos_result, frequencias_result = await asyncio.gather(
            vinculos_task, frequencias_task,
            return_exceptions=True,
        )
        
        def _safe(result, key, default=None):
            if isinstance(result, (Exception, type(None))):
                return default
            return result.get(key, default)
        
        total_ativos = _safe(vinculos_result, "total_ativos", 0) or 0
        total_com_frequencia = _safe(frequencias_result, "total_com_frequencia", 0) or 0
        servidores_com_frequencia = _safe(frequencias_result, "servidores_com_frequencia", [])
        
        frequencias_pendentes = max(0, total_ativos - total_com_frequencia)
        
        return {
            "frequencias_pendentes": frequencias_pendentes,
            "total_ativos": total_ativos,
            "total_com_frequencia": total_com_frequencia,
            "servidores_com_frequencia": servidores_com_frequencia,
            "mes_referencia": frequencias_result.get("mes") if not isinstance(frequencias_result, Exception) else None,
            "ano_referencia": frequencias_result.get("ano") if not isinstance(frequencias_result, Exception) else None,
        }
    except Exception as exc:
        logger.error("get_frequencias_pendentes: %s", exc)
        return {
            "frequencias_pendentes": None,
            "raw_error": str(exc),
        }


async def get_resumo_geral(empresa: int = EMPRESA_IPAJM) -> dict:
    """
    Agrega todos os indicadores de RH em uma única chamada de resumo.
    Usado pelo painel GerenciarRH. Resultado em cache por 5 minutos.
    """
    global _resumo_cache, _resumo_cache_expires
    import asyncio

    if _resumo_cache and _resumo_cache_expires and datetime.utcnow() < _resumo_cache_expires:
        logger.debug("get_resumo_geral: retornando cache")
        return _resumo_cache

    vinculos_task    = get_vinculos_resumo(empresa)
    afastados_task   = get_afastamentos_ativos(empresa)
    ferias_task      = get_ferias_previstas(empresa)

    vinculos, afastados, ferias = await asyncio.gather(
        vinculos_task, afastados_task, ferias_task,
        return_exceptions=True,
    )

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

    frequencias_task = get_frequencias_pendentes(empresa)
    frequencias = await frequencias_task

    result = {
        "total_colaboradores": _safe(vinculos,  "total_ativos"),
        "estagiarios":         _safe(vinculos,  "estagiarios"),
        "comissionados":       _safe(vinculos,  "comissionados"),
        "afastados":           _safe(afastados, "total_afastados"),
        "afastados_por_tipo":  _safe(afastados, "por_tipo", {}),
        "ferias_com_saldo":    _safe(ferias,    "com_saldo"),
        "ferias_a_vencer":     _safe(ferias,    "proximas_a_vencer"),
        "frequencias_pendentes": _safe(frequencias, "frequencias_pendentes"),
        "frequencias_detalhes": {
            "total_ativos": _safe(frequencias, "total_ativos"),
            "total_com_frequencia": _safe(frequencias, "total_com_frequencia"),
            "mes_referencia": _safe(frequencias, "mes_referencia"),
            "ano_referencia": _safe(frequencias, "ano_referencia"),
        },
        "errors": {
            "vinculos":  _err(vinculos),
            "afastados": _err(afastados),
            "ferias":    _err(ferias),
            "frequencias": _err(frequencias),
        },
    }

    # Só armazena em cache se não houve erros em vinculos (dados principais)
    if not _err(vinculos):
        _resumo_cache = result
        _resumo_cache_expires = datetime.utcnow() + RESUMO_CACHE_TTL
        logger.debug("get_resumo_geral: cache atualizado")

    return result
