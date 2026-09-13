from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
import httpx

from app.config import settings
from app.auth.permisos import tiene_permiso


_jwks_cache = None


def _obtener_jwks():
    """Descarga las claves públicas de Supabase (para ES256/RS256)."""
    global _jwks_cache
    if _jwks_cache is None:
        url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        try:
            r = httpx.get(url, timeout=5)
            r.raise_for_status()
            _jwks_cache = r.json()
        except Exception as e:
            print(f"Error obteniendo JWKS: {e}")
            _jwks_cache = {"keys": []}
    return _jwks_cache


async def get_usuario_actual(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token inválido")

    token = authorization.replace("Bearer ", "")

    # Intento 1: JWKS (ES256/RS256 — proyectos nuevos 2025+)
    try:
        jwks = _obtener_jwks()
        if jwks.get("keys"):
            payload = jwt.decode(
                token,
                jwks,
                algorithms=["ES256", "RS256"],
                audience="authenticated",
            )
            return payload
    except Exception as e:
        print(f"JWKS decode falló: {e}")

    # Intento 2: HS256 clásico (JWT Secret)
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except JWTError as e:
        print(f"HS256 decode falló: {e}")
        raise HTTPException(401, "Token inválido o expirado")


def requiere_permiso(permiso: str):
    def verificador(usuario: dict = Depends(get_usuario_actual)):
        rol = usuario.get("user_role")
        if not tiene_permiso(rol, permiso):
            raise HTTPException(403, f"Sin permiso: {permiso}")
        return usuario
    return verificador