from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Dict
import urllib.request
import json
import logging

from app.core.database import get_db
from app.models.banco_horas_models import DiaTrabalhado
from app.models.banco_horas_schemas import (
    DiaTrabalhadoCreate,
    DiaTrabalhadoUpdate,
    DiaTrabalhadoResponse,
    ExtratoBancoHorasResponse,
    GerencialDashboardResponse,
    GerencialResumoResponse,
    GerencialHorasMesResponse,
    GerencialSaldoSetorResponse,
    GerencialTopServidorResponse,
    minutes_to_hhmm,
)
from app.models.db_models import User
from app.utils.time_calc import calcular_horas, calcular_prazo_maximo, hhmm_to_minutes

logger = logging.getLogger(__name__)

SRH_BASE_URL = "https://srh.pythonanywhere.com"


def _hhmm_to_min(value) -> int:
    """Converte 'HH:MM' ou valores null para minutos inteiros."""
    if not value or not isinstance(value, str) or ":" not in value:
        return 0
    try:
        parts = value.strip().split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except (ValueError, IndexError):
        return 0


def _fetch_srh_records() -> list:
    """Busca e normaliza todos os registros do sistema SRH (PythonAnywhere)."""
    try:
        url = f"{SRH_BASE_URL}/api/dias-trabalhados"
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        logger.warning("Falha ao buscar registros do SRH externo: %s", exc)
        return []

    result = []
    for r in data:
        try:
            dia = date.fromisoformat(r["dia_trabalhado"])
        except (ValueError, TypeError, KeyError):
            continue

        result.append({
            "key": str(r.get("nf") or r.get("id", "")),
            "nome": (r.get("nome") or "").strip(),
            "setor": (r.get("setor") or "SEM SETOR").strip() or "SEM SETOR",
            "dia_trabalhado": dia,
            "h_trab_minutos": _hhmm_to_min(r.get("h_trabalhada")),
            "h_direito_minutos": _hhmm_to_min(r.get("h_direito")),
            "h_descontadas_minutos": _hhmm_to_min(r.get("horas_descontadas")),
        })

    return result

router = APIRouter()


_STOP_WORDS = {"DE", "DA", "DO", "DOS", "DAS", "E", "A", "O"}


def _normalize_nome(text: str) -> str:
    """Remove acentos, converte para maiúsculas e elimina espaços extras."""
    import unicodedata
    return (
        unicodedata.normalize("NFD", text)
        .encode("ascii", "ignore")
        .decode()
        .upper()
        .strip()
    )


def _nome_tokens(text: str) -> set[str]:
    """Retorna tokens significativos do nome (sem preposições)."""
    return {t for t in _normalize_nome(text).split() if t not in _STOP_WORDS}


def _nome_score(srh_nome: str, input_nome: str) -> float:
    """
    Calcula similaridade por sobreposição de tokens.
    Retorna fração dos tokens do input que também aparecem no nome SRH.
    """
    srh_tokens = _nome_tokens(srh_nome)
    input_tokens = _nome_tokens(input_nome)
    if not input_tokens:
        return 0.0
    return len(srh_tokens & input_tokens) / len(input_tokens)


@router.get("/srh/extrato")
def srh_extrato_por_nome(nome: str = Query(...)):
    """
    Proxy para o sistema SRH externo com filtro de nome robusto.
    Tenta match exato primeiro; se não encontrar, usa sobreposição de tokens
    (≥ 70 % dos tokens do nome do usuário devem constar no nome SRH).
    Isso tolera pequenas variações ortográficas (ex: Correia ↔ Correa).
    """
    if not nome.strip():
        raise HTTPException(status_code=400, detail="Parâmetro nome é obrigatório")

    try:
        url = f"{SRH_BASE_URL}/api/dias-trabalhados"
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            todos = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        logger.warning("srh_extrato_por_nome: falha SRH externo: %s", exc)
        raise HTTPException(status_code=502, detail="Não foi possível contactar o sistema SRH externo")

    if isinstance(todos, dict):
        todos = todos.get("registros") or todos.get("dias_trabalhados") or []
    if not isinstance(todos, list):
        todos = []

    nome_norm = _normalize_nome(nome)

    # 1) Match exato (normalizado)
    registros = [r for r in todos if _normalize_nome(str(r.get("nome") or "")) == nome_norm]

    match_type = "exato"

    # 2) Fallback por sobreposição de tokens (≥ 70 %)
    if not registros:
        THRESHOLD = 0.70
        registros = [r for r in todos if _nome_score(str(r.get("nome") or ""), nome) >= THRESHOLD]
        match_type = "aproximado"

    logger.info(
        "srh_extrato_por_nome: nome=%r match=%s → %d/%d registros",
        nome, match_type, len(registros), len(todos),
    )
    return registros


@router.post("/dias-trabalhados", response_model=DiaTrabalhadoResponse, status_code=status.HTTP_201_CREATED)
def criar_dia_trabalhado(dia: DiaTrabalhadoCreate, db: Session = Depends(get_db)):
    # Calcular horas
    horas = calcular_horas(dia.entrada, dia.saida)
    
    # Calcular prazo máximo
    prazo = calcular_prazo_maximo(dia.dia_trabalhado)

    novo_registro = DiaTrabalhado(
        username=dia.username,
        dia_trabalhado=dia.dia_trabalhado,
        entrada=dia.entrada,
        saida=dia.saida,
        h_trab_minutos=horas["trabalhadas"],
        h_direito_minutos=horas["direito"],
        prazo_max=prazo,
        observacao=dia.observacao
    )
    
    db.add(novo_registro)
    db.commit()
    db.refresh(novo_registro)
    
    # Construir response
    return {
        **novo_registro.__dict__,
        "h_trab_hhmm": minutes_to_hhmm(novo_registro.h_trab_minutos),
        "h_direito_hhmm": minutes_to_hhmm(novo_registro.h_direito_minutos),
        "h_descontadas_hhmm": minutes_to_hhmm(novo_registro.h_descontadas_minutos),
        "saldo_hhmm": minutes_to_hhmm(novo_registro.h_direito_minutos - novo_registro.h_descontadas_minutos)
    }

@router.put("/dias-trabalhados/{id}", response_model=DiaTrabalhadoResponse)
def atualizar_dia_trabalhado(id: int, dia_update: DiaTrabalhadoUpdate, db: Session = Depends(get_db)):
    registro = db.query(DiaTrabalhado).filter(DiaTrabalhado.id == id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    
    if dia_update.h_descontadas_hhmm is not None:
        minutos_desconto = hhmm_to_minutes(dia_update.h_descontadas_hhmm)
        registro.h_descontadas_minutos = minutos_desconto
        
    if dia_update.observacao is not None:
        registro.observacao = dia_update.observacao
        
    db.commit()
    db.refresh(registro)
    
    return {
        **registro.__dict__,
        "h_trab_hhmm": minutes_to_hhmm(registro.h_trab_minutos),
        "h_direito_hhmm": minutes_to_hhmm(registro.h_direito_minutos),
        "h_descontadas_hhmm": minutes_to_hhmm(registro.h_descontadas_minutos),
        "saldo_hhmm": minutes_to_hhmm(registro.h_direito_minutos - registro.h_descontadas_minutos)
    }

@router.get("/consulta/{username}", response_model=ExtratoBancoHorasResponse)
def consultar_extrato(username: str, db: Session = Depends(get_db)):
    registros = db.query(DiaTrabalhado).filter(DiaTrabalhado.username == username).order_by(DiaTrabalhado.dia_trabalhado.desc()).all()
    
    total_direito = sum(r.h_direito_minutos for r in registros)
    total_descontadas = sum(r.h_descontadas_minutos for r in registros)
    saldo_total = total_direito - total_descontadas
    
    registros_response = []
    for r in registros:
        registros_response.append({
            **r.__dict__,
            "h_trab_hhmm": minutes_to_hhmm(r.h_trab_minutos),
            "h_direito_hhmm": minutes_to_hhmm(r.h_direito_minutos),
            "h_descontadas_hhmm": minutes_to_hhmm(r.h_descontadas_minutos),
            "saldo_hhmm": minutes_to_hhmm(r.h_direito_minutos - r.h_descontadas_minutos)
        })
        
    return {
        "username": username,
        "total_direito_hhmm": minutes_to_hhmm(total_direito),
        "total_descontadas_hhmm": minutes_to_hhmm(total_descontadas),
        "saldo_total_hhmm": minutes_to_hhmm(saldo_total),
        "registros": registros_response
    }


@router.get("/servidores")
def listar_servidores(q: str | None = Query(default=None), db: Session = Depends(get_db)):
    """Retorna lista de servidores do portal para autocomplete no modal de registro."""
    query = db.query(User.username, User.sector)
    if q and q.strip():
        query = query.filter(User.username.ilike(f"%{q.strip()}%"))
    users = query.order_by(User.username).limit(30).all()
    return [{"username": u.username, "setor": u.sector or "SEM SETOR"} for u in users]


@router.get("/gerencial/dashboard", response_model=GerencialDashboardResponse)
def dashboard_gerencial(
    db: Session = Depends(get_db),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    setor: str | None = Query(default=None),
    username: str | None = Query(default=None),
):
    # ── 1. Registros locais (portal MySQL) ────────────────────────────────────
    query = db.query(DiaTrabalhado)
    if date_from:
        query = query.filter(DiaTrabalhado.dia_trabalhado >= date_from)
    if date_to:
        query = query.filter(DiaTrabalhado.dia_trabalhado <= date_to)
    if username and username.lower() != "todos":
        query = query.filter(DiaTrabalhado.username == username)

    local_registros = query.all()

    local_usernames = sorted({r.username for r in local_registros})
    user_sector_map: Dict[str, str] = {}
    if local_usernames:
        users = db.query(User.username, User.sector).filter(User.username.in_(local_usernames)).all()
        user_sector_map = {u.username: (u.sector or "SEM SETOR") for u in users}

    all_records = [
        {
            "key": r.username,
            "nome": r.username,
            "setor": user_sector_map.get(r.username, "SEM SETOR"),
            "dia_trabalhado": r.dia_trabalhado,
            "h_trab_minutos": r.h_trab_minutos,
            "h_direito_minutos": r.h_direito_minutos,
            "h_descontadas_minutos": r.h_descontadas_minutos,
        }
        for r in local_registros
    ]

    # ── 2. Registros externos SRH (PythonAnywhere) ───────────────────────────
    srh_records = _fetch_srh_records()

    if date_from:
        srh_records = [r for r in srh_records if r["dia_trabalhado"] >= date_from]
    if date_to:
        srh_records = [r for r in srh_records if r["dia_trabalhado"] <= date_to]
    if username and username.lower() != "todos":
        srh_records = [r for r in srh_records if r["key"] == username]

    all_records.extend(srh_records)

    # ── 3. Filtro de setor (sobre registros unificados) ───────────────────────
    if setor and setor.lower() != "todos":
        all_records = [r for r in all_records if r["setor"] == setor]

    # ── 4. Agregações ─────────────────────────────────────────────────────────
    total_trabalhadas = sum(r["h_trab_minutos"] for r in all_records)
    total_direito = sum(r["h_direito_minutos"] for r in all_records)
    total_descontadas = sum(r["h_descontadas_minutos"] for r in all_records)
    saldo_total = total_direito - total_descontadas
    total_servidores = len({r["key"] for r in all_records})

    resumo = GerencialResumoResponse(
        total_servidores=total_servidores,
        registros_horas=len(all_records),
        horas_trabalhadas_hhmm=minutes_to_hhmm(total_trabalhadas),
        horas_direito_hhmm=minutes_to_hhmm(total_direito),
        horas_gozadas_hhmm=minutes_to_hhmm(total_descontadas),
        saldo_total_hhmm=minutes_to_hhmm(saldo_total),
    )

    monthly: Dict[str, Dict[str, int]] = {}
    for r in all_records:
        month_key = r["dia_trabalhado"].strftime("%Y-%m")
        if month_key not in monthly:
            monthly[month_key] = {"trabalhadas": 0, "direito": 0, "descontadas": 0}
        monthly[month_key]["trabalhadas"] += r["h_trab_minutos"]
        monthly[month_key]["direito"] += r["h_direito_minutos"]
        monthly[month_key]["descontadas"] += r["h_descontadas_minutos"]

    horas_por_mes = [
        GerencialHorasMesResponse(
            month=month,
            liquidadas=round(values["trabalhadas"] / 60, 2),
            direito=round(values["direito"] / 60, 2),
            perdidas=round(values["descontadas"] / 60, 2),
        )
        for month, values in sorted(monthly.items())
    ]

    setor_saldo_map_agg: Dict[str, int] = {}
    for r in all_records:
        setor_nome = r["setor"]
        setor_saldo_map_agg[setor_nome] = setor_saldo_map_agg.get(setor_nome, 0) + (
            r["h_direito_minutos"] - r["h_descontadas_minutos"]
        )

    saldo_por_setor = [
        GerencialSaldoSetorResponse(
            setor=setor_nome,
            saldo=round(saldo_min / 60, 2),
        )
        for setor_nome, saldo_min in sorted(
            setor_saldo_map_agg.items(), key=lambda item: item[1], reverse=True
        )
    ]

    servidor_saldo_map: Dict[str, dict] = {}
    for r in all_records:
        key = r["key"]
        if key not in servidor_saldo_map:
            servidor_saldo_map[key] = {"nome": r["nome"], "setor": r["setor"], "saldo": 0}
        servidor_saldo_map[key]["saldo"] += r["h_direito_minutos"] - r["h_descontadas_minutos"]

    top_servidores = [
        GerencialTopServidorResponse(
            id=key,
            nome=info["nome"],
            setor=info["setor"],
            saldo_hhmm=minutes_to_hhmm(info["saldo"]),
        )
        for key, info in sorted(
            servidor_saldo_map.items(), key=lambda item: item[1]["saldo"], reverse=True
        )[:10]
    ]

    return GerencialDashboardResponse(
        summary=resumo,
        horas_por_mes=horas_por_mes,
        saldo_por_setor=saldo_por_setor,
        top_servidores=top_servidores,
    )
