from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
import csv
import io

from app.database import get_db
from app.auth.dependencias import requiere_permiso
from app.servicios.validaciones import validar_boleta
from app.servicios.auditoria import registrar

router = APIRouter(prefix="/boletas", tags=["boletas"])


def decodificar_csv(contenido: bytes) -> str:
    """Intenta decodificar el CSV en UTF-8 (con o sin BOM) o latin-1 como fallback."""
    try:
        return contenido.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            return contenido.decode("latin-1")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400,
                detail="El archivo no se pudo leer. Guárdalo como CSV UTF-8 e inténtalo de nuevo.",
            )


@router.post("/subir")
async def subir_boletas(
    archivo: UploadFile = File(...),
    usuario: dict = Depends(requiere_permiso("boletas:subir")),
    db: Session = Depends(get_db),
):
    """Sube un CSV de boletas. Valida cada fila."""
    contenido = await archivo.read()

    if not contenido:
        raise HTTPException(400, "El archivo está vacío")

    texto = decodificar_csv(contenido)
    lector = csv.DictReader(io.StringIO(texto))

    aceptadas = []
    rechazadas = []

    for fila_num, fila in enumerate(lector, start=2):
        boleta, error = validar_boleta(fila)

        if error:
            rechazadas.append({"fila": fila_num, "motivo": error})
            continue

        existe = db.execute(
            text("SELECT 1 FROM boletas WHERE numero_boleta = :num"),
            {"num": boleta["numero_boleta"]},
        ).fetchone()

        if existe:
            rechazadas.append({"fila": fila_num, "motivo": "boleta duplicada"})
            continue

        db.execute(
            text("""
                INSERT INTO boletas
                (numero_boleta, fecha, cliente, producto, cantidad,
                 precio_unitario, descuento, total, metodo_pago,
                 canal_venta, estado, subido_por)
                VALUES (:numero_boleta, :fecha, :cliente, :producto, :cantidad,
                        :precio_unitario, :descuento, :total, :metodo_pago,
                        :canal_venta, :estado, :subido_por)
            """),
            {
                **boleta,
                "subido_por": usuario["sub"],
            },
        )
        aceptadas.append(boleta["numero_boleta"])

    db.commit()
    registrar(db, usuario["sub"], "boletas:subir", {
        "aceptadas": len(aceptadas),
        "rechazadas": len(rechazadas),
    })

    return {
        "aceptadas": aceptadas,
        "rechazadas": rechazadas,
    }


@router.get("/mias")
def mis_boletas(
    usuario: dict = Depends(requiere_permiso("boletas:ver_propias")),
    db: Session = Depends(get_db),
):
    """Boletas subidas por el usuario actual."""
    result = db.execute(
        text("""
            SELECT id, numero_boleta, fecha, cliente, producto,
                   cantidad, precio_unitario, descuento, total,
                   metodo_pago, canal_venta, estado, subido_en
            FROM boletas
            WHERE subido_por = :uid
            ORDER BY subido_en DESC
        """),
        {"uid": usuario["sub"]},
    )
    return [dict(r._mapping) for r in result]


@router.get("")
def todas_boletas(
    usuario: dict = Depends(requiere_permiso("boletas:ver_todas")),
    db: Session = Depends(get_db),
):
    """Todas las boletas (solo supervisor/admin)."""
    result = db.execute(
        text("""
            SELECT id, numero_boleta, fecha, cliente, producto,
                   cantidad, precio_unitario, descuento, total,
                   metodo_pago, canal_venta, estado,
                   subido_por, subido_en
            FROM boletas
            ORDER BY subido_en DESC
        """)
    )
    return [dict(r._mapping) for r in result]


@router.delete("/{boleta_id}")
def eliminar_boleta(
    boleta_id: int,
    usuario: dict = Depends(requiere_permiso("boletas:eliminar")),
    db: Session = Depends(get_db),
):
    """Elimina una boleta (solo supervisor/admin)."""
    result = db.execute(
        text("DELETE FROM boletas WHERE id = :id RETURNING numero_boleta"),
        {"id": boleta_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(404, "Boleta no encontrada")

    db.commit()
    registrar(db, usuario["sub"], "boletas:eliminar", {"boleta_id": boleta_id})
    return {"ok": True, "numero_boleta": row[0]}