import pytest
from app.auth.permisos import tiene_permiso, PERMISOS_POR_ROL


# ================================================================
# Estructura
# ================================================================
def test_roles_esperados_existen():
    assert set(PERMISOS_POR_ROL.keys()) == {"cargador", "ventas", "finanzas", "admin"}


# ================================================================
# Admin
# ================================================================
def test_admin_tiene_todos_los_permisos():
    for permiso in PERMISOS_POR_ROL["admin"]:
        assert tiene_permiso("admin", permiso) is True


def test_admin_puede_gestionar_usuarios():
    assert tiene_permiso("admin", "usuarios:gestionar") is True


def test_admin_puede_ver_auditoria():
    assert tiene_permiso("admin", "auditoria:ver") is True


# ================================================================
# Cargador
# ================================================================
def test_cargador_puede_subir():
    assert tiene_permiso("cargador", "boletas:subir") is True


def test_cargador_puede_ver_propias():
    assert tiene_permiso("cargador", "boletas:ver_propias") is True


def test_cargador_no_ve_todas():
    assert tiene_permiso("cargador", "boletas:ver_todas") is False


def test_cargador_no_puede_eliminar():
    assert tiene_permiso("cargador", "boletas:eliminar") is False


def test_cargador_no_ve_auditoria():
    assert tiene_permiso("cargador", "auditoria:ver") is False


# ================================================================
# Ventas
# ================================================================
def test_ventas_puede_subir():
    assert tiene_permiso("ventas", "boletas:subir") is True


def test_ventas_ve_todas():
    assert tiene_permiso("ventas", "boletas:ver_todas") is True


def test_ventas_puede_eliminar():
    assert tiene_permiso("ventas", "boletas:eliminar") is True


def test_ventas_genera_reportes():
    assert tiene_permiso("ventas", "reportes:generar") is True


def test_ventas_no_ve_auditoria():
    assert tiene_permiso("ventas", "auditoria:ver") is False


def test_ventas_no_gestiona_usuarios():
    assert tiene_permiso("ventas", "usuarios:gestionar") is False


# ================================================================
# Finanzas
# ================================================================
def test_finanzas_ve_todas():
    assert tiene_permiso("finanzas", "boletas:ver_todas") is True


def test_finanzas_genera_reportes():
    assert tiene_permiso("finanzas", "reportes:generar") is True


def test_finanzas_no_sube_boletas():
    assert tiene_permiso("finanzas", "boletas:subir") is False


def test_finanzas_no_elimina():
    assert tiene_permiso("finanzas", "boletas:eliminar") is False


def test_finanzas_no_ve_auditoria():
    assert tiene_permiso("finanzas", "auditoria:ver") is False


def test_finanzas_no_gestiona_usuarios():
    assert tiene_permiso("finanzas", "usuarios:gestionar") is False


# ================================================================
# Casos borde
# ================================================================
def test_rol_none():
    assert tiene_permiso(None, "boletas:subir") is False


def test_rol_vacio():
    assert tiene_permiso("", "boletas:subir") is False


def test_rol_inexistente():
    assert tiene_permiso("supervisor", "boletas:subir") is False


def test_permiso_inexistente():
    assert tiene_permiso("admin", "permiso:inventado") is False