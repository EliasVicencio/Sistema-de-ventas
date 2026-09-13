METODOS_PAGO_VALIDOS = {"efectivo", "tarjeta"}


def validar_boleta(fila: dict) -> tuple[dict | None, str | None]:
    """Valida una boleta. Devuelve (boleta_limpia, error)."""
    numero = str(fila.get("numero_boleta", "")).strip()
    fecha = str(fila.get("fecha", "")).strip()
    cliente = str(fila.get("cliente", "")).strip()
    producto = str(fila.get("producto", "")).strip()
    metodo = str(fila.get("metodo_pago", "")).strip().lower()

    if not numero:
        return None, "número de boleta vacío"
    if not fecha:
        return None, "fecha vacía"
    if not cliente:
        return None, "cliente vacío"
    if not producto:
        return None, "producto vacío"
    if metodo not in METODOS_PAGO_VALIDOS:
        return None, f"método de pago inválido: '{metodo}'"

    try:
        cantidad = int(fila.get("cantidad"))
    except (TypeError, ValueError):
        return None, "cantidad no numérica"

    try:
        precio = float(fila.get("precio_unitario"))
    except (TypeError, ValueError):
        return None, "precio unitario no numérico"

    if cantidad <= 0:
        return None, "cantidad debe ser mayor a 0"
    if precio <= 0:
        return None, "precio unitario debe ser mayor a 0"

    try:
        total = float(fila.get("total"))
    except (TypeError, ValueError):
        return None, "total no numérico"

    total_calculado = round(cantidad * precio, 2)
    if abs(total - total_calculado) > 0.01:
        return None, f"total mal calculado: {total} != {total_calculado}"

    return {
        "numero_boleta": numero,
        "fecha": fecha,
        "cliente": cliente,
        "producto": producto,
        "cantidad": cantidad,
        "precio_unitario": precio,
        "total": total_calculado,
        "metodo_pago": metodo,
    }, None