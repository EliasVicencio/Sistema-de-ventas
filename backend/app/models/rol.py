from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.asociaciones import usuarios_roles, roles_permisos


class Rol(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    descripcion: Mapped[str | None] = mapped_column(String(255), nullable=True)

    usuarios: Mapped[list["Usuario"]] = relationship(
        secondary=usuarios_roles, back_populates="roles"
    )
    permisos: Mapped[list["Permiso"]] = relationship(
        secondary=roles_permisos, back_populates="roles", lazy="selectin"
    )

    def __repr__(self):
        return f"<Rol {self.nombre}>"