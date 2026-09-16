import json
from unittest.mock import MagicMock
from app.servicios.auditoria import registrar


def test_registrar_serializa_dict_a_json():
    """El detalle (dict) debe convertirse a string JSON antes del insert."""
    db_mock = MagicMock()

    registrar(
        db_mock,
        usuario_id="abc-123",
        accion="boletas:subir",
        detalle={"aceptadas": 5, "rechazadas": 2},
    )

    # Verificar que se llamó a db.execute
    assert db_mock.execute.called

    # Obtener los parámetros que se pasaron
    args, kwargs = db_mock.execute.call_args
    params = args[1]

    # El detalle debe ser un string JSON, no un dict
    assert isinstance(params["detalle"], str)

    # Y debe ser parseable de vuelta
    detalle_recuperado = json.loads(params["detalle"])
    assert detalle_recuperado == {"aceptadas": 5, "rechazadas": 2}


def test_registrar_sin_detalle():
    """Si detalle es None, debe pasar None (no 'null' string)."""
    db_mock = MagicMock()

    registrar(
        db_mock,
        usuario_id="abc-123",
        accion="login",
        detalle=None,
    )

    args, kwargs = db_mock.execute.call_args
    params = args[1]
    assert params["detalle"] is None


def test_registrar_hace_commit():
    db_mock = MagicMock()
    registrar(db_mock, "abc-123", "test", {"foo": "bar"})
    assert db_mock.commit.called


def test_registrar_incluye_accion():
    db_mock = MagicMock()
    registrar(db_mock, "abc-123", "boletas:subir", {})
    args, kwargs = db_mock.execute.call_args
    params = args[1]
    assert params["accion"] == "boletas:subir"


def test_registrar_incluye_usuario():
    db_mock = MagicMock()
    registrar(db_mock, "user-xyz", "test", {})
    args, kwargs = db_mock.execute.call_args
    params = args[1]
    assert params["usuario_id"] == "user-xyz"


def test_registrar_ip_opcional():
    db_mock = MagicMock()
    registrar(db_mock, "user", "test", {}, ip="1.2.3.4")
    args, kwargs = db_mock.execute.call_args
    params = args[1]
    assert params["ip"] == "1.2.3.4"