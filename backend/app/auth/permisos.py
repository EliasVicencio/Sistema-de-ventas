"""Define los permisos por rol (hardcodeado para simplicidad)."""

PERMISOS_POR_ROL = {
    "cargador": [
        "boletas:subir",
        "boletas:ver_propias",
    ],
    "supervisor": [
        "boletas:subir",
        "boletas:ver_propias",
        "boletas:ver_todas",
        "boletas:eliminar",
        "reportes:generar",
    ],
    "admin": [
        "boletas:subir",
        "boletas:ver_propias",
        "boletas:ver_todas",
        "boletas:eliminar",
        "reportes:generar",
        "usuarios:gestionar",
        "auditoria:ver",
    ],
}


def tiene_permiso(rol: str | None, permiso: str) -> bool:
    if not rol:
        return False
    return permiso in PERMISOS_POR_ROL.get(rol, [])