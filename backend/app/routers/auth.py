from fastapi import APIRouter, Depends

from app.auth.dependencias import get_usuario_actual
from app.auth.permisos import PERMISOS_POR_ROL

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
def me(usuario: dict = Depends(get_usuario_actual)):
    """Devuelve info del usuario actual y sus permisos."""
    rol = usuario.get("user_role")
    return {
        "user_id": usuario.get("sub"),
        "email": usuario.get("email"),
        "role": rol,
        "permisos": PERMISOS_POR_ROL.get(rol, []),
    }