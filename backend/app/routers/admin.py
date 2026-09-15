from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
import csv
import io
from datetime import datetime

from app.database import get_db
from app.auth.dependencias import requiere_permiso

router = APIRouter(prefix="/admin", tags=["admin"])


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


@router.get("/usuarios")
def listar_usuarios(
    usuario: dict = Depends(requiere_permiso("usuarios:gestionar")),
    db: Session = Depends(get_db),
):
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
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
    desde: str | None = Query(None),
    hasta: str | None = Query(None),
    usuario: dict = Depends(requiere_permiso("auditoria:ver")),
    db: Session = Depends(get_db),
):
    """Registro de auditoría con paginación y filtros."""
    where_sql, params = _construir_filtro_fechas(desde, hasta)

    # Total
    total = db.execute(
        text(f"SELECT COUNT(*) FROM auditoria a {where_sql}"),
        params,
    ).scalar()

    # Offset
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
    desde: str | None = Query(None, description="Fecha inicial YYYY-MM-DD"),
    hasta: str | None = Query(None, description="Fecha final YYYY-MM-DD"),
    usuario: dict = Depends(requiere_permiso("auditoria:ver")),
    db: Session = Depends(get_db),
):
    """Exporta la auditoría como CSV con filtro opcional."""
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

    writer.writerow([
        "ID", "Fecha", "Email usuario", "ID usuario",
        "Acción", "Detalle", "IP",
    ])

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
        headers={
            "Content-Disposition": f'attachment; filename="{nombre_archivo}"',
        },
    )