from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
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
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
    cliente: str | None = Query(None),
    usuario: dict = Depends(requiere_permiso("boletas:ver_propias")),
    db: Session = Depends(get_db),
):
    """Boletas del usuario actual con paginación y filtro por cliente."""
    condiciones = ["subido_por = :uid"]
    params = {"uid": usuario["sub"]}

    if cliente:
        condiciones.append("cliente ILIKE :cliente")
        params["cliente"] = f"%{cliente}%"

    where_sql = "WHERE " + " AND ".join(condiciones)

    total = db.execute(
        text(f"SELECT COUNT(*) FROM boletas {where_sql}"),
        params,
    ).scalar()

    offset = (pagina - 1) * por_pagina

    result = db.execute(
        text(f"""
            SELECT id, numero_boleta, fecha, cliente, producto,
                   cantidad, precio_unitario, descuento, total,
                   metodo_pago, canal_venta, estado, subido_en
            FROM boletas
            {where_sql}
            ORDER BY subido_en DESC
            LIMIT :limite OFFSET :offset
        """),
        {**params, "limite": por_pagina, "offset": offset},
    )

    items = [dict(r._mapping) for r in result]
    total_paginas = (total + por_pagina - 1) // por_pagina if total > 0 else 1

    return {
        "items": items,
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "total_paginas": total_paginas,
    }


@router.get("")
def todas_boletas(
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
    cliente: str | None = Query(None),
    desde: str | None = Query(None, description="YYYY-MM-DD"),
    hasta: str | None = Query(None, description="YYYY-MM-DD"),
    usuario: dict = Depends(requiere_permiso("boletas:ver_todas")),
    db: Session = Depends(get_db),
):
    """Todas las boletas con paginación y filtros opcionales."""
    # Construir WHERE dinámico
    condiciones = []
    params = {}

    if cliente:
        condiciones.append("cliente ILIKE :cliente")
        params["cliente"] = f"%{cliente}%"

    if desde:
        condiciones.append("fecha >= CAST(:desde AS date)")
        params["desde"] = desde

    if hasta:
        condiciones.append("fecha < CAST(:hasta AS date) + interval '1 day'")
        params["hasta"] = hasta

    where_sql = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""

    # Total de registros (para calcular total de páginas)
    total = db.execute(
        text(f"SELECT COUNT(*) FROM boletas {where_sql}"),
        params,
    ).scalar()

    # Offset
    offset = (pagina - 1) * por_pagina

    # Query paginada
    result = db.execute(
        text(f"""
            SELECT id, numero_boleta, fecha, cliente, producto,
                   cantidad, precio_unitario, descuento, total,
                   metodo_pago, canal_venta, estado,
                   subido_por, subido_en
            FROM boletas
            {where_sql}
            ORDER BY subido_en DESC
            LIMIT :limite OFFSET :offset
        """),
        {**params, "limite": por_pagina, "offset": offset},
    )

    items = [dict(r._mapping) for r in result]
    total_paginas = (total + por_pagina - 1) // por_pagina if total > 0 else 1

    return {
        "items": items,
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "total_paginas": total_paginas,
    }


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