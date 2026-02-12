# CannaGest

Sistema de escritorio para la gestion integral de cooperativas cannabicas. Controla socios, inventario, dispensaciones basadas en puntos, caja registradora y gastos operativos desde una sola aplicacion.

## Funcionalidades

- **Gestion de socios** — Alta, baja, edicion y busqueda de socios con cifrado AES-256-GCM de datos sensibles (DNI, email, telefono, direccion, fecha de nacimiento). Sistema de referidos y soporte NFC.
- **Catalogo de productos** — CRUD de productos organizados por categorias (Flores, Extracciones, Comestibles, Accesorios, Otros), codigos SKU, control de stock minimo y alertas.
- **Punto de venta (TPV)** — Dispensaciones basadas en puntos asociados a cada socio. Registro completo de transacciones con detalle de articulos.
- **Sistema de puntos** — Carga, ajuste y consulta de saldo de puntos. Historial de transacciones vinculado a ventas.
- **Inventario** — Entradas de stock, ajustes y trazabilidad de movimientos con snapshots antes/despues.
- **Caja registradora** — Apertura y cierre de caja con arqueo, calculo automatico de diferencias.
- **Gastos** — Registro y categorizacion de gastos operativos.
- **Gestion de usuarios** — Roles admin/empleado, autenticacion con bcrypt, inicio de sesion por NFC.
- **Copias de seguridad** — Backup local y en la nube, restauracion y programacion automatica.
- **Cifrado de base de datos** — Proteccion con contraseña maestra; cifrado/descifrado de la BD al cerrar/abrir la aplicacion.
- **Exportacion** — Generacion de informes en Excel (xlsx) y PDF (jspdf).

## Stack tecnologico

| Capa | Tecnologia |
|------|-----------|
| Escritorio | Electron 40 |
| Frontend | React 18, TypeScript 5.5, Vite 5 |
| Estilos | Tailwind CSS v4 |
| Routing | React Router v7 (HashRouter) |
| Estado | Zustand v5 |
| Formularios | React Hook Form v7 |
| Validacion | Zod v4 |
| Base de datos | SQLite via Prisma 5 |
| Cifrado | AES-256-GCM (crypto nativo de Node.js) |
| Iconos | lucide-react |
| Empaquetado | electron-builder |

## Requisitos previos

- [Node.js](https://nodejs.org/) >= 18
- npm >= 9

## Instalacion

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd cannagest

# Instalar dependencias
npm install

# Generar el cliente Prisma
npm run prisma:generate

# Ejecutar migraciones de base de datos
npm run prisma:migrate

# (Opcional) Poblar con datos iniciales
npm run prisma:seed
```

## Uso

### Desarrollo

```bash
# Aplicacion Electron completa con hot reload
npm run electron:dev

# Solo el servidor Vite (renderer)
npm run dev
```

### Produccion

```bash
# Compilar renderer (TypeScript + Vite)
npm run build

# Empaquetar aplicacion con electron-builder → release/
npm run electron:build
```

### Base de datos

```bash
npm run prisma:generate   # Regenerar tipos del cliente Prisma
npm run prisma:migrate    # Ejecutar migraciones pendientes
npm run prisma:seed       # Poblar BD (admin + categorias por defecto)
npm run prisma:studio     # Inspector visual de la base de datos
```

## Datos de semilla

Al ejecutar `npm run prisma:seed` se crean:

| Dato | Valor |
|------|-------|
| Usuario admin | `admin` / `admin123` |
| Categorias | Flores, Extracciones, Comestibles, Accesorios, Otros |

> Cambia la contraseña del administrador despues del primer inicio de sesion.

## Arquitectura

```
Renderer (React + Zustand)
  → window.api (contextBridge)
    → ipcRenderer.invoke(channel, ...args)
      → IPC Handlers (electron/ipc/*.ipc.ts)
        → Services (electron/services/*.service.ts)
          → Prisma Client (singleton)
            → SQLite
```

### Estructura del proyecto

```
cannagest/
├── electron/
│   ├── main.ts                 # Proceso principal y bootstrap
│   ├── preload.ts              # contextBridge → window.api
│   ├── database/
│   │   └── client.ts           # Singleton de Prisma
│   ├── ipc/                    # Handlers IPC (auth, member, product, sale...)
│   ├── services/               # Logica de negocio + validacion Zod
│   ├── types/
│   │   └── ipc.types.ts        # IpcResponse<T>, ok(), fail()
│   └── utils/                  # Cifrado, claves, logger, settings
├── src/
│   ├── App.tsx                 # Rutas (HashRouter)
│   ├── main.tsx                # Punto de entrada React
│   ├── components/
│   │   ├── layout/             # AppLayout, Sidebar
│   │   └── ui/                 # Button, Input, Modal, DataTable, Badge...
│   ├── pages/                  # 20 paginas (dashboard, members, products, sales...)
│   ├── services/
│   │   └── api.ts              # Wrapper call<T>() para IPC
│   ├── store/                  # Zustand stores (auth, toast, setup, cloud)
│   ├── styles/
│   │   └── globals.css         # Tailwind v4 imports
│   └── types/
│       └── api.types.ts        # Interfaces TypeScript
├── prisma/
│   └── schema.prisma           # 11 modelos (User, Member, Product, Sale...)
├── shared/                     # Utilidades compartidas
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Secuencia de arranque

1. `registerSetupHandlers()` — Handlers del asistente de configuracion inicial
2. Verificacion de base de datos existente
3. Si existe contraseña maestra → pantalla de desbloqueo
4. `initializePrisma()` → `registerAllHandlers()` → `startAutoBackup()`
5. `createWindow()` — Ventana Electron (1200x800)

### Convenciones IPC

- Los canales siguen el patron `dominio:accion` (ej. `member:getAll`, `sale:create`)
- Todos los handlers retornan `IpcResponse<T>` usando `ok(data)` / `fail(message)`
- `handleIpc()` envuelve handlers con manejo automatico de errores Zod
- El frontend consume via `window.api.dominio.accion(...)`, desenvuelto con `call<T>()`

### Modelo de datos

```
User ──────────┐
               ├── Sale ── SaleItem ── Product ── Category
Member ────────┤                          │
  │            │                     StockMovement
  ├── PointsTransaction
  └── MembershipPayment    CashRegister
                            Expense
```

**11 modelos**: User, Member, MembershipPayment, PointsTransaction, Category, Product, StockMovement, Sale, SaleItem, CashRegister, Expense.

## Seguridad

- **Cifrado de campos**: DNI, email, telefono, direccion y fecha de nacimiento de socios se cifran con AES-256-GCM antes de almacenarse.
- **contraseña maestra**: Opcionalmente protege el acceso a la base de datos completa.
- **Hashing de contraseñas**: bcryptjs con 12 rondas de salt.
- **Almacenamiento de claves**: Las claves de cifrado se gestionan via `electron-store` con aislamiento por usuario del sistema operativo.
- **Aislamiento de contexto**: El preload usa `contextIsolation: true` y solo expone metodos especificos via `contextBridge`.

## Tema visual

Estetica oscura urbana con acentos neon:

- **Fondo**: `zinc-950` (pagina), `zinc-900` (tarjetas), `zinc-800` (inputs)
- **Acento principal**: `lime-400` (botones, focus rings, badges)
- **Texto**: `zinc-100` (primario), `zinc-400` (secundario)
- **Badges**: `font-mono tracking-widest` con fondos neon semitransparentes

## Licencia

Este proyecto es privado y de uso interno.
