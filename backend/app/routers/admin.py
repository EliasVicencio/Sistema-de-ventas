from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.auth.dependencias import requiere_permiso

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/usuarios")
def listar_usuarios(
    usuario: dict = Depends(requiere_permiso("usuarios:gestionar")),
    db: Session = Depends(get_db),
):
    """Lista usuarios con sus roles (desde auth.users + user_roles)."""
    result = db.execute(
        text("""
            SELECT u.id, u.email, u.created_at,
                   COALESCE(
                       (SELECT json_agg(ur.role)
                        FROM user_roles ur
                        WHERE ur.user_id = u.id),
                       '[]'::json
                   ) as roles
            FROM auth.users u
            ORDER BY u.created_at DESC
        """)
    )
    return [dict(r._mapping) for r in result]


@router.get("/auditoria")
def ver_auditoria(
    limite: int = 100,
    usuario: dict = Depends(requiere_permiso("auditoria:ver")),
    db: Session = Depends(get_db),
):
    """Registro de auditoría (solo admin)."""
    result = db.execute(
        text("""
            SELECT id, usuario_id, accion, detalle, ip, fecha
            FROM auditoria
            ORDER BY fecha DESC
            LIMIT :limite
        """),
        {"limite": limite},
    )
    return [dict(r._mapping) for r in result]