METODOS_PAGO_VALIDOS = {"efectivo", "debito", "credito", "transferencia", "vale_vista"}
CANALES_VALIDOS = {"fisico", "ecommerce", "redes", "otro"}
ESTADOS_VALIDOS = {"confirmada", "pendiente", "devuelta"}
TIPOS_DOCUMENTO_VALIDOS = {"boleta", "factura"}


def validar_boleta(fila: dict) -> tuple[dict | None, str | None]:
    """Valida una boleta. Devuelve (boleta_limpia, error)."""
    numero = str(fila.get("numero_boleta", "")).strip()
    fecha = str(fila.get("fecha", "")).strip()
    cliente = str(fila.get("cliente", "")).strip()
    producto = str(fila.get("producto", "")).strip()
    metodo = str(fila.get("metodo_pago", "")).strip().lower()
    canal = str(fila.get("canal_venta", "fisico")).strip().lower() or "fisico"
    estado = str(fila.get("estado", "confirmada")).strip().lower() or "confirmada"
    tipo = str(fila.get("tipo_documento", "boleta")).strip().lower() or "boleta"

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
    if canal not in CANALES_VALIDOS:
        return None, f"canal de venta inválido: '{canal}'"
    if estado not in ESTADOS_VALIDOS:
        return None, f"estado inválido: '{estado}'"
    if tipo not in TIPOS_DOCUMENTO_VALIDOS:
        return None, f"tipo de documento inválido: '{tipo}'"

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

    descuento_raw = fila.get("descuento", 0) or 0
    try:
        descuento = float(descuento_raw)
    except (TypeError, ValueError):
        return None, "descuento no numérico"

    if descuento < 0:
        return None, "descuento no puede ser negativo"

    subtotal = round(cantidad * precio, 2)
    if descuento > subtotal:
        return None, "descuento mayor al subtotal"

    total_calculado = round(subtotal - descuento, 2)

    try:
        total = float(fila.get("total"))
    except (TypeError, ValueError):
        return None, "total no numérico"

    if abs(total - total_calculado) > 0.01:
        return None, f"total mal calculado: {total} != {total_calculado}"

    return {
        "numero_boleta": numero,
        "fecha": fecha,
        "cliente": cliente,
        "producto": producto,
        "cantidad": cantidad,
        "precio_unitario": precio,
        "descuento": descuento,
        "total": total_calculado,
        "metodo_pago": metodo,
        "canal_venta": canal,
        "estado": estado,
        "tipo_documento": tipo,
    }, None