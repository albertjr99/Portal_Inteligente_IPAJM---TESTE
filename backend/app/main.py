from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth import router as auth_router
from app.routers.admin import router as admin_router
from app.routers.content import router as content_router
from app.routers.banco_horas import router as banco_horas_router
from app.routers.siarhes import router as siarhes_router
from app.core.database import engine, Base
from app.core.init_db import init_db
# import app.models.db_models
# import app.models.annual_leave

# Cria as tabelas no banco de dados (opcional — continua sem MySQL)
try:
    Base.metadata.create_all(bind=engine)
    init_db()
except Exception:
    pass

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(content_router, prefix="/api")
app.include_router(banco_horas_router, prefix="/api/banco-horas", tags=["Banco de Horas"])
app.include_router(siarhes_router, prefix="/api", tags=["SIARHES RH"])

@app.get("/")
def root():
    return {"message": "API funcionando corretamente!"}