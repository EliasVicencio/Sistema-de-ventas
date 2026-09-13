from datetime import date, datetime
from sqlalchemy import String, Integer, Numeric, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Boleta(Base):
    __tablename__ = "boletas"

    id: Mapped[int] = mapped_column(primary_key=True)
    numero_boleta: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    fecha: Mapped[date] = mapped_column(Date, index=True)
    cliente: Mapped[str] = mapped_column(String(120))
    producto: Mapped[str] = mapped_column(String(120))
    cantidad: Mapped[int] = mapped_column(Integer)
    precio_unitario: Mapped[float] = mapped_column(Numeric(10, 2))
    total: Mapped[float] = mapped_column(Numeric(10, 2))
    metodo_pago: Mapped[str] = mapped_column(String(20))

    subido_por: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    subido_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    usuario: Mapped["Usuario"] = relationship()

    def __repr__(self):
        return f"<Boleta {self.numero_boleta}>"