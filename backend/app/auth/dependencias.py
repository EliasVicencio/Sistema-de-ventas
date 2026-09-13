from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError

from app.config import settings
from app.auth.permisos import tiene_permiso


async def get_usuario_actual(authorization: str = Header(...)):
    """Valida el JWT de Supabase y devuelve el payload."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token inválido")

    token = authorization.replace("Bearer ", "")

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except JWTError:
        raise HTTPException(401, "Token inválido o expirado")


def requiere_permiso(permiso: str):
    """Dependencia factory que verifica permisos RBAC."""

    def verificador(usuario: dict = Depends(get_usuario_actual)):
        rol = usuario.get("user_role")
        if not tiene_permiso(rol, permiso):
            raise HTTPException(403, f"Sin permiso: {permiso}")
        return usuario

    return verificador