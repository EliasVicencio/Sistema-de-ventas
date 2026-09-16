import httpx
import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.auth.dependencias import requiere_permiso
from app.config import settings
from app.schemas.admin import (
    CrearUsuarioRequest,
    CambiarRolRequest,
    CambiarEmailRequest,
    ResetPasswordRequest,
)

router = APIRouter(prefix="/admin", tags=["admin"])

ROLES_VALIDOS = {"cargador", "ventas", "finanzas", "admin"}


# ================================================================
# Utilidades
# ================================================================
def _construir_filtro_fechas(desde: str | None, hasta: str | None, alias: str = "a") -> tuple[str, dict]:
    where = []
    params = {}

    if desde:
        where.append(f"{alias}.fecha >= CAST(:desde AS date)")
        params["desde"] = desde

    if hasta:
        where.append(f"{alias}.fecha < CAST(:hasta AS date) + interval '1 day'")
        params["hasta"] = hasta

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    return where_sql, params


def _supabase_admin_headers() -> dict:
    """Headers para la Admin API de Supabase (bypasea RLS)."""
    return {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


# ================================================================
# Auditoría
# ================================================================
@router.get("/auditoria")
def ver_auditoria(
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
    desde: str | None = Query(None),
    hasta: str | None = Query(None),
    usuario: dict = Depends(requiere_permiso("auditoria:ver")),
    db: Session = Depends(get_db),
):
    """Registro de auditoría con paginación y filtros."""
    where_sql, params = _construir_filtro_fechas(desde, hasta)

    total = db.execute(
        text(f"SELECT COUNT(*) FROM auditoria a {where_sql}"),
        params,
    ).scalar()

    offset = (pagina - 1) * por_pagina

    result = db.execute(
        text(f"""
            SELECT
                a.id,
                a.fecha,
                u.email AS usuario_email,
                a.usuario_id,
                a.accion,
                a.detalle::text AS detalle,
                a.ip
            FROM auditoria a
            LEFT JOIN auth.users u ON u.id = a.usuario_id
            {where_sql}
            ORDER BY a.fecha DESC
            LIMIT :limite OFFSET :offset
        """),
        {**params, "limite": por_pagina, "offset": offset},
    )

    items = [dict(r._mapping) for r in result]
    total_paginas = (total + por_pagina - 1) // por_pagina if total > 0 else 1

    return {
        "items": items,
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "total_paginas": total_paginas,
    }


@router.get("/auditoria/export")
def exportar_auditoria(
    desde: str | None = Query(None),
    hasta: str | None = Query(None),
    usuario: dict = Depends(requiere_permiso("auditoria:ver")),
    db: Session = Depends(get_db),
):
    """Exporta la auditoría como CSV."""
    where_sql, params = _construir_filtro_fechas(desde, hasta)

    result = db.execute(
        text(f"""
            SELECT
                a.id,
                a.fecha,
                u.email AS usuario_email,
                a.usuario_id,
                a.accion,
                a.detalle::text AS detalle,
                a.ip
            FROM auditoria a
            LEFT JOIN auth.users u ON u.id = a.usuario_id
            {where_sql}
            ORDER BY a.fecha DESC
        """),
        params,
    )

    filas = [dict(r._mapping) for r in result]

    buffer = io.StringIO()
    writer = csv.writer(buffer, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(["ID", "Fecha", "Email usuario", "ID usuario", "Acción", "Detalle", "IP"])

    for f in filas:
        writer.writerow([
            f["id"],
            f["fecha"].isoformat() if f["fecha"] else "",
            f["usuario_email"] or "",
            f["usuario_id"] or "",
            f["accion"] or "",
            f["detalle"] or "",
            f["ip"] or "",
        ])

    buffer.seek(0)
    contenido = "\ufeff" + buffer.read()
    fecha_actual = datetime.now().strftime("%Y%m%d_%H%M")
    nombre_archivo = f"auditoria_{fecha_actual}.csv"

    return StreamingResponse(
        iter([contenido]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )


# ================================================================
# Gestión de usuarios
# ================================================================
@router.get("/usuarios")
def listar_usuarios(
    usuario: dict = Depends(requiere_permiso("usuarios:gestionar")),
    db: Session = Depends(get_db),
):
    """Lista usuarios con sus roles."""
    result = db.execute(
        text("""
            SELECT
                u.id,
                u.email,
                u.created_at,
                u.last_sign_in_at,
                COALESCE(
                    (SELECT ur.role::text
                     FROM user_roles ur
                     WHERE ur.user_id = u.id
                     LIMIT 1),
                    null
                ) AS rol
            FROM auth.users u
            ORDER BY u.created_at DESC
        """)
    )
    return [dict(r._mapping) for r in result]


@router.post("/usuarios")
async def crear_usuario(
    body: CrearUsuarioRequest,
    usuario: dict = Depends(requiere_permiso("usuarios:gestionar")),
    db: Session = Depends(get_db),
):
    """Crea un nuevo usuario con email, password y rol."""
    email = body.email.strip().lower()
    password = body.password
    rol = body.rol

    if rol not in ROLES_VALIDOS:
        raise HTTPException(400, f"Rol inválido: {rol}")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.SUPABASE_URL}/auth/v1/admin/users",
            headers=_supabase_admin_headers(),
            json={
                "email": email,
                "password": password,
                "email_confirm": True,
            },
            timeout=10,
        )

    if response.status_code >= 400:
        try:
            detalle = response.json()
        except Exception:
            detalle = response.text
        raise HTTPException(response.status_code, f"Error al crear usuario: {detalle}")

    data = response.json()
    user_id = data.get("id")

    if not user_id:
        raise HTTPException(500, "Supabase no devolvió el ID del usuario")

    db.execute(
        text("INSERT INTO user_roles (user_id, role) VALUES (:uid, CAST(:rol AS app_role))"),
        {"uid": user_id, "rol": rol},
    )

    db.execute(
        text("""
            INSERT INTO auditoria (usuario_id, accion, detalle)
            VALUES (:uid, :accion, :detalle)
        """),
        {
            "uid": usuario["sub"],
            "accion": "usuarios:crear",
            "detalle": f'{{"email": "{email}", "rol": "{rol}"}}',
        },
    )

    db.commit()

    return {"ok": True, "user_id": user_id, "email": email, "rol": rol}


@router.put("/usuarios/{user_id}/rol")
def cambiar_rol(
    user_id: str,
    body: CambiarRolRequest,
    usuario: dict = Depends(requiere_permiso("usuarios:gestionar")),
    db: Session = Depends(get_db),
):
    """Cambia el rol de un usuario."""
    nuevo_rol = body.rol

    if nuevo_rol not in ROLES_VALIDOS:
        raise HTTPException(400, f"Rol inválido: {nuevo_rol}")

    existe = db.execute(
        text("SELECT 1 FROM auth.users WHERE id = :uid"),
        {"uid": user_id},
    ).fetchone()

    if not existe:
        raise HTTPException(404, "Usuario no encontrado")

    if user_id == usuario["sub"] and nuevo_rol != "admin":
        raise HTTPException(400, "No puedes cambiar tu propio rol de admin")

    db.execute(
        text("DELETE FROM user_roles WHERE user_id = :uid"),
        {"uid": user_id},
    )

    db.execute(
        text("INSERT INTO user_roles (user_id, role) VALUES (:uid, CAST(:rol AS app_role))"),
        {"uid": user_id, "rol": nuevo_rol},
    )

    db.execute(
        text("""
            INSERT INTO auditoria (usuario_id, accion, detalle)
            VALUES (:uid, :accion, :detalle)
        """),
        {
            "uid": usuario["sub"],
            "accion": "usuarios:cambiar_rol",
            "detalle": f'{{"user_id": "{user_id}", "nuevo_rol": "{nuevo_rol}"}}',
        },
    )

    db.commit()

    return {"ok": True, "user_id": user_id, "nuevo_rol": nuevo_rol}


@router.patch("/usuarios/{user_id}/email")
async def cambiar_email(
    user_id: str,
    body: CambiarEmailRequest,
    usuario: dict = Depends(requiere_permiso("usuarios:gestionar")),
    db: Session = Depends(get_db),
):
    """Cambia el email de un usuario."""
    email = body.email.strip().lower()

    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}",
            headers=_supabase_admin_headers(),
            json={"email": email, "email_confirm": True},
            timeout=10,
        )

    if response.status_code >= 400:
        raise HTTPException(response.status_code, "Error al cambiar email")

    db.execute(
        text("""
            INSERT INTO auditoria (usuario_id, accion, detalle)
            VALUES (:uid, :accion, :detalle)
        """),
        {
            "uid": usuario["sub"],
            "accion": "usuarios:cambiar_email",
            "detalle": f'{{"user_id": "{user_id}", "email": "{email}"}}',
        },
    )
    db.commit()

    return {"ok": True, "user_id": user_id, "email": email}


@router.post("/usuarios/{user_id}/reset-password")
async def reset_password(
    user_id: str,
    body: ResetPasswordRequest,
    usuario: dict = Depends(requiere_permiso("usuarios:gestionar")),
    db: Session = Depends(get_db),
):
    """Resetea la contraseña de un usuario."""
    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}",
            headers=_supabase_admin_headers(),
            json={"password": body.password},
            timeout=10,
        )

    if response.status_code >= 400:
        raise HTTPException(response.status_code, "Error al resetear contraseña")

    db.execute(
        text("""
            INSERT INTO auditoria (usuario_id, accion, detalle)
            VALUES (:uid, :accion, :detalle)
        """),
        {
            "uid": usuario["sub"],
            "accion": "usuarios:reset_password",
            "detalle": f'{{"user_id": "{user_id}"}}',
        },
    )
    db.commit()

    return {"ok": True, "user_id": user_id}


@router.delete("/usuarios/{user_id}")
async def eliminar_usuario(
    user_id: str,
    usuario: dict = Depends(requiere_permiso("usuarios:gestionar")),
    db: Session = Depends(get_db),
):
    """Elimina un usuario."""
    if user_id == usuario["sub"]:
        raise HTTPException(400, "No puedes eliminarte a ti mismo")

    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}",
            headers=_supabase_admin_headers(),
            timeout=10,
        )

    if response.status_code >= 400:
        raise HTTPException(response.status_code, "Error al eliminar usuario")

    db.execute(
        text("""
            INSERT INTO auditoria (usuario_id, accion, detalle)
            VALUES (:uid, :accion, :detalle)
        """),
        {
            "uid": usuario["sub"],
            "accion": "usuarios:eliminar",
            "detalle": f'{{"user_id": "{user_id}"}}',
        },
    )
    db.commit()

    return {"ok": True, "user_id": user_id}