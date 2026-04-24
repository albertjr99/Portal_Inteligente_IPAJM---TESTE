from pydantic import BaseModel, field_validator, model_serializer, model_validator
from datetime import date, time, datetime
from typing import Optional, List

def minutes_to_hhmm(minutes: int) -> str:
    """Converte minutos inteiros para formato HH:MM"""
    if minutes is None:
        return "00:00"
    sign = "-" if minutes < 0 else ""
    abs_mins = abs(minutes)
    h = abs_mins // 60
    m = abs_mins % 60
    return f"{sign}{h:02d}:{m:02d}"

class DiaTrabalhadoBase(BaseModel):
    username: str
    dia_trabalhado: date
    entrada: time
    saida: time
    observacao: Optional[str] = None

class DiaTrabalhadoCreate(DiaTrabalhadoBase):
    pass

class DiaTrabalhadoUpdate(BaseModel):
    # Atualiza apenas descontos (quando o servidor tira folga) ou observações
    h_descontadas_hhmm: Optional[str] = None
    observacao: Optional[str] = None

class DiaTrabalhadoResponse(DiaTrabalhadoBase):
    id: int
    h_trab_hhmm: str
    h_direito_hhmm: str
    h_descontadas_hhmm: str
    saldo_hhmm: str
    prazo_max: date
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True

    @model_validator(mode='before')
    @classmethod
    def convert_minutos_to_hhmm(cls, data):
        # se data for uma instância do SQLAlchemy
        if hasattr(data, 'h_trab_minutos'):
            direito = getattr(data, 'h_direito_minutos', 0)
            descontadas = getattr(data, 'h_descontadas_minutos', 0)
            saldo = direito - descontadas
            
            # extrai os campos padrão
            res = {
                'id': data.id,
                'username': data.username,
                'dia_trabalhado': data.dia_trabalhado,
                'entrada': data.entrada,
                'saida': data.saida,
                'observacao': data.observacao,
                'prazo_max': data.prazo_max,
                'criado_em': data.criado_em,
                'atualizado_em': data.atualizado_em,
                'h_trab_hhmm': minutes_to_hhmm(getattr(data, 'h_trab_minutos', 0)),
                'h_direito_hhmm': minutes_to_hhmm(direito),
                'h_descontadas_hhmm': minutes_to_hhmm(descontadas),
                'saldo_hhmm': minutes_to_hhmm(saldo),
            }
            return res
        return data
class ExtratoBancoHorasResponse(BaseModel):
    username: str
    total_direito_hhmm: str
    total_descontadas_hhmm: str
    saldo_total_hhmm: str
    registros: List[DiaTrabalhadoResponse]


class GerencialResumoResponse(BaseModel):
    total_servidores: int
    registros_horas: int
    horas_trabalhadas_hhmm: str
    horas_direito_hhmm: str
    horas_gozadas_hhmm: str
    saldo_total_hhmm: str


class GerencialHorasMesResponse(BaseModel):
    month: str
    trabalhadas: float
    direito: float
    descontadas: float


class GerencialSaldoSetorResponse(BaseModel):
    setor: str
    saldo: float


class GerencialTopServidorResponse(BaseModel):
    id: str
    nome: str
    setor: str
    saldo_hhmm: str


class GerencialDashboardResponse(BaseModel):
    summary: GerencialResumoResponse
    horas_por_mes: List[GerencialHorasMesResponse]
    saldo_por_setor: List[GerencialSaldoSetorResponse]
    top_servidores: List[GerencialTopServidorResponse]
