from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
from datetime import date
from xhtml2pdf import pisa
import io

from app.auth.dependencias import requiere_permiso

router = APIRouter(prefix="/dte", tags=["dte"])

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))


class ItemDTE(BaseModel):
    nombre: str
    cantidad: int
    precio_unitario: float


class EmitirDTEPruebaRequest(BaseModel):
    cliente_nombre: str
    cliente_rut: str
    items: list[ItemDTE]


@router.post("/emitir-prueba")
async def emitir_dte_prueba(
    body: EmitirDTEPruebaRequest,
    usuario: dict = Depends(requiere_permiso("boletas:subir")),
):
    """Genera un DTE ficticio (PDF) para pruebas."""

    emisor_rut = "76192083-9"
    emisor_nombre = "SASCO SpA"
    emisor_giro = "Servicios de prueba"
    emisor_direccion = "Av. Providencia 1234, Santiago"

    # Calcular totales (los precios vienen netos)
    neto = sum(item.cantidad * item.precio_unitario for item in body.items)
    iva = round(neto * 0.19, 2)
    total = round(neto + iva, 2)

    folio = 1
    fecha = date.today().strftime("%d/%m/%Y")

    # Renderizar HTML
    template = env.get_template("dte.html")
    html_content = template.render(
        emisor_rut=emisor_rut,
        emisor_nombre=emisor_nombre,
        emisor_giro=emisor_giro,
        emisor_direccion=emisor_direccion,
        cliente_nombre=body.cliente_nombre,
        cliente_rut=body.cliente_rut,
        items=[item.model_dump() for item in body.items],
        neto=neto,
        iva=iva,
        total=total,
        folio=folio,
        fecha=fecha,
    )

    # Convertir HTML a PDF con xhtml2pdf
    pdf_buffer = io.BytesIO()
    pisa_status = pisa.CreatePDF(html_content, dest=pdf_buffer)

    if pisa_status.err:
        raise HTTPException(500, "Error al generar el PDF")

    pdf_buffer.seek(0)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=factura_prueba.pdf"},
    )