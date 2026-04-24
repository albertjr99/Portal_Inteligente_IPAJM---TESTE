import os
import sys

# Caminho atualizado para importar o aplicativo corretamente.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.db_models import Event
import json

db = SessionLocal()

holidays_2026 = [
    {"data": "2026-01-01", "nome": "Confraternização Universal"},
    {"data": "2026-02-16", "nome": "Carnaval (Ponto Facultativo)"},
    {"data": "2026-02-17", "nome": "Carnaval"},
    {"data": "2026-02-18", "nome": "Quarta-feira de Cinzas"},
    {"data": "2026-04-03", "nome": "Paixão de Cristo"},
    {"data": "2026-04-13", "nome": "Nossa Senhora da Penha (Feriado Estadual ES)"},
    {"data": "2026-04-21", "nome": "Tiradentes"},
    {"data": "2026-05-01", "nome": "Dia do Trabalho"},
    {"data": "2026-05-23", "nome": "Colonização do Solo Espírito-Santense"},
    {"data": "2026-06-04", "nome": "Corpus Christi (Ponto Facultativo)"},
    {"data": "2026-09-07", "nome": "Independência do Brasil"},
    {"data": "2026-10-12", "nome": "Nossa Sra. Aparecida"},
    {"data": "2026-10-28", "nome": "Dia do Servidor Público"},
    {"data": "2026-11-02", "nome": "Finados"},
    {"data": "2026-11-15", "nome": "Proclamação da República"},
    {"data": "2026-12-25", "nome": "Natal"}
]

for h in holidays_2026:
    if not db.query(Event).filter(Event.title == h["nome"]).first():
        e = Event(
            title=h["nome"],
            date=h["data"],
            time="",
            description="Feriado ou Ponto Facultativo oficializado no Diário Oficial (DIO-ES).",
            type="Feriado",
            sectors=json.dumps([]) 
        )
        db.add(e)

db.commit()
db.close()
print("Feriados adicionados com sucesso.")
