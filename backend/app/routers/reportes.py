from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.auth.dependencias import requiere_permiso
from app.servicios.auditoria import registrar

router = APIRouter(prefix="/reportes", tags=["reportes"])


@router.get("/mensual")
def reporte_mensual(
    mes: str = Query(..., description="Formato YYYY-MM"),
    usuario: dict = Depends(requiere_permiso("reportes:generar")),
    db: Session = Depends(get_db),
):
    """Reporte mensual de ventas."""
    # Total vendido
    total = db.execute(
        text("""
            SELECT COALESCE(SUM(total), 0) as total_vendido,
                   COUNT(*) as cantidad_boletas
            FROM boletas
            WHERE to_char(fecha, 'YYYY-MM') = :mes
        """),
        {"mes": mes},
    ).fetchone()

    # Producto más vendido
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

    # Ventas por día
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