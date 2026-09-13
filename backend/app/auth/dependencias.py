from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
from app.config import settings

async def get_usuario_actual(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token inválido")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        return payload  # incluye user_role como claim
    except JWTError:
        raise HTTPException(401, "Token inválido o expirado")

def requiere_permiso(permiso: str):
    def verificador(usuario = Depends(get_usuario_actual)):
        rol = usuario.get("user_role")
        # Aquí consultas role_permissions o usas un dict hardcodeado
        if rol == "admin":
            return usuario
        raise HTTPException(403, "Sin permiso")
    return verificador