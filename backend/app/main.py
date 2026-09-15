from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, boletas, reportes, admin
from app.middleware.rate_limit import RateLimitMiddleware

app = FastAPI(title="Sistema de Ventas", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting: por prefijo de ruta
app.add_middleware(
    RateLimitMiddleware,
    limites_por_ruta={
        # (max_request, ventana_segundos)
        "/api/auth/": (30, 60),          # 30 req/min en endpoints de auth
        "/api/boletas/subir": (10, 60),  # 10 uploads/min máximo
        "/api/": (300, 60),              # 300 req/min en general por IP
    },
)

app.include_router(auth.router, prefix="/api")
app.include_router(boletas.router, prefix="/api")
app.include_router(reportes.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}