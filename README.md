# web-gv — Frontend RH (Vite + React + TS)

[![CI](https://img.shields.io/github/actions/workflow/status/<tu-usuario>/web-gv/ci.yml?label=CI)](https://github.com/<tu-usuario>/web-gv/actions)
![Vite](https://img.shields.io/badge/Vite-React%20TS-646CFF?logo=vite)
![MUI](https://img.shields.io/badge/MUI-6.x-007FFF?logo=mui)
![TanStack Query](https://img.shields.io/badge/TanStack%20Query-v5-FF4154)
![License](https://img.shields.io/badge/license-MIT-green)

Frontend para el sistema de **Recursos Humanos (GV RH)**.  
Stack: **Vite + React + TypeScript + MUI + React Router + TanStack Query + Axios (JWT refresh)**.

## ✨ Features
- **Autenticación JWT** (login, refresh token, Axios interceptors)
- **Rutas protegidas** y **guard** por roles
- **Empleados** con DataGrid:
  - Paginación / ordenamiento / búsqueda **server-side**
  - Filtros por **Departamento / Puesto / Estatus**
  - Exportación **Excel (servidor)**, **CSV** y **PDF** (cliente)
  - Toolbar responsive (botones compactos en mobile)
- Tipado **TypeScript** estricto y MUI v6

## 🧱 Estructura
src/
api/ # axios client, auth helpers
app/ # router, provider
components/ # layout, ui
context/ # AuthContext
features/
auth/
empleados/ # EmpleadosPage.tsx, api.ts, types.ts
pages/ # Dashboard
types/ # tipos globales (auth, etc.)


## ⚙️ Variables de entorno
Crea `.env.local` con base en `.env.example`:

```bash
VITE_API_URL=http://localhost:8000/api
VITE_JWT_LOGIN=/auth/jwt/create/
VITE_JWT_REFRESH=/auth/jwt/refresh/
VITE_EMPLEADOS=/v1/empleados/
VITE_DEPARTAMENTOS=/v1/departamentos/
VITE_PUESTOS=/v1/puestos/

🚀 Scripts

npm i              # instalar deps
npm run dev        # ambiente dev (http://localhost:5173)
npm run build      # build producción
npm run preview    # servir build local

Backend esperado (Django DRF)

JWT: /api/auth/jwt/create/, /api/auth/jwt/refresh/

Empleados: /api/v1/empleados/ (paginado DRF)

Catálogos: /api/v1/departamentos/, /api/v1/puestos/

Export: /api/v1/empleados/export/excel/

🔒 Seguridad

No subas .env*.

Tokens en localStorage; ajusta a cookies httpOnly si tu backend lo soporta.

Habilita CORS en Django para el origen del front.

🧪 Calidad (opcional)

ESLint + Prettier + Husky + lint-staged (ver sección “Roadmap”).

🗺️ Roadmap

Edición/alta de empleados

Catálogos CRUD

Exportaciones avanzadas (columnas dinámicas)

Tests (unit/e2e)

📄 Licencia

MIT © 2025 GV

