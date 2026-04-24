from datetime import datetime, timedelta, date, time
from dateutil.relativedelta import relativedelta

def hhmm_to_minutes(hhmm_str: str) -> int:
    """Converte string 'HH:MM' para minutos totais."""
    if not hhmm_str or hhmm_str == '-' or ':' not in hhmm_str:
        return 0
    try:
        h, m = map(int, hhmm_str.split(':'))
        return h * 60 + m
    except ValueError:
        return 0

def calcular_horas(entrada: time, saida: time) -> dict:
    """
    Calcula as horas trabalhadas e de direito (em minutos).
    Trata corretamente viradas de turno (ex: entrada 22:00, saida 02:00 -> 4h trab).
    """
    dt_entrada = datetime.combine(datetime.today(), entrada)
    dt_saida = datetime.combine(datetime.today(), saida)

    if dt_saida < dt_entrada:
        # Virada de turno: a saída é no dia seguinte
        dt_saida += timedelta(days=1)

    diff: timedelta = dt_saida - dt_entrada
    minutos = int(diff.total_seconds() // 60)

    return {
        "trabalhadas": minutos,
        "direito": minutos * 2
    }

def calcular_prazo_maximo(dia_trabalhado: date) -> date:
    """Retorna o dia exato 6 meses após a data trabalhada."""
    return dia_trabalhado + relativedelta(months=6)

def minutes_to_hhmm(minutes: int) -> str:
    """Converte minutos totais para string 'HH:MM' (inclui sinal negativo se necessário)."""
    if minutes is None:
        return '00:00'
    sign = "-" if minutes < 0 else ""
    m = abs(minutes)
    h = m // 60
    mm = m % 60
    return f"{sign}{h:02d}:{mm:02d}"
