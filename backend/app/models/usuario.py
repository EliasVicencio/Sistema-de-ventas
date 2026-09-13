from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.asociaciones import usuarios_roles


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    roles: Mapped[list["Rol"]] = relationship(
        secondary=usuarios_roles, back_populates="usuarios", lazy="selectin"
    )

    @property
    def permisos(self) -> set[str]:
        """Todos los códigos de permiso que tiene el usuario vía sus roles."""
        return {p.codigo for r in self.roles for p in r.permisos}

    def __repr__(self):
        return f"<Usuario {self.username}>"