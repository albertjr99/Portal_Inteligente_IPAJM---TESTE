import asyncio
import logging
from contextlib import asynccontextmanager

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

logger = logging.getLogger(__name__)

# Cria as tabelas no banco de dados (opcional — continua sem MySQL)
try:
    Base.metadata.create_all(bind=engine)
    init_db()
except Exception:
    pass

# ─── Refresh periódico do cache SIARHES ──────────────────────────────────────
# Roda em background: aquece o cache logo ao iniciar e o mantém sempre fresco,
# renovando a cada 4 min (o TTL do cache é 5 min, então nunca expira para o usuário).

async def _siarhes_refresh_loop() -> None:
    from app.services import siarhes_service as svc
    while True:
        try:
            await svc._fetch_resumo_from_api()
            logger.info("SIARHES cache aquecido/atualizado em background")
        except Exception as exc:
            logger.warning("SIARHES background refresh falhou: %s", exc)
        await asyncio.sleep(4 * 60)  # aguarda 4 minutos antes do próximo refresh


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicia o loop de refresh em background ao subir o servidor
    task = asyncio.create_task(_siarhes_refresh_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(lifespan=lifespan)

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
