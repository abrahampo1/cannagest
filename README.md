
<h1 align="center">CannaGest</h1>

<p align="center">
  <strong>Cross-platform desktop application for cannabis cooperative management</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.2-lime" alt="Version" />
  <img src="https://img.shields.io/badge/electron-40-blue" alt="Electron" />
  <img src="https://img.shields.io/badge/react-18-61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/typescript-5.5-3178C6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/license-Source%20Available-yellow" alt="License" />
</p>

---

## About

CannaGest is a cross-platform desktop application built with Electron and React, designed for end-to-end management of cannabis cooperatives. It provides a modern dark-themed interface to manage members, inventory, an internal points-based economy, a point-of-sale terminal, cash register operations, and operational expenses — all with **multi-layer encryption** protecting sensitive data at rest and in transit.

---

## Table of Contents

- [Features](#features)
- [Security & Encryption](#security--encryption)
  - [Layer 1: Field-Level Encryption (AES-256-GCM)](#layer-1-field-level-encryption-aes-256-gcm)
  - [Layer 2: Database-at-Rest Encryption (Master Password)](#layer-2-database-at-rest-encryption-master-password)
  - [Layer 3: Backup Encryption](#layer-3-backup-encryption)
  - [Password Hashing (bcrypt)](#password-hashing-bcrypt)
  - [Key Storage Summary](#key-storage-summary)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Default Credentials](#default-credentials)
- [Build & Packaging](#build--packaging)
- [CI/CD](#cicd)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Member Management
- Create, update, and deactivate members with encrypted personal data (national ID, email, phone, address, date of birth)
- Membership tiers: no fee, monthly, or annual subscriptions
- Individual point balance and full transaction history
- Member referral tracking system
- Member expulsion workflow with reason logging and countdown confirmation
- NFC card support for contactless member identification

### Points-Based Economy
- Internal points currency for all cooperative transactions
- Manual point loading with full traceability
- Adjustments and refunds with detailed movement records
- Per-member transaction history and audit trail

### Inventory & Products
- Product catalog organized by categories
- Stock control with configurable minimum-stock alerts
- Stock movement tracking (entries, adjustments, sales)
- Prices defined in points

### Point of Sale (POS)
- Sales interface with member selection and product browsing
- Automatic point calculation and balance validation
- Sales history with advanced filters
- Return and refund support

### Cash Register
- Cash drawer open/close with cash reconciliation
- Tracking of opening cash, sales revenue, and expenses
- Discrepancy calculation for audit purposes
- Automatic association of sales and expenses with the active register session

### Operational Expenses
- Categorized expense logging
- Linked to the active cash register session
- Full history with filters

### Administration
- User management with role-based access control (Admin, Manager, Employee)
- NFC-based operator authentication
- Configurable points ratio and master password
- Data export to Excel (`.xlsx`) and PDF

---

## Security & Encryption

CannaGest implements a **defense-in-depth strategy** with three independent encryption layers, ensuring that sensitive data is protected whether stored in the database, exported in backups, or handled in memory.

### Layer 1: Field-Level Encryption (AES-256-GCM)

Sensitive personally identifiable information (PII) is encrypted **at the field level** before being written to the database. This means that even if the SQLite file is accessed directly, individual fields containing personal data are unreadable without the encryption key.

**Encrypted fields:**
| Field | Description |
|-------|-------------|
| `dni` | National ID number |
| `email` | Email address |
| `phone` | Phone number |
| `address` | Physical address |
| `dateOfBirth` | Date of birth |

**Algorithm and parameters:**

| Parameter | Value |
|-----------|-------|
| Algorithm | `AES-256-GCM` (authenticated encryption) |
| Key size | 256 bits (32 bytes) |
| IV (nonce) | 128 bits (16 bytes), randomly generated per encryption operation |
| Auth tag | 128 bits (16 bytes) |

**Ciphertext format:**

Each encrypted field is stored as a colon-separated hex string:

```
<iv_hex>:<authTag_hex>:<ciphertext_hex>
```

For example:
```
a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6:f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6:89abcdef...
|________ 16 bytes IV ________| |_______ 16 bytes tag _______| |_ ciphertext _|
```

**Key lifecycle:**
1. On first application launch, a cryptographically random 32-byte key is generated using `crypto.randomBytes(32)`.
2. The key is persisted (in hex) inside an encrypted `electron-store` file (`secure-keys`) in the OS user data directory.
3. On every subsequent launch, the key is loaded into memory and used for all field encrypt/decrypt operations.
4. The GCM authentication tag ensures both confidentiality and integrity — any tampering with the ciphertext is detected during decryption.

**Why AES-256-GCM?**
GCM (Galois/Counter Mode) provides **authenticated encryption**, meaning it simultaneously encrypts the data and produces an authentication tag. During decryption, the tag is verified before returning plaintext. This prevents both unauthorized reading and undetected modification of encrypted fields.

**Uniqueness enforcement:**
Because a fresh random IV is generated for every encryption call, the same plaintext always produces different ciphertext. This is cryptographically desirable but means database unique indexes (e.g., on `dni`) only enforce uniqueness of encrypted blobs. To check for real plaintext duplicates, the application performs an in-memory comparison by decrypting all existing values — trading performance for correctness.

---

### Layer 2: Database-at-Rest Encryption (Master Password)

This is an **optional but recommended** whole-database encryption layer activated during the initial setup wizard. When enabled, the entire SQLite database file is encrypted on disk and only decrypted into memory while the application is running.

**Setup phase (one-time):**

```
User enters master password (min 8 chars)
         │
         ▼
Generate random 32-byte salt ──► Store salt (hex) in electron-store
         │
         ▼
Derive master key via PBKDF2:
  ┌─────────────────────────────────────────┐
  │  PBKDF2(password, salt,                 │
  │         iterations: 100,000,            │
  │         keyLength: 32 bytes,            │
  │         digest: SHA-512)                │
  └─────────────────────────────────────────┘
         │
         ▼
Encrypt verification token ──────► Store token in electron-store
  (encrypts known string "CANNAGEST_VERIFIED"
   with derived key using AES-256-GCM)
         │
         ▼
Encrypt cannagest.db ──► cannagest.db.enc
Delete plaintext .db, -wal, -shm files
```

**Key derivation parameters:**

| Parameter | Value |
|-----------|-------|
| Algorithm | PBKDF2 |
| Hash function | SHA-512 |
| Iterations | 100,000 |
| Output key length | 256 bits (32 bytes) |
| Salt | 256 bits (32 bytes), randomly generated |

The high iteration count with SHA-512 makes brute-force and dictionary attacks computationally expensive.

**Encrypted database file format (binary):**

```
┌──────────────┬────────────────┬──────────────────────┐
│ IV (16 bytes)│ Tag (16 bytes) │ Encrypted DB (N bytes)│
└──────────────┴────────────────┴──────────────────────┘
```

**Unlock phase (every app launch):**

```
App detects master password is configured
         │
         ▼
Show unlock screen ──► User enters master password
         │
         ▼
Retrieve salt from electron-store
         │
         ▼
Re-derive master key (same PBKDF2 parameters)
         │
         ▼
Decrypt verification token ──► Confirm key is correct
         │                     (without touching the DB file)
         ▼
Decrypt cannagest.db.enc ──► cannagest.db (plaintext, in userData dir)
         │
         ▼
Initialize Prisma ORM ──► Application ready
```

**Shutdown phase (every app close):**

```
app.on('before-quit')
         │
         ▼
Stop auto-backup scheduler
         │
         ▼
Close Prisma (flushes WAL journal)
         │
         ▼
Re-encrypt cannagest.db ──► cannagest.db.enc
         │
         ▼
Delete plaintext files (.db, -wal, -shm, -journal)
         │
         ▼
Zero-fill master key buffer in memory ──► MASTER_KEY.fill(0)
         │
         ▼
Application exits
```

The zero-fill step ensures the master key does not linger in process memory after shutdown, reducing the window for memory-dump attacks.

---

### Layer 3: Backup Encryption

Backup files (`.cgbackup`) are encrypted archives that bundle the database together with the encryption keys needed to read it.

**Backup creation flow:**

```
Close Prisma (flush WAL)
         │
         ▼
Create ZIP archive (compression level 9):
  ├── cannagest.db      ← plaintext database
  └── keys.json         ← { dbKey, fieldKey } from electron-store
         │
         ▼
Encrypt entire ZIP with AES-256-GCM
  (using the master key currently in memory)
         │
         ▼
Compute SHA-256 checksum of encrypted output
         │
         ▼
Write .cgbackup file
  Format: [IV: 16 bytes][Tag: 16 bytes][Encrypted ZIP: N bytes]
         │
         ▼
Re-initialize Prisma
```

**Backup restore flow:**

```
Read .cgbackup file
         │
         ▼
Decrypt with current master key (AES-256-GCM)
         │
         ▼
Extract ZIP to temp directory
         │
         ▼
Validate keys.json contains dbKey and fieldKey
         │
         ▼
Create safety copy of current database
         │
         ▼
Replace cannagest.db with extracted database
         │
         ▼
Import encryption keys from keys.json into electron-store
         │
         ▼
Re-initialize Prisma
```

**Cloud backups:** Encrypted `.cgbackup` files can be automatically uploaded to a configurable cloud server via multipart HTTP POST. The file is uploaded as-is — the server only stores the already-encrypted blob. Authentication uses a bearer token stored locally.

**Why bundle keys inside the backup?**
Each backup is a self-contained snapshot. The field encryption key used to encrypt PII at the time of backup must travel with the data, otherwise restoring a backup on a different machine (with a different field key) would produce garbled member data. Since the backup itself is encrypted with the master key, the bundled keys are never exposed in plaintext.

---

### Password Hashing (bcrypt)

User account passwords (for application staff login) are hashed using **bcryptjs** with a cost factor of **12** (2^12 = 4,096 iterations of the underlying Blowfish cipher):

```
bcrypt.hash(plaintext, 12) → stored hash
bcrypt.compare(plaintext, storedHash) → boolean
```

Passwords are **never stored or transmitted in plaintext**. The `password` field is stripped from all user objects returned to the renderer process.

---

### Key Storage Summary

| Secret | Storage Location | Protection |
|--------|-----------------|------------|
| Field encryption key (32 bytes, hex) | `electron-store` (`secure-keys`) | Encrypted electron-store file |
| Master key | In-memory only | Zero-filled (`Buffer.fill(0)`) on shutdown |
| Master password salt (32 bytes, hex) | `electron-store` (`cannagest-settings`) | Plaintext (non-sensitive — salt is public by design) |
| Verification token | `electron-store` (`cannagest-settings`) | Plaintext (ciphertext of known value) |
| Cloud API token | `electron-store` (`cloud-config`) | Plaintext in electron-store |
| User passwords | SQLite `users` table | bcrypt hash (cost = 12) |

**Storage location by OS:**

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/cannagest/` |
| Windows | `%APPDATA%/cannagest/` |
| Linux | `~/.config/cannagest/` |

---

## Tech Stack

### Frontend

| Concern | Technology |
|---------|-----------|
| UI Framework | React 18 |
| Language | TypeScript 5.5 |
| Styling | Tailwind CSS v4 |
| State Management | Zustand v5 |
| Forms & Validation | React Hook Form v7 + Zod |
| Routing | React Router DOM v7 (HashRouter) |
| Icons | lucide-react |
| Export | xlsx (Excel), jspdf (PDF) |

### Backend (Electron Main Process)

| Concern | Technology |
|---------|-----------|
| Desktop Runtime | Electron 40 |
| ORM | Prisma 5 |
| Database | SQLite (via better-sqlite3) |
| Encryption | Node.js `crypto` (AES-256-GCM, PBKDF2) |
| Password Hashing | bcryptjs (cost factor 12) |
| Persistent Settings | electron-store |
| Backup Compression | archiver (create), adm-zip (extract) |
| Validation | Zod |
| Date Utilities | date-fns v4 |

### Build & Tooling

| Concern | Technology |
|---------|-----------|
| Bundler | Vite 7 + vite-plugin-electron |
| Packager | electron-builder |
| CI/CD | GitHub Actions |

---

## Architecture

CannaGest follows a strict **Electron two-process model** with complete context isolation:

```
┌───────────────────────────────────────────────────────────────┐
│                     Renderer Process (React)                   │
│                                                                │
│   Pages ──► Components ──► Zustand Stores ──► window.api.*    │
│                                                                │
│   • No direct access to Node.js, filesystem, or database      │
│   • All data flows through IPC calls                          │
│   • HashRouter for file:// protocol compatibility             │
└────────────────────────────┬──────────────────────────────────┘
                             │  contextBridge (IPC)
                             │  contextIsolation: true
                             │  nodeIntegration: false
┌────────────────────────────▼──────────────────────────────────┐
│                    Main Process (Electron/Node.js)              │
│                                                                │
│   IPC Handlers ──► Services (Zod validation) ──► Prisma ORM   │
│                         │                                      │
│                    crypto.util.ts                               │
│               (encrypt/decrypt/hash)                           │
└────────────────────────────┬──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │     SQLite      │
                    │                 │
                    │  PII: AES-256   │
                    │  File: .db.enc  │
                    └─────────────────┘
```

**Security boundaries:**
- The renderer process has **zero access** to Node.js APIs, the filesystem, or encryption keys.
- All sensitive operations (encryption, database queries, file I/O) happen exclusively in the main process.
- The preload script exposes only a curated `window.api` object via Electron's `contextBridge`.

---

## Data Model

```
User                    ─── App operators (Admin, Manager, Employee)
    │                       bcrypt-hashed password, optional NFC tag
    │
Member                  ─── Cooperative members with encrypted PII
    │                       Point balance, membership tier, referral links
    │                       Expulsion status and reason tracking
    │
Category ──► Product    ─── Product catalog with points pricing, stock levels
                  │
                  ▼
Sale ──► SaleItem       ─── Sales transactions denominated in points
    │
PointsTransaction       ─── Full ledger (LOAD, CONSUME, REFUND, ADJUSTMENT)
    │
StockMovement           ─── Inventory audit trail (IN, OUT, ADJUSTMENT, SALE)
    │
CashRegister ──► Expense ── Cash drawer sessions with reconciliation
    │
MembershipPayment       ─── Membership fee payment history
```

---

## Project Structure

```
cannagest/
├── electron/                     # Electron main process
│   ├── main.ts                   # App bootstrap: DB → IPC → Window
│   ├── preload.ts                # Secure API bridge (contextBridge)
│   ├── ipc/                      # IPC handlers organized by domain
│   ├── services/                 # Business logic + Zod validation
│   │   ├── auth.service.ts       # Login, password hashing
│   │   ├── member.service.ts     # CRUD with field encryption
│   │   ├── sale.service.ts       # POS transactions
│   │   ├── backup.service.ts     # Backup create/restore/cloud sync
│   │   └── ...
│   ├── database/                 # Prisma client singleton + migrations
│   ├── utils/
│   │   ├── crypto.util.ts        # AES-256-GCM, PBKDF2, key management
│   │   ├── keys.util.ts          # Encryption key store operations
│   │   ├── backup.util.ts        # File backup utilities
│   │   └── logger.util.ts        # Application logger
│   └── types/                    # Shared IPC type definitions
├── src/                          # React frontend
│   ├── pages/                    # Application pages (login, POS, members, etc.)
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   └── layout/               # App layout and sidebar
│   ├── store/                    # Zustand state stores
│   ├── services/                 # IPC call wrappers
│   ├── types/                    # Frontend type definitions
│   └── App.tsx                   # Routes and access protection
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Initial data seeding script
├── shared/                       # Constants and types shared between processes
├── scripts/                      # Build scripts (afterPack for Prisma)
├── .github/workflows/            # CI/CD release pipeline
└── public/                       # Static assets
```

---

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9

---

## Installation

```bash
# Clone the repository
git clone https://github.com/abrahampo1/cannagest.git
cd cannagest

# Install dependencies
npm install

# Generate the Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed the database with initial data
npm run prisma:seed
```

---

## Usage

### Development

```bash
# Start the app in development mode with hot reload
npm run electron:dev
```

### Database Management

```bash
# Create and apply migrations
npm run prisma:migrate

# Regenerate Prisma client types
npm run prisma:generate

# Seed initial data (admin user + default categories)
npm run prisma:seed

# Open the visual database inspector
npm run prisma:studio
```

---

## Default Credentials

After running the seed script, an administrator account is created:

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

> **Important**: Change these credentials immediately after first login.

---

## Build & Packaging

```bash
# Compile TypeScript and build the application
npm run build

# Package as installer
npm run electron:build
```

Installers are output to the `release/` directory.

**Platform targets:**

| Platform | Format |
|----------|--------|
| Windows | NSIS installer |
| macOS | DMG (Intel + Apple Silicon) |
| Linux | AppImage + .deb |

**Packaging note:** `asar` is disabled in the build configuration because Prisma's native binaries require direct filesystem access. A custom `afterPack` hook copies the `.prisma/client/` directory into the packaged application.

---

## CI/CD

The project uses **GitHub Actions** (`.github/workflows/release-build.yml`) to automatically build and publish releases:

1. Triggered on GitHub release creation
2. Builds in parallel across 4 runners:
   - `windows-latest`
   - `macos-13` (Intel)
   - `macos-latest` (Apple Silicon)
   - `ubuntu-latest`
3. Each runner: install dependencies, generate Prisma client, build, package, upload artifacts to the GitHub release

---

## Contributing

Contributions are welcome. By submitting a pull request, you agree to grant the author a perpetual license to use, modify, and distribute your contribution as part of the software (see Section 5 of the [LICENSE](./LICENSE)).

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "feat: description of change"`)
4. Push the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

This software is distributed under the **CannaGest Source Available License v1.0**.

| Allowed | Not Allowed |
|---------|-------------|
| View and study the source code | Sell or distribute commercially |
| Personal, educational, or internal use | Offer as SaaS or paid service |
| Modify and create derivatives (non-commercial) | Commercial use without authorization |
| Redistribute with license and attribution | Sublicense |

For commercial licensing, contact **Abraham Leiro** — [abraham@cpsoftware.es](mailto:abraham@cpsoftware.es)

See the [LICENSE](./LICENSE) file for full terms.

---

<p align="center">
  Copyright &copy; 2026 Abraham Leiro. All rights reserved.
</p>
