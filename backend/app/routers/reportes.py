from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import io

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


@router.get("/graficos")
def graficos(
    usuario: dict = Depends(requiere_permiso("reportes:generar")),
    db: Session = Depends(get_db),
):
    """Datos para gráficos: ventas por mes (6m) y distribución por producto."""
    from datetime import date

    mes_actual = date.today().strftime("%Y-%m")

    # 1. Generar los últimos 6 meses (incluyendo el actual) en Python
    hoy = date.today()
    meses = []
    for i in range(5, -1, -1):
        año = hoy.year
        mes_num = hoy.month - i
        while mes_num <= 0:
            mes_num += 12
            año -= 1
        meses.append(f"{año:04d}-{mes_num:02d}")

    # 2. Consultar ventas agrupadas por mes
    resultado = db.execute(
        text("""
            SELECT
                to_char(fecha, 'YYYY-MM') AS mes,
                COALESCE(SUM(total), 0) AS total
            FROM boletas
            WHERE fecha >= date_trunc('month', CURRENT_DATE) - interval '5 months'
            GROUP BY mes
        """)
    ).fetchall()

    # 3. Mapear resultados a un diccionario
    ventas_dict = {r.mes: float(r.total) for r in resultado}

    # 4. Construir la lista final con todos los meses (0 si no hay datos)
    ventas_por_mes = [
        {"mes": m, "total": ventas_dict.get(m, 0.0)}
        for m in meses
    ]

    # 5. Distribución por producto (mes actual)
    productos = db.execute(
        text("""
            SELECT producto, COALESCE(SUM(total), 0) AS total
            FROM boletas
            WHERE to_char(fecha, 'YYYY-MM') = :mes
            GROUP BY producto
            ORDER BY total DESC
        """),
        {"mes": mes_actual},
    ).fetchall()

    top_productos = productos[:5]
    otros = productos[5:]

    distribucion = [
        {"producto": p.producto, "total": float(p.total)}
        for p in top_productos
    ]
    if otros:
        total_otros = sum(float(p.total) for p in otros)
        distribucion.append({"producto": "Otros", "total": total_otros})

    return {
        "mes_actual": mes_actual,
        "ventas_por_mes": ventas_por_mes,
        "distribucion_productos": distribucion,
    }


@router.get("/mensual/excel")
def reporte_mensual_excel(
    mes: str = Query(..., description="Formato YYYY-MM"),
    usuario: dict = Depends(requiere_permiso("reportes:generar")),
    db: Session = Depends(get_db),
):
    """Genera un Excel con el reporte mensual y gráficos nativos."""
    from openpyxl.chart import PieChart, BarChart, Reference
    from openpyxl.chart.label import DataLabelList

    # --- 1. Datos ---
    resumen = db.execute(
        text("""
            SELECT
                COUNT(*) AS total_boletas,
                COALESCE(SUM(total), 0) AS total_vendido,
                COALESCE(AVG(total), 0) AS ticket_promedio,
                COUNT(*) FILTER (WHERE estado = 'confirmada') AS confirmadas,
                COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
                COUNT(*) FILTER (WHERE estado = 'devuelta') AS devueltas
            FROM boletas
            WHERE to_char(fecha, 'YYYY-MM') = :mes
        """),
        {"mes": mes},
    ).fetchone()

    boletas = db.execute(
        text("""
            SELECT numero_boleta, fecha, cliente, producto, cantidad,
                   precio_unitario, descuento, total, metodo_pago,
                   canal_venta, estado
            FROM boletas
            WHERE to_char(fecha, 'YYYY-MM') = :mes
            ORDER BY fecha, numero_boleta
        """),
        {"mes": mes},
    ).fetchall()

    por_dia = db.execute(
        text("""
            SELECT fecha, COUNT(*) AS cantidad, SUM(total) AS total
            FROM boletas
            WHERE to_char(fecha, 'YYYY-MM') = :mes
            GROUP BY fecha
            ORDER BY fecha
        """),
        {"mes": mes},
    ).fetchall()

    por_producto = db.execute(
        text("""
            SELECT producto,
                   SUM(cantidad) AS unidades,
                   COUNT(*) AS boletas,
                   SUM(total) AS total
            FROM boletas
            WHERE to_char(fecha, 'YYYY-MM') = :mes
            GROUP BY producto
            ORDER BY total DESC
        """),
        {"mes": mes},
    ).fetchall()

    # --- 2. Construir el Excel ---
    wb = Workbook()

    # Estilos
    titulo_font = Font(bold=True, size=14, color="FFFFFF")
    titulo_fill = PatternFill("solid", fgColor="2563EB")
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="1E40AF")
    subtotal_font = Font(bold=True)
    subtotal_fill = PatternFill("solid", fgColor="F1F5F9")
    borde_fino = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )
    centrado = Alignment(horizontal="center", vertical="center")
    derecha = Alignment(horizontal="right", vertical="center")

    # ============ HOJA 1: RESUMEN ============
    ws = wb.active
    ws.title = "Resumen"

    ws.merge_cells("A1:D1")
    ws["A1"] = f"Reporte de Ventas — {mes}"
    ws["A1"].font = titulo_font
    ws["A1"].fill = titulo_fill
    ws["A1"].alignment = centrado
    ws.row_dimensions[1].height = 28

    ws.merge_cells("A2:D2")
    ws["A2"] = f"Generado por: {usuario.get('email', 'N/A')}"
    ws["A2"].font = Font(italic=True, size=10, color="64748B")
    ws["A2"].alignment = centrado

    filas_resumen = [
        ("Total vendido", f"${float(resumen.total_vendido):,.2f}"),
        ("Cantidad de boletas", resumen.total_boletas),
        ("Ticket promedio", f"${float(resumen.ticket_promedio):,.2f}"),
        ("Confirmadas", resumen.confirmadas),
        ("Pendientes", resumen.pendientes),
        ("Devueltas", resumen.devueltas),
    ]

    fila = 4
    ws.cell(row=fila, column=1, value="Métrica").font = header_font
    ws.cell(row=fila, column=1).fill = header_fill
    ws.cell(row=fila, column=1).alignment = centrado
    ws.cell(row=fila, column=1).border = borde_fino
    ws.cell(row=fila, column=2, value="Valor").font = header_font
    ws.cell(row=fila, column=2).fill = header_fill
    ws.cell(row=fila, column=2).alignment = centrado
    ws.cell(row=fila, column=2).border = borde_fino

    for nombre, valor in filas_resumen:
        fila += 1
        ws.cell(row=fila, column=1, value=nombre).border = borde_fino
        celda_valor = ws.cell(row=fila, column=2, value=valor)
        celda_valor.border = borde_fino
        celda_valor.alignment = derecha

    ws.column_dimensions["A"].width = 28
    ws.column_dimensions["B"].width = 22

    # ============ HOJA 2: VENTAS ============
    ws2 = wb.create_sheet("Ventas")
    headers = [
        "N° boleta", "Fecha", "Cliente", "Producto", "Cantidad",
        "Precio unitario", "Descuento", "Total", "Método pago",
        "Canal", "Estado",
    ]

    for col, header in enumerate(headers, start=1):
        c = ws2.cell(row=1, column=col, value=header)
        c.font = header_font
        c.fill = header_fill
        c.alignment = centrado
        c.border = borde_fino

    for i, b in enumerate(boletas, start=2):
        fila_datos = [
            b.numero_boleta,
            str(b.fecha),
            b.cliente,
            b.producto,
            b.cantidad,
            float(b.precio_unitario),
            float(b.descuento),
            float(b.total),
            b.metodo_pago,
            b.canal_venta,
            b.estado,
        ]
        for col, valor in enumerate(fila_datos, start=1):
            c = ws2.cell(row=i, column=col, value=valor)
            c.border = borde_fino
            if col in (6, 7, 8):
                c.number_format = '"$"#,##0.00'
                c.alignment = derecha

    anchos = [14, 12, 22, 22, 10, 14, 12, 12, 14, 12, 12]
    for i, ancho in enumerate(anchos, start=1):
        ws2.column_dimensions[get_column_letter(i)].width = ancho

    fila_total = len(boletas) + 2
    ws2.cell(row=fila_total, column=1, value="TOTAL").font = subtotal_font
    ws2.cell(row=fila_total, column=1).fill = subtotal_fill
    celda_sum = ws2.cell(
        row=fila_total, column=8,
        value=f"=SUM(H2:H{fila_total - 1})"
    )
    celda_sum.font = subtotal_font
    celda_sum.fill = subtotal_fill
    celda_sum.number_format = '"$"#,##0.00'
    celda_sum.alignment = derecha

    # ============ HOJA 3: POR DÍA ============
    ws3 = wb.create_sheet("Por día")
    headers3 = ["Fecha", "Boletas", "Total"]
    for col, header in enumerate(headers3, start=1):
        c = ws3.cell(row=1, column=col, value=header)
        c.font = header_font
        c.fill = header_fill
        c.alignment = centrado
        c.border = borde_fino

    for i, d in enumerate(por_dia, start=2):
        ws3.cell(row=i, column=1, value=str(d.fecha)).border = borde_fino
        ws3.cell(row=i, column=2, value=d.cantidad).border = borde_fino
        c = ws3.cell(row=i, column=3, value=float(d.total))
        c.border = borde_fino
        c.number_format = '"$"#,##0.00'
        c.alignment = derecha

    fila_total3 = len(por_dia) + 2
    ws3.cell(row=fila_total3, column=1, value="TOTAL").font = subtotal_font
    ws3.cell(row=fila_total3, column=1).fill = subtotal_fill
    ws3.cell(row=fila_total3, column=2, value=f"=SUM(B2:B{fila_total3 - 1})").font = subtotal_font
    ws3.cell(row=fila_total3, column=2).fill = subtotal_fill
    c = ws3.cell(row=fila_total3, column=3, value=f"=SUM(C2:C{fila_total3 - 1})")
    c.font = subtotal_font
    c.fill = subtotal_fill
    c.number_format = '"$"#,##0.00'
    c.alignment = derecha

    ws3.column_dimensions["A"].width = 16
    ws3.column_dimensions["B"].width = 12
    ws3.column_dimensions["C"].width = 18

    # ============ HOJA 4: POR PRODUCTO ============
    ws4 = wb.create_sheet("Por producto")
    headers4 = ["Producto", "Unidades", "Boletas", "Total"]
    for col, header in enumerate(headers4, start=1):
        c = ws4.cell(row=1, column=col, value=header)
        c.font = header_font
        c.fill = header_fill
        c.alignment = centrado
        c.border = borde_fino

    for i, p in enumerate(por_producto, start=2):
        ws4.cell(row=i, column=1, value=p.producto).border = borde_fino
        ws4.cell(row=i, column=2, value=int(p.unidades)).border = borde_fino
        ws4.cell(row=i, column=3, value=p.boletas).border = borde_fino
        c = ws4.cell(row=i, column=4, value=float(p.total))
        c.border = borde_fino
        c.number_format = '"$"#,##0.00'
        c.alignment = derecha

    ws4.column_dimensions["A"].width = 26
    ws4.column_dimensions["B"].width = 12
    ws4.column_dimensions["C"].width = 12
    ws4.column_dimensions["D"].width = 16

    # ============ GRÁFICOS ============
    # Los gráficos se insertan en la hoja Resumen, apuntando a datos
    # que están en "Por producto" y "Por día".

    #    # --- Gráfico 1: Torta (distribución por producto) ---
    if por_producto:
        pie = PieChart()
        pie.title = "Distribución por producto"
        pie.height = 9
        pie.width = 14

        datos = Reference(
            ws4,
            min_col=4,
            min_row=1,
            max_row=len(por_producto) + 1,
        )
        categorias = Reference(
            ws4,
            min_col=1,
            min_row=2,
            max_row=len(por_producto) + 1,
        )

        pie.add_data(datos, titles_from_data=True)
        pie.set_categories(categorias)

        # Solo mostrar porcentaje (más limpio)
        pie.dataLabels = DataLabelList()
        pie.dataLabels.showPercent = True
        pie.dataLabels.showVal = False
        pie.dataLabels.showCatName = False
        pie.dataLabels.showSerName = False
        pie.dataLabels.showLegendKey = False

        ws.add_chart(pie, "D4")

    # --- Gráfico 2: Barras (ventas por día) ---
    if por_dia:
        bar = BarChart()
        bar.type = "col"
        bar.title = "Ventas por día"
        bar.height = 9
        bar.width = 14
        bar.y_axis.title = "Total ($)"
        bar.x_axis.title = "Fecha"

        datos = Reference(
            ws3,
            min_col=3,        # columna Total
            min_row=1,
            max_row=len(por_dia) + 1,
        )
        categorias = Reference(
            ws3,
            min_col=1,        # columna Fecha
            min_row=2,
            max_row=len(por_dia) + 1,
        )

        bar.add_data(datos, titles_from_data=True)
        bar.set_categories(categorias)

        # Insertar debajo del gráfico de torta
        ws.add_chart(bar, "D24")

        # --- Gráfico 3: Barras horizontales (ranking de productos) ---
    if por_producto:
        bar2 = BarChart()
        bar2.type = "bar"
        bar2.title = "Ranking de productos (por total)"
        bar2.height = 9
        bar2.width = 14
        bar2.y_axis.title = "Producto"
        bar2.x_axis.title = "Total ($)"
        bar2.x_axis.scaling.min = 0   # ← forzar mínimo 0
        bar2.x_axis.numFmt = '"$"#,##0'

        datos = Reference(ws4, min_col=4, min_row=1, max_row=len(por_producto) + 1)
        categorias = Reference(ws4, min_col=1, min_row=2, max_row=len(por_producto) + 1)

        bar2.add_data(datos, titles_from_data=True)
        bar2.set_categories(categorias)

        ws4.add_chart(bar2, "F2")

    # --- Guardar ---
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    nombre_archivo = f"reporte_ventas_{mes}.xlsx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{nombre_archivo}"',
        },
    )