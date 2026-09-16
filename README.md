# Sistema de Ventas

> Sistema de gestión de ventas con autenticación, RBAC, reportes y auditoría. Construido con React, FastAPI y Supabase, desplegado como monorepo en Vercel.

[![Tests](https://github.com/EliasVicencio/Sistema-de-ventas/actions/workflows/tests.yml/badge.svg)](https://github.com/EliasVicencio/Sistema-de-ventas/actions/workflows/tests.yml)
[![Deploy](https://img.shields.io/badge/deploy-vercel-black?logo=vercel)](https://sistema-de-ventas-bay.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)

## 📸 Screenshots

| Login | Dashboard |
|:---:|:---:|
| ![Login](docs/screenshots/login.png) | ![Dashboard](docs/screenshots/dashboard.png) |

| Reportes | Modo oscuro |
|:---:|:---:|
| ![Reportes](docs/screenshots/reportes.png) | ![Dark mode](docs/screenshots/dark-mode.png) |

## 🚀 Demo

- **URL**: https://sistema-de-ventas-bay.vercel.app/
- **Usuario**: `admin@ventas.com`
- **Contraseña**: `admin123`

> El usuario demo tiene permisos de administrador para que puedas probar todas las funcionalidades.

## ✨ Features

### 🔐 Autenticación y permisos
- Autenticación con **Supabase Auth** usando **JWT firmado en ES256**.
- Validación de tokens contra **JWKS público** (sin almacenar secretos compartidos).
- **RBAC** (Role-Based Access Control) con 3 roles y 7 permisos granulares.
- Rate limiting por IP con middleware personalizado.
- Sesión persistente con renovación automática de tokens.

### 📄 Gestión de documentos
- **Carga masiva** de boletas y facturas vía CSV.
- Validaciones robustas: encoding (UTF-8 y Latin-1), duplicados, tipos de datos y reglas de negocio.
- Soporte para **boletas** y **facturas** con tipo de documento.
- **5 métodos de pago**: efectivo, débito, crédito, transferencia y vale vista.
- Detección de duplicados y reporte detallado de errores por fila.
- **Paginación** y filtros (cliente, fecha, tipo, método de pago).

### 📊 Reportes y analítica
- **Dashboard** con métricas del mes: boletas, ventas totales, pendientes y producto más vendido.
- **Gráficos interactivos** con Recharts (torta por producto, barras por mes).
- **Exportación a Excel** con formato empresarial:
  - 6 hojas: Resumen, Ventas, Por día, Por producto, Por método, Por tipo.
  - **Gráficos nativos de Excel** (torta, barras verticales, ranking horizontal).
  - Formato condicional, monedas y fórmulas.
- Estadísticas por rango de fechas.

### 📋 Auditoría
- Registro completo de acciones sensibles (subidas, eliminaciones, reportes).
- **Filtros por rango de fechas**.
- **Exportación a CSV** con filtros aplicados.
- Paginación con metadata.

### 🎨 Interfaz
- **Modo oscuro / claro** con persistencia en `localStorage` y detección del sistema.
- Diseño responsive con sidebar adaptativo.
- Sistema de notificaciones (toasts) para feedback de usuario.
- Componentes reutilizables y consistentes.

## 🛠 Stack técnico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18, Vite, React Router, Recharts |
| **Backend** | FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| **Base de datos** | PostgreSQL (Supabase) |
| **Autenticación** | Supabase Auth (JWT ES256 + JWKS) |
| **Migraciones** | Alembic |
| **Excel** | openpyxl |
| **Testing** | pytest, pytest-asyncio |
| **CI/CD** | GitHub Actions |
| **Deploy** | Vercel (monorepo con `services`) |

## 🏗 Arquitectura

```mermaid
graph LR
    A[Usuario] -->|HTTPS| B[React SPA<br/>Vercel Edge]
    B -->|JWT| C[FastAPI<br/>Vercel Serverless]
    C -->|SQLAlchemy| D[(PostgreSQL<br/>Supabase)]
    B -->|OAuth2| E[Supabase Auth]
    E -->|JWT ES256| B
    C -->|JWKS| E