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
