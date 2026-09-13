from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.database import SessionLocal
from app.models import Usuario, Rol, Permiso

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


PERMISOS = [
    ("boletas:subir", "Subir boletas al sistema"),
    ("boletas:ver_propias", "Ver las boletas que uno mismo subió"),
    ("boletas:ver_todas", "Ver todas las boletas del sistema"),
    ("boletas:eliminar", "Eliminar boletas"),
    ("reportes:generar", "Generar reportes mensuales"),
    ("usuarios:gestionar", "Crear/editar usuarios y asignar roles"),
    ("auditoria:ver", "Ver el registro de auditoría"),
]

ROLES = {
    "Cargador": [
        "boletas:subir",
        "boletas:ver_propias",
    ],
    "Supervisor": [
        "boletas:subir",
        "boletas:ver_propias",
        "boletas:ver_todas",
        "boletas:eliminar",
        "reportes:generar",
    ],
    "Admin": [
        "boletas:subir",
        "boletas:ver_propias",
        "boletas:ver_todas",
        "boletas:eliminar",
        "reportes:generar",
        "usuarios:gestionar",
        "auditoria:ver",
    ],
}


def get_or_create_permiso(db: Session, codigo: str, descripcion: str) -> Permiso:
    p = db.query(Permiso).filter_by(codigo=codigo).first()
    if not p:
        p = Permiso(codigo=codigo, descripcion=descripcion)
        db.add(p)
        db.flush()
    return p


def get_or_create_rol(db: Session, nombre: str) -> Rol:
    r = db.query(Rol).filter_by(nombre=nombre).first()
    if not r:
        r = Rol(nombre=nombre, descripcion=f"Rol {nombre}")
        db.add(r)
        db.flush()
    return r


def get_or_create_usuario(db: Session, username: str, email: str, password: str, roles: list[Rol]) -> Usuario:
    u = db.query(Usuario).filter_by(username=username).first()
    if not u:
        u = Usuario(
            username=username,
            email=email,
            password_hash=pwd_context.hash(password),
            activo=True,
        )
        db.add(u)
        db.flush()
    # Asegurar roles (sin duplicar)
    for rol in roles:
        if rol not in u.roles:
            u.roles.append(rol)
    return u


def seed():
    db = SessionLocal()
    try:
        # 1. Permisos
        permisos = {cod: get_or_create_permiso(db, cod, desc)
                    for cod, desc in PERMISOS}

        # 2. Roles con sus permisos
        roles = {}
        for nombre_rol, codigos in ROLES.items():
            rol = get_or_create_rol(db, nombre_rol)
            for cod in codigos:
                if permisos[cod] not in rol.permisos:
                    rol.permisos.append(permisos[cod])
            roles[nombre_rol] = rol

        # 3. Usuarios iniciales
        get_or_create_usuario(
            db, "admin", "admin@sistema.local", "admin123",
            roles=[roles["Admin"]],
        )
        get_or_create_usuario(
            db, "supervisor", "supervisor@sistema.local", "super123",
            roles=[roles["Supervisor"]],
        )
        get_or_create_usuario(
            db, "cargador", "cargador@sistema.local", "carga123",
            roles=[roles["Cargador"]],
        )

        db.commit()
        print("Seed completado.")
        print("Usuarios: admin/admin123, supervisor/super123, cargador/carga123")
    except Exception as e:
        db.rollback()
        print(f"Error en seed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()