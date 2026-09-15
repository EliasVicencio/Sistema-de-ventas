import json
from sqlalchemy.orm import Session
from sqlalchemy import text


def registrar(
    db: Session,
    usuario_id: str | None,
    accion: str,
    detalle: dict | None = None,
    ip: str | None = None,
):
    """Inserta un registro de auditoría."""
    db.execute(
        text("""
            INSERT INTO auditoria (usuario_id, accion, detalle, ip)
            VALUES (:usuario_id, :accion, :detalle, :ip)
        """),
        {
            "usuario_id": usuario_id,
            "accion": accion,
            "detalle": json.dumps(detalle) if detalle is not None else None,
            "ip": ip,
        },
    )
    db.commit()