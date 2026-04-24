from sqlalchemy import Column, Integer, String, Date, Time, DateTime
from datetime import datetime
from app.core.database import Base

class DiaTrabalhado(Base):
    __tablename__ = "dias_trabalhados"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), index=True, nullable=False) # Vinculo com o Active Directory
    
    # Datas e Horários do turno
    dia_trabalhado = Column(Date, nullable=False)
    entrada = Column(Time, nullable=False)
    saida = Column(Time, nullable=False)
    
    # Cálculos salvos em minutos no banco
    h_trab_minutos = Column(Integer, nullable=False)
    h_direito_minutos = Column(Integer, nullable=False)
    h_descontadas_minutos = Column(Integer, default=0, nullable=False)
    
    # Prazo de expiração (6 meses após dia_trabalhado)
    prazo_max = Column(Date, nullable=False)
    
    # Opcional
    observacao = Column(String(500), nullable=True)
    
    # Auditoria
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
