import pytest
from app.servicios.validaciones import validar_boleta


def boleta_valida(**overrides):
    """Devuelve una boleta válida, con posibilidad de overridear campos."""
    base = {
        "numero_boleta": "B001-0001",
        "fecha": "2026-09-15",
        "cliente": "Juan Pérez",
        "producto": "Arroz 1kg",
        "cantidad": "2",
        "precio_unitario": "3.50",
        "descuento": "0",
        "total": "7.00",
        "metodo_pago": "efectivo",
        "canal_venta": "fisico",
        "estado": "confirmada",
        "tipo_documento": "boleta",
    }
    base.update(overrides)
    return base


# ----------------------------------------------------------------
# Casos válidos
# ----------------------------------------------------------------

def test_boleta_valida_completa():
    boleta, error = validar_boleta(boleta_valida())
    assert error is None
    assert boleta["numero_boleta"] == "B001-0001"
    assert boleta["cantidad"] == 2
    assert boleta["total"] == 7.00
    assert boleta["metodo_pago"] == "efectivo"
    assert boleta["tipo_documento"] == "boleta"


def test_boleta_con_descuento():
    b, error = validar_boleta(boleta_valida(
        cantidad="3", precio_unitario="4.00",
        descuento="2.00", total="10.00",
    ))
    assert error is None
    assert b["descuento"] == 2.00
    assert b["total"] == 10.00


def test_boleta_factura():
    b, error = validar_boleta(boleta_valida(tipo_documento="factura"))
    assert error is None
    assert b["tipo_documento"] == "factura"


def test_tipo_documento_default_es_boleta():
    """Si no viene tipo_documento, debe ser 'boleta'."""
    datos = boleta_valida()
    del datos["tipo_documento"]
    b, error = validar_boleta(datos)
    assert error is None
    assert b["tipo_documento"] == "boleta"


def test_limpiar_espacios():
    """Los espacios sobrantes en strings se limpian."""
    b, error = validar_boleta(boleta_valida(cliente="  Juan  "))
    assert error is None
    assert b["cliente"] == "Juan"


def test_metodo_pago_uppercase():
    """El método se normaliza a lowercase."""
    b, error = validar_boleta(boleta_valida(metodo_pago="EFECTIVO"))
    assert error is None
    assert b["metodo_pago"] == "efectivo"


# ----------------------------------------------------------------
# Campos vacíos
# ----------------------------------------------------------------

@pytest.mark.parametrize("campo,valor,mensaje", [
    ("numero_boleta", "", "número de boleta vacío"),
    ("fecha", "", "fecha vacía"),
    ("cliente", "", "cliente vacío"),
    ("producto", "", "producto vacío"),
])
def test_campos_obligatorios_vacios(campo, valor, mensaje):
    boleta, error = validar_boleta(boleta_valida(**{campo: valor}))
    assert boleta is None
    assert error == mensaje


# ----------------------------------------------------------------
# Métodos de pago
# ----------------------------------------------------------------

@pytest.mark.parametrize("metodo", [
    "efectivo", "debito", "credito", "transferencia", "vale_vista",
])
def test_metodos_pago_validos(metodo):
    b, error = validar_boleta(boleta_valida(metodo_pago=metodo))
    assert error is None
    assert b["metodo_pago"] == metodo


@pytest.mark.parametrize("metodo", ["tarjeta", "bitcoin", "cheque", ""])
def test_metodos_pago_invalidos(metodo):
    b, error = validar_boleta(boleta_valida(metodo_pago=metodo))
    assert b is None
    assert "método de pago" in error


# ----------------------------------------------------------------
# Tipo de documento
# ----------------------------------------------------------------

@pytest.mark.parametrize("tipo", ["boleta", "factura"])
def test_tipos_documento_validos(tipo):
    b, error = validar_boleta(boleta_valida(tipo_documento=tipo))
    assert error is None


@pytest.mark.parametrize("tipo", ["nota_credito", "guia", "factura_electronica"])
def test_tipos_documento_invalidos(tipo):
    b, error = validar_boleta(boleta_valida(tipo_documento=tipo))
    assert b is None
    assert "tipo de documento" in error


# ----------------------------------------------------------------
# Canal y estado
# ----------------------------------------------------------------

@pytest.mark.parametrize("canal", ["fisico", "ecommerce", "redes", "otro"])
def test_canales_validos(canal):
    b, error = validar_boleta(boleta_valida(canal_venta=canal))
    assert error is None


def test_canal_invalido():
    b, error = validar_boleta(boleta_valida(canal_venta="telepatia"))
    assert b is None
    assert "canal de venta" in error


@pytest.mark.parametrize("estado", ["confirmada", "pendiente", "devuelta"])
def test_estados_validos(estado):
    b, error = validar_boleta(boleta_valida(estado=estado))
    assert error is None


def test_estado_invalido():
    b, error = validar_boleta(boleta_valida(estado="en_limbo"))
    assert b is None
    assert "estado inválido" in error


# ----------------------------------------------------------------
# Cantidad y precio
# ----------------------------------------------------------------

@pytest.mark.parametrize("cantidad", ["0", "-1", "abc", ""])
def test_cantidad_invalida(cantidad):
    b, error = validar_boleta(boleta_valida(cantidad=cantidad))
    assert b is None


@pytest.mark.parametrize("precio", ["0", "-5.00", "abc", ""])
def test_precio_invalido(precio):
    b, error = validar_boleta(boleta_valida(precio_unitario=precio))
    assert b is None


def test_cantidad_cero():
    b, error = validar_boleta(boleta_valida(cantidad="0"))
    assert b is None
    assert "cantidad" in error


def test_precio_negativo():
    b, error = validar_boleta(boleta_valida(precio_unitario="-3.00"))
    assert b is None
    assert "precio" in error


# ----------------------------------------------------------------
# Total
# ----------------------------------------------------------------

def test_total_mal_calculado():
    """cantidad=2, precio=3.50 → total debería ser 7.00, no 8.00."""
    b, error = validar_boleta(boleta_valida(total="8.00"))
    assert b is None
    assert "total mal calculado" in error
    assert "7.0" in error


def test_total_con_tolerancia_de_centavos():
    """Diferencias de 1 centavo se aceptan (redondeo)."""
    b, error = validar_boleta(boleta_valida(
        cantidad="3", precio_unitario="3.333", total="10.00",
    ))
    assert error is None


# ----------------------------------------------------------------
# Descuento
# ----------------------------------------------------------------

def test_descuento_negativo():
    b, error = validar_boleta(boleta_valida(descuento="-1"))
    assert b is None
    assert "descuento" in error


def test_descuento_mayor_al_subtotal():
    b, error = validar_boleta(boleta_valida(
        cantidad="1", precio_unitario="5.00",
        descuento="10.00", total="-5.00",
    ))
    assert b is None
    assert "descuento mayor" in error


def test_descuento_vacio_se_trata_como_cero():
    b, error = validar_boleta(boleta_valida(descuento=""))
    assert error is None
    assert b["descuento"] == 0.0