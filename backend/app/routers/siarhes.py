"""
Router SIARHES — expõe endpoints de RH para o frontend do portal IPAJM.
Todos os calls externos para a API SIARHES são feitos aqui no backend
(as credenciais OAuth2 nunca chegam ao browser).
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Any

from app.services import siarhes_service as svc

router = APIRouter(prefix="/siarhes", tags=["SIARHES RH"])


# ─── Painel resumo geral ──────────────────────────────────────────────────────

@router.get("/resumo", summary="Resumo dos indicadores de RH do IPAJM")
async def resumo_geral(empresa: int = Query(svc.EMPRESA_IPAJM, description="Código da empresa no SIARHES")) -> dict[str, Any]:
    """
    Retorna os indicadores consolidados para o painel Gerenciar RH:
    - Total de colaboradores ativos
    - Estagiários
    - Comissionados / DT
    - Afastados (licenças ativas)
    - Férias com saldo / prestes a vencer
    """
    try:
        return await svc.get_resumo_geral(empresa)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Erro ao consultar SIARHES: {exc}")


# ─── Vínculos ─────────────────────────────────────────────────────────────────

@router.get("/vinculos", summary="Resumo de vínculos empregatícios")
async def vinculos(empresa: int = Query(svc.EMPRESA_IPAJM)) -> dict[str, Any]:
    try:
        return await svc.get_vinculos_resumo(empresa)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/vinculos/servidor", summary="Vínculos de um servidor específico")
async def vinculos_servidor(
    numfunc: int = Query(..., description="Número funcional do servidor"),
    empresa: int = Query(svc.EMPRESA_IPAJM),
) -> Any:
    try:
        return await svc.get_vinculos_servidor(numfunc, empresa)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


# ─── Afastamentos ─────────────────────────────────────────────────────────────

@router.get("/afastamentos", summary="Afastamentos/licenças ativas")
async def afastamentos(empresa: int = Query(svc.EMPRESA_IPAJM)) -> dict[str, Any]:
    try:
        return await svc.get_afastamentos_ativos(empresa)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/afastamentos/servidor", summary="Licenças de um servidor")
async def licencas_servidor(numfunc: int = Query(...)) -> Any:
    try:
        return await svc.get_licencas_servidor(numfunc)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


# ─── Férias ───────────────────────────────────────────────────────────────────

@router.get("/ferias", summary="Períodos aquisitivos de férias — resumo")
async def ferias(empresa: int = Query(svc.EMPRESA_IPAJM)) -> dict[str, Any]:
    try:
        return await svc.get_ferias_previstas(empresa)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/ferias/servidor", summary="Férias de um servidor")
async def ferias_servidor(
    numfunc: int = Query(...),
    empresa: int = Query(svc.EMPRESA_IPAJM),
) -> Any:
    try:
        return await svc.get_ferias_servidor(numfunc, empresa)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


# ─── Dados pessoais ───────────────────────────────────────────────────────────

@router.get("/servidor", summary="Dados pessoais de um servidor")
async def dados_pessoais(
    numfunc: int = Query(...),
    empresa: int = Query(svc.EMPRESA_IPAJM),
) -> Any:
    try:
        return await svc.get_dados_pessoais(numfunc, empresa)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


# ─── Ficha financeira ─────────────────────────────────────────────────────────

@router.get("/contracheque", summary="Contracheque de um servidor")
async def contracheque(
    numfunc: int = Query(...),
    ano: int = Query(...),
    mes: int = Query(..., ge=1, le=12),
) -> Any:
    try:
        return await svc.get_ficha_financeira(numfunc, ano, mes)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/carreira/progressao", summary="Progressão de carreira do servidor")
async def progressao_carreira(
    numfunc: int | None = Query(default=None, description="Número funcional do servidor (opcional se informar nome)"),
    nome: str | None = Query(default=None, description="Nome completo do servidor (usado quando numfunc não está disponível)"),
    empresa: int = Query(svc.EMPRESA_IPAJM),
) -> dict[str, Any]:
    """
    Retorna a progressão de carreira do servidor via SIARHES.
    Aceita numfunc ou nome (fullName do AD) para localizar o vínculo.
    """
    if numfunc is None and not nome:
        raise HTTPException(status_code=422, detail="Informe numfunc ou nome")
    try:
        return await svc.get_progressao_carreira(numfunc=numfunc, nome=nome, empresa=empresa)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Erro ao consultar progressão: {exc}")


@router.get("/carreira/capacitacoes", summary="Histórico de capacitações/cursos do servidor")
async def capacitacoes_servidor(
    numfunc: int | None = Query(default=None, description="Número funcional do servidor"),
    nome: str | None = Query(default=None, description="Nome completo (usado quando numfunc não está disponível)"),
    empresa: int = Query(svc.EMPRESA_IPAJM),
) -> list[dict[str, Any]]:
    """
    Retorna todos os cursos e capacitações registrados no SIARHES para o servidor.
    Aceita numfunc OU nome. Ordenados por data de início decrescente.
    """
    if numfunc is None and not nome:
        raise HTTPException(status_code=422, detail="Informe numfunc ou nome")
    try:
        return await svc.get_capacitacoes_servidor(numfunc=numfunc, nome=nome, empresa=empresa)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Erro ao consultar capacitações: {exc}")


# --- Frequencias ---

@router.get("/frequencias/pendentes", summary="Servidores sem frequencia no mes anterior")
async def frequencias_pendentes(empresa: int = Query(svc.EMPRESA_IPAJM)) -> dict[str, Any]:
    """
    Retorna a quantidade de servidores que nao fizeram frequencia no mes anterior.
    Logica: total_ativos - total_com_frequencia_mes_anterior
    """
    try:
        return await svc.get_frequencias_pendentes(empresa)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/frequencias/por-mes", summary="Analise de frequencias para um mes/ano especifico")
async def frequencias_por_mes(
    ano: int = Query(..., ge=2000, le=2100, description="Ano de referência"),
    mes: int = Query(..., ge=1, le=12, description="Mês de referência (1-12)"),
    empresa: int = Query(svc.EMPRESA_IPAJM),
) -> dict[str, Any]:
    """
    Retorna pendentes, com_frequencia e lista de servidores sem frequência
    para o mês/ano indicado. Não utiliza o cache do resumo geral — consulta
    os vínculos e frequências diretamente (pode ser lento na primeira chamada).
    """
    try:
        from datetime import datetime
        from app.services.siarhes_service import BRT, _fetch_all_pages, _fetch_frequencias_mes

        hoje = datetime.now(BRT)
        data_ref = hoje.strftime("%Y-%m-%dT00:00:00")
        hoje_date = hoje.date()

        vinculos_raw = await _fetch_all_pages(
            "/v2/rh/Vinculos",
            {"codigoEmpresa": empresa, "dataRef": data_ref},
        )

        # Filtra vínculos ativos
        ativos = []
        for v in vinculos_raw:
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

        nome_map = {str(v.get("numfunc")): v.get("nome") or "" for v in ativos if v.get("numfunc")}
        ativos_set = {str(v.get("numfunc") or "") for v in ativos if v.get("numfunc")}

        all_freq = await _fetch_frequencias_mes(empresa, 1, ano, mes)
        com_freq_set = {str(f.get("numfunc") or "").strip() for f in all_freq if f.get("numfunc")}

        pendentes_set = ativos_set - com_freq_set
        pendentes_lista = sorted(
            [
                {"numfunc": int(nf) if nf.isdigit() else nf, "nome": nome_map.get(nf) or "Nome não disponível"}
                for nf in pendentes_set
            ],
            key=lambda x: str(x.get("nome") or ""),
        )

        return {
            "total_ativos":         len(ativos),
            "total_com_frequencia": len(com_freq_set),
            "frequencias_pendentes": len(pendentes_set),
            "mes_referencia":       mes,
            "ano_referencia":       ano,
            "pendentes_lista":      pendentes_lista,
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Erro ao consultar SIARHES: {exc}")
