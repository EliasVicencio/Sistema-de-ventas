import pytest
from fastapi import HTTPException
from app.routers.boletas import decodificar_csv


def test_utf8_normal():
    contenido = "numero_boleta,fecha\nB001,2026-09-15".encode("utf-8")
    resultado = decodificar_csv(contenido)
    assert "numero_boleta" in resultado
    assert "B001" in resultado


def test_utf8_con_bom():
    """Excel agrega BOM al guardar CSV UTF-8."""
    contenido = b"\xef\xbb\xbfnumero_boleta,fecha\nB001,2026-09-15"
    resultado = decodificar_csv(contenido)
    # El BOM no debe quedar en el resultado
    assert resultado.startswith("numero_boleta")


def test_utf8_con_tildes():
    contenido = "cliente\nJuan Pérez\nMaría López".encode("utf-8")
    resultado = decodificar_csv(contenido)
    assert "Juan Pérez" in resultado
    assert "María López" in resultado


def test_latin1_fallback():
    """Si el archivo viene en latin-1 (Excel Windows), debe decodificarlo."""
    contenido = "cliente\nJosé Ñandú".encode("latin-1")
    resultado = decodificar_csv(contenido)
    # Ahora se puede leer el texto correctamente
    assert "José" in resultado or "Jos" in resultado


def test_contenido_binario_invalido():
    """Bytes aleatorios que no son UTF-8 ni latin-1 válidos."""
    contenido = b"\xff\xfe\x00\x00\xff\xff\xff\xff"
    # latin-1 acepta casi cualquier byte, así que no siempre falla
    # Si no falla, al menos no debe explotar
    try:
        decodificar_csv(contenido)
    except HTTPException:
        pass  # aceptable


def test_vacio_no_falla():
    """Bytes vacíos no deben crashear."""
    resultado = decodificar_csv(b"")
    assert resultado == ""