
<h1 align="center">CannaGest</h1>

<p align="center">
  <strong>Sistema de escritorio para la gestión integral de cooperativas cannábicas</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.1-lime" alt="Version" />
  <img src="https://img.shields.io/badge/electron-40-blue" alt="Electron" />
  <img src="https://img.shields.io/badge/react-18-61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/typescript-5.5-3178C6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/license-Source%20Available-yellow" alt="License" />
</p>

---

## Acerca de

CannaGest es una aplicación de escritorio multiplataforma diseñada para la gestión completa de cooperativas cannábicas. Desarrollada con Electron y React, ofrece una interfaz moderna con un tema oscuro urbano y permite gestionar socios, inventario, ventas por puntos, cajas registradoras y gastos operativos, todo con cifrado de extremo a extremo para los datos sensibles.

## Funcionalidades

### Gestión de socios
- Alta, baja y modificación de socios con datos personales cifrados (DNI, email, teléfono, dirección)
- Sistema de membresías: sin cuota, mensual o anual
- Balance de puntos individual y historial de transacciones
- Sistema de referidos entre socios
- Soporte NFC para identificación por tarjeta

### Sistema de puntos
- Economía interna basada en puntos como moneda de intercambio
- Carga manual de puntos con trazabilidad completa
- Ajustes y devoluciones con registro de movimientos
- Historial detallado por socio

### Inventario y productos
- Catálogo de productos organizados por categorías
- Control de stock con alertas de stock mínimo
- Registro de movimientos de stock (entradas, ajustes, ventas)
- Precios definidos en puntos

### Punto de venta (TPV)
- Interfaz de venta con selección de socio y productos
- Cálculo automático de puntos y validación de saldo
- Historial de ventas con filtros avanzados
- Soporte para devoluciones

### Caja registradora
- Apertura y cierre de caja con arqueo
- Seguimiento de efectivo inicial, ventas y gastos
- Cálculo de diferencias para auditoría
- Asociación de ventas y gastos a la caja activa

### Gastos operativos
- Registro de gastos por categoría
- Vinculación con la caja registradora activa
- Historial completo con filtros

### Administración
- Gestión de usuarios (administradores y empleados)
- Control de acceso basado en roles
- Configuración de ratio de puntos y contraseña maestra
- Exportación de datos a Excel y PDF

### Seguridad
- Cifrado AES-256-GCM para campos sensibles de socios
- Hashing de contraseñas con bcryptjs (12 rondas)
- Contraseña maestra opcional para cifrado de la base de datos en reposo
- Copias de seguridad locales y en la nube con programación automática

## Stack tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | React 18, TypeScript 5.5, Tailwind CSS v4, Zustand v5, React Hook Form v7, React Router v7 |
| **Backend** | Electron 40, Node.js, Prisma ORM 5, SQLite |
| **Seguridad** | AES-256-GCM, bcryptjs, electron-store |
| **Build** | Vite 7, vite-plugin-electron, electron-builder |
| **Exportación** | xlsx, jspdf |
| **Iconos** | lucide-react |

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer (React)                      │
│  Pages ─► Components ─► Zustand Stores ─► window.api    │
└──────────────────────────┬──────────────────────────────┘
                           │ contextBridge (IPC)
┌──────────────────────────▼──────────────────────────────┐
│                   Main Process (Electron)                 │
│  IPC Handlers ─► Services (Zod validation) ─► Prisma     │
└──────────────────────────┬──────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   SQLite    │
                    │  (cifrado)  │
                    └─────────────┘
```

## Requisitos previos

- **Node.js** >= 18
- **npm** >= 9

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/Memory-Catcher/cannagest.git
cd cannagest

# Instalar dependencias
npm install

# Generar el cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# (Opcional) Poblar la base de datos con datos iniciales
npm run prisma:seed
```

## Uso

### Desarrollo

```bash
# Iniciar la aplicación en modo desarrollo con hot reload
npm run electron:dev
```

### Compilación

```bash
# Compilar TypeScript y construir la aplicación
npm run build

# Empaquetar como instalador (Windows NSIS)
npm run electron:build
```

El instalador se genera en la carpeta `release/`.

### Base de datos

```bash
# Crear y aplicar migraciones
npm run prisma:migrate

# Regenerar tipos del cliente Prisma
npm run prisma:generate

# Poblar datos iniciales (admin + categorías)
npm run prisma:seed

# Inspector visual de base de datos
npm run prisma:studio
```

## Credenciales por defecto

Tras ejecutar el seed, se crea un usuario administrador:

| Campo | Valor |
|-------|-------|
| Usuario | `admin` |
| Contraseña | `admin123` |

> **Importante**: Cambia estas credenciales tras el primer inicio de sesión.

## Modelo de datos

La aplicación gestiona las siguientes entidades principales:

```
User (Usuarios)          ─── Empleados y administradores del sistema
Member (Socios)          ─── Miembros de la cooperativa con datos cifrados
Category (Categorías)    ─── Clasificación de productos
Product (Productos)      ─── Catálogo con precios en puntos y control de stock
Sale / SaleItem          ─── Ventas y líneas de detalle
PointsTransaction        ─── Libro mayor de movimientos de puntos
StockMovement            ─── Registro de entradas y ajustes de inventario
CashRegister             ─── Apertura/cierre de caja con arqueo
Expense (Gastos)         ─── Gastos operativos vinculados a caja
MembershipPayment        ─── Pagos de cuotas de membresía
```

## Estructura del proyecto

```
cannagest/
├── electron/                  # Proceso principal de Electron
│   ├── main.ts                # Bootstrap: DB → IPC → Window
│   ├── preload.ts             # API expuesta al renderer (contextBridge)
│   ├── ipc/                   # Handlers IPC por dominio
│   ├── services/              # Lógica de negocio + validación Zod
│   ├── database/              # Cliente Prisma singleton
│   ├── utils/                 # Cifrado, claves, backups, logger
│   └── types/                 # Tipos IPC compartidos
├── src/                       # Frontend React
│   ├── pages/                 # Páginas de la aplicación
│   ├── components/
│   │   ├── ui/                # Componentes reutilizables
│   │   └── layout/            # Layout y sidebar
│   ├── store/                 # Stores Zustand
│   ├── services/              # Wrapper de llamadas IPC
│   ├── types/                 # Tipos del frontend
│   └── App.tsx                # Rutas y protección de acceso
├── prisma/
│   ├── schema.prisma          # Esquema de la base de datos
│   ├── migrations/            # Historial de migraciones
│   └── seed.ts                # Script de datos iniciales
├── shared/                    # Constantes y tipos compartidos
├── scripts/                   # Scripts de build (afterPack)
└── public/                    # Assets estáticos
```

## Contribuir

Las contribuciones son bienvenidas. Al enviar un pull request, aceptas ceder al autor una licencia perpetua para usar, modificar y distribuir tu contribución como parte del software (ver sección 5 de la [licencia](./LICENSE)).

### Para contribuir

1. Haz un fork del repositorio
2. Crea una rama para tu funcionalidad (`git checkout -b feature/mi-funcionalidad`)
3. Realiza tus cambios y haz commit (`git commit -m "feat: descripción del cambio"`)
4. Sube la rama (`git push origin feature/mi-funcionalidad`)
5. Abre un Pull Request

## Licencia

Este software se distribuye bajo la **CannaGest Source Available License v1.0**.

| Permitido | No permitido |
|-----------|--------------|
| Consultar y estudiar el código | Vender o distribuir comercialmente |
| Uso personal, educativo o interno | Ofrecer como SaaS o servicio de pago |
| Modificar y crear derivados (uso no comercial) | Uso comercial sin autorización |
| Redistribuir con licencia y atribución | Sublicenciar |

Para uso comercial, contacta con **Abraham Leiro** — [abraham@cpsoftware.es](mailto:abraham@cpsoftware.es)

Consulta el archivo [LICENSE](./LICENSE) para los términos completos.

---

<p align="center">
  Copyright &copy; 2026 Abraham Leiro. Todos los derechos reservados.
</p>
