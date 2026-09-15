import time
from collections import defaultdict
from threading import Lock
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting por IP en memoria. Para producción real usar Redis.
    """

    def __init__(self, app, limites_por_ruta: dict, ventana_segundos: int = 60):
        super().__init__(app)
        # {ruta_prefix: (max_requests, ventana_segundos)}
        self.limites = limites_por_ruta
        self.ventana_default = ventana_segundos
        # {ip: {ruta: [timestamps]}}
        self.registros = defaultdict(lambda: defaultdict(list))
        self.lock = Lock()

    def _obtener_ip(self, request: Request) -> str:
        # Vercel/Cloudflare/proxy mandan la IP real en estos headers
        for header in ("x-forwarded-for", "x-real-ip"):
            valor = request.headers.get(header)
            if valor:
                return valor.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _limite_para_ruta(self, ruta: str) -> tuple[int, int] | None:
        # Buscar el prefijo de ruta más específico que coincida
        mejor_match = None
        mejor_largo = 0
        for prefijo, limite in self.limites.items():
            if ruta.startswith(prefijo) and len(prefijo) > mejor_largo:
                mejor_match = limite
                mejor_largo = len(prefijo)
        return mejor_match

    async def dispatch(self, request: Request, call_next):
        ruta = request.url.path
        limite = self._limite_para_ruta(ruta)

        if limite:
            max_req, ventana = limite
            ip = self._obtener_ip(request)
            ahora = time.time()

            with self.lock:
                timestamps = self.registros[ip][ruta]
                # Limpiar timestamps fuera de la ventana
                timestamps[:] = [t for t in timestamps if ahora - t < ventana]

                if len(timestamps) >= max_req:
                    raise HTTPException(
                        status_code=429,
                        detail=f"Demasiadas peticiones. Intenta de nuevo en unos segundos.",
                    )

                timestamps.append(ahora)

        return await call_next(request)