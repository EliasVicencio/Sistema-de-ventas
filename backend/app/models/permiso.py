from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.asociaciones import roles_permisos


class Permiso(Base):
    __tablename__ = "permisos"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    descripcion: Mapped[str | None] = mapped_column(String(255), nullable=True)

    roles: Mapped[list["Rol"]] = relationship(
        secondary=roles_permisos, back_populates="permisos"
    )

    def __repr__(self):
        return f"<Permiso {self.codigo}>"