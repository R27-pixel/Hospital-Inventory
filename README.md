# Hospital Inventory

A Windows desktop inventory system for hospitals and pharmacies, built with Electron, React, TypeScript, Vite, and SQLite.

## Features

- First-launch setup for master administrator and staff accounts
- Login, logout, password changes, and session protection
- Product catalog with HSN, pack size, manufacturer, and stock alerts
- Supplier management with GST, PAN, drug license, and contact details
- Batch-level stock tracking with expiry dates, MRP, purchase rates, and GST
- Purchase invoice and challan entry with discrepancy tracking
- Stock exits with recorded reasons
- GST reports and inventory reporting
- Audit logging for inventory and supplier changes
- Automatic startup and daily database backups
- Windows installer packaging through electron-builder

## Requirements

- Windows
- Node.js 18 or newer
- npm

## Getting Started

```bash
npm install
npm run dev:electron
```

The first launch opens the initial setup wizard. Create the master administrator and staff account before using the application.

## Development Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite renderer development server |
| `npm run dev:react` | Alias for the Vite development server |
| `npm run dev:electron` | Build the renderer and Electron process, then launch Electron |
| `npm start` | Build and launch the application |
| `npm run build:react` | Build the React renderer into `dist/` |
| `npm run build:electron` | Compile Electron TypeScript into `dist-electron/` |
| `npm run build` | Type-check, build, and create the Windows installer |
| `npm run reset-password` | Launch the development password reset flow |

The password reset command is intended for unpackaged development use only.

## Project Structure

```text
src/                 React renderer and UI components
electron/            Electron main process, preload, auth, and database services
scripts/             Development and inspection utilities
dist/                Vite build output (generated)
dist-electron/       Electron build output (generated)
release/             Windows installer output (generated)
```

## Data Storage

The application stores its SQLite database under Electron's user data directory:

```text
<userData>\data\inventory.db
```

Backups are created by the application and can be managed from the backup settings view. Do not commit database files or backup files to source control.

## Building the Windows Installer

```bash
npm run build
```

The installer and unpacked Windows application are written to `release/`.
