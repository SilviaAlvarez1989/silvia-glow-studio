# Silvia Glow Studio LLC — Sistema de Gestión

Sistema completo de reservas y gestión para salón de uñas. Inspirado en Booksy.

## Stack
- **Frontend:** React + Vite + Tailwind CSS v4
- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL
- **Pagos:** Stripe (tarjeta) + efectivo
- **Auth:** JWT

## Estructura
```
silvia-glow/
├── frontend/          # React app (responsive: móvil, tablet, PC)
│   └── src/
│       ├── pages/     # Dashboard, Calendario, Citas, Clientes, Servicios, Empleadas
│       ├── components/
│       ├── context/   # Auth context
│       └── lib/       # axios API client
└── backend/
    └── src/
        ├── controllers/
        ├── routes/
        ├── middleware/
        └── config/    # DB, schema SQL, seed
```

## Setup rápido

### 1. Base de datos
```bash
createdb silvia_glow
psql silvia_glow < backend/src/config/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edita .env con tu DATABASE_URL y JWT_SECRET
npm install
node src/config/seed.js   # carga servicios y usuarios iniciales
node src/index.js
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Credenciales iniciales
- **Manager:** manager@silviaglow.com / manager123
- **Técnica 1:** tech1@silviaglow.com / tech123
- **Técnica 2:** tech2@silviaglow.com / tech123
- **Técnica 3:** tech3@silviaglow.com / tech123

⚠️ Cambia las contraseñas antes de poner en producción.

## Funciones incluidas (Fase 1)
- ✅ Login seguro con roles (manager, técnica)
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Calendario semanal por técnica
- ✅ Crear y gestionar citas
- ✅ Disponibilidad automática por servicio y técnica
- ✅ Registro de clientes con historial
- ✅ Gestión de servicios y precios
- ✅ Gestión de empleadas
- ✅ Control de pagos (efectivo / tarjeta)
- ✅ 27 servicios precargados de Silvia Glow Studio

## Próximas fases
- **Fase 2:** Pagos con Stripe, recordatorios WhatsApp/SMS, historial de ingresos
- **Fase 3:** Multi-salón (para vender a otros salones)
