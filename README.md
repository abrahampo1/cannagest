# CannaGest

Sistema de escritorio para la gestión integral de cooperativas cannábicas. Gestiona socios, inventario, ventas por puntos, cajas registradoras y gastos operativos.

## Stack tecnológico

- **Frontend**: React 18, TypeScript, Tailwind CSS v4, Zustand, React Hook Form
- **Backend**: Electron 40, Prisma ORM, SQLite
- **Seguridad**: Cifrado AES-256-GCM para datos sensibles, bcryptjs para hashing de contraseñas

## Requisitos previos

- Node.js >= 18
- npm >= 9

## Instalación

```bash
git clone https://github.com/tu-usuario/cannagest.git
cd cannagest
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
```

## Desarrollo

```bash
npm run electron:dev
```

## Compilación

```bash
npm run build
npm run electron:build
```

## Licencia

Este software se distribuye bajo la **CannaGest Source Available License v1.0**, una licencia de código abierto con restricción comercial.

### Lo que puedes hacer

- Consultar, estudiar y aprender del código fuente
- Instalar y usar el software para uso personal, educativo o interno
- Modificar el código y crear trabajos derivados para uso no comercial
- Redistribuir el código fuente manteniendo la licencia y la atribución

### Lo que NO puedes hacer

- Vender, revender o distribuir comercialmente el software
- Ofrecer el software como servicio (SaaS) o producto de pago
- Utilizar el software o derivados con fines comerciales sin autorización

### Uso comercial

Los derechos comerciales están reservados exclusivamente al autor. Si deseas utilizar CannaGest con fines comerciales, contacta con:

**Abraham Leiro** — [abraham@cpsoftware.es](mailto:abraham@cpsoftware.es)

Consulta el archivo [LICENSE](./LICENSE) para los términos completos.

---

Copyright (c) 2026 Abraham Leiro. Todos los derechos reservados.
