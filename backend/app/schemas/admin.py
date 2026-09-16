from pydantic import BaseModel, EmailStr, Field


class CrearUsuarioRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    rol: str


class CambiarRolRequest(BaseModel):
    rol: str


class CambiarEmailRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    password: str = Field(min_length=6)