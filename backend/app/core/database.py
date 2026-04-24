from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import DATABASE_URL

# Configurações específicas por tipo de banco
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # connect_timeout=5: falha rápido quando MySQL está offline (evita travar o threadpool)
    connect_args = {"connect_timeout": 5}

# Cria o engine, configura o pool de conexão conforme necessário
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=False,
    pool_recycle=3600,
    pool_timeout=5,        # não espera mais de 5s por uma conexão do pool
)

# SessionLocal servirá como fábrica de sessão de banco de dados
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Classe base para modelos declarativos
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
