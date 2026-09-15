from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.auth.dependencias import requiere_permiso, get_usuario_actual
from app.auth.permisos import tiene_permiso
from app.servicios.auditoria import registrar

router = APIRouter(prefix="/reportes", tags=["reportes"])


@router.get("/mensual")
def reporte_mensual(
    mes: str = Query(..., description="Formato YYYY-MM"),
    usuario: dict = Depends(requiere_permiso("reportes:generar")),
    db: Session = Depends(get_db),
):
    """Reporte mensual de ventas."""
    total = db.execute(
        text("""
            SELECT COALESCE(SUM(total), 0) as total_vendido,
                   COUNT(*) as cantidad_boletas
            FROM boletas
            WHERE to_char(fecha, 'YYYY-MM') = :mes
        """),
        {"mes": mes},
    ).fetchone()

    top_producto = db.execute(
        text("""
            SELECT producto, SUM(cantidad) as total_vendido
            FROM boletas
            WHERE to_char(fecha, 'YYYY-MM') = :mes
            GROUP BY producto
            ORDER BY total_vendido DESC
            LIMIT 1
        """),
        {"mes": mes},
    ).fetchone()

    por_dia = db.execute(
        text("""
            SELECT fecha, SUM(total) as total
            FROM boletas
            WHERE to_char(fecha, 'YYYY-MM') = :mes
            GROUP BY fecha
            ORDER BY fecha
        """),
        {"mes": mes},
    ).fetchall()

    registrar(db, usuario["sub"], "reportes:generar", {"mes": mes})

    return {
        "mes": mes,
        "total_vendido": float(total.total_vendido),
        "cantidad_boletas": total.cantidad_boletas,
        "producto_mas_vendido": dict(top_producto._mapping) if top_producto else None,
        "ventas_por_dia": [dict(r._mapping) for r in por_dia],
    }


@router.get("/resumen")
def resumen_dashboard(
    usuario: dict = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    """Resumen para el dashboard: stats del mes actual."""
    from datetime import date
    mes_actual = date.today().strftime("%Y-%m")

    stats = db.execute(
        text("""
            SELECT
                COUNT(*) AS total_boletas,
                COALESCE(SUM(total), 0) AS total_vendido,
                COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
                COUNT(*) FILTER (WHERE estado = 'confirmada') AS confirmadas
            FROM boletas
            WHERE to_char(fecha, 'YYYY-MM') = :mes
        """),
        {"mes": mes_actual},
    ).fetchone()

    top_producto = db.execute(
        text("""
            SELECT producto, SUM(cantidad) AS unidades
            FROM boletas
            WHERE to_char(fecha, 'YYYY-MM') = :mes
            GROUP BY producto
            ORDER BY unidades DESC
            LIMIT 1
        """),
        {"mes": mes_actual},
    ).fetchone()

    rol = usuario.get("user_role")

    if tiene_permiso(rol, "boletas:ver_todas"):
        ultimas = db.execute(
            text("""
                SELECT id, numero_boleta, fecha, cliente, producto, total, estado
                FROM boletas
                ORDER BY subido_en DESC
                LIMIT 5
            """)
        ).fetchall()
    else:
        ultimas = db.execute(
            text("""
                SELECT id, numero_boleta, fecha, cliente, producto, total, estado
                FROM boletas
                WHERE subido_por = :uid
                ORDER BY subido_en DESC
                LIMIT 5
            """),
            {"uid": usuario["sub"]},
        ).fetchall()

    return {
        "mes": mes_actual,
        "total_boletas": stats.total_boletas,
        "total_vendido": float(stats.total_vendido),
        "pendientes": stats.pendientes,
        "confirmadas": stats.confirmadas,
        "producto_mas_vendido": dict(top_producto._mapping) if top_producto else None,
        "ultimas_boletas": [dict(r._mapping) for r in ultimas],
    }