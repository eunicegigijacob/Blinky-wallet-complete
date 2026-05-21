# Hack4Freedom 2026 — Local Setup Guide

This guide walks you through everything you need to run the **Blinky Lightning Wallet** repo locally — from installing Node.js and Git, to starting the backend API, frontend app, and database.

> **Note:** A **starter repo** will be shared during class. Use that repo as your working copy for the hackathon. This document describes the same setup for both the starter repo and the complete reference implementation (`remit-lightning-complete`).

---

## What you are running

This project is a **monorepo** (one repository with multiple apps):

| Part | Stack | Default URL |
|------|-------|-------------|
| **Backend (API)** | NestJS, MongoDB, Blink Lightning | `http://localhost:4001` |
| **Frontend (Web)** | React, Vite, Tailwind CSS | `http://localhost:5174` |

The backend exposes REST endpoints under `/api/v1`. The frontend talks to the API to create Lightning invoices, show QR codes, and poll for payment status.

---

## Prerequisites

Before you begin, install the following on your machine.

### 1. Node.js (LTS)

Node.js runs both the backend and frontend.

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (recommended: **v20** or **v22**)
3. Run the installer and accept the defaults (this also installs **npm**)

Verify the install:

```bash
node -v
npm -v
```

You should see version numbers for both (for example `v22.x.x` and `10.x.x`).

### 2. Git

Git is used to clone the repo and save your work.

**Windows**

1. Download Git from [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Install with default options
3. Use **Git Bash** or **PowerShell** for the commands in this guide

**macOS**

```bash
# If you have Homebrew:
brew install git
```

**Linux (Debian/Ubuntu)**

```bash
sudo apt update
sudo apt install git
```

Verify:

```bash
git --version
```

### 3. MongoDB

The backend stores invoices and transfer records in MongoDB.

**Option A — MongoDB Community (local install)**

1. Download from [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Install and start the MongoDB service
3. Default connection string: `mongodb://localhost:27017`

**Option B — MongoDB Atlas (cloud, free tier)**

1. Create a free cluster at [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user and get your connection string
3. It will look like: `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/remit_complete`

You only need **one** of these options.

### 4. Blink account & API keys

The app integrates with [Blink](https://blink.sv) for Lightning payments. You will need:

- A Blink account
- **API key**
- **Wallet ID**
- **Webhook secret** (for payment status callbacks)

Your instructor will share how to obtain these during the session, or you can follow Blink’s developer documentation. Placeholder values in `.env` are fine for initial boot; real keys are required to create and pay invoices.

### 5. A code editor (recommended)

[Visual Studio Code](https://code.visualstudio.com/) or [Cursor](https://cursor.com/) works well for this project.

---

## Get the code

When the **starter repo** link is shared, clone it:

```bash
git clone <STARTER_REPO_URL>
cd <repo-folder-name>
```

For the complete reference repo:

```bash
git clone <COMPLETE_REPO_URL>
cd remit-lightning-complete
```

Replace the URLs with the links provided in class.

---

## Install dependencies

From the **root** of the repository (where the top-level `package.json` lives):

```bash
npm install
```

This installs packages for both `frontend` and `backend` using npm workspaces.

If your instructor uses **pnpm** instead, run:

```bash
pnpm install
```

Use the same package manager for all commands in this project.

---

## Environment variables

The app needs configuration files copied from the examples provided in the repo.

### Backend

```bash
cd backend
cp .env.example .env
```

On Windows (Command Prompt):

```cmd
copy .env.example .env
```

Edit `backend/.env` with your values:

```env
MONGO_URI=mongodb://localhost:27017/remit_complete
BLINK_API_URL=https://api.blink.sv/graphql
BLINK_API_KEY=replace_me
BLINK_WALLET_ID=replace_me
BLINK_WEBHOOK_SECRET=replace_me
API_PORT=4001
WEB_PORT=5174
```

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `BLINK_API_KEY` | Your Blink API key |
| `BLINK_WALLET_ID` | ID of the Blink wallet to use |
| `BLINK_WEBHOOK_SECRET` | Secret for verifying Blink webhooks |
| `API_PORT` | Port for the NestJS server (default `4001`) |

### Frontend

```bash
cd ../frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:4001/api/v1
VITE_PORT=5174
```

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Base URL of the backend API |
| `VITE_PORT` | Port for the Vite dev server (default `5174`) |

Return to the project root when finished:

```bash
cd ..
```

---

## Start MongoDB (local install only)

If you use **MongoDB locally**, make sure it is running before starting the API.

**Windows (service):** MongoDB usually starts automatically after install. Check **Services** for “MongoDB Server”.

**macOS (Homebrew):**

```bash
brew services start mongodb-community
```

**Linux:**

```bash
sudo systemctl start mongod
```

Skip this step if you use **MongoDB Atlas** — the cloud cluster is always available.

---

## Run the application

You need **two processes**: the API and the web app. Use **two terminal windows** (or one terminal with a combined script).

### Option 1 — Two terminals (recommended for learning)

**Terminal 1 — Backend**

```bash
cd backend
npm run start:dev
```

**Terminal 2 — Frontend**

From the project root:

```bash
npm run dev:web
```

Or from the frontend folder:

```bash
cd frontend
npm run dev
```

### Option 2 — Single command from root

If the root `package.json` includes a working `dev` script:

```bash
npm run dev
```

This starts both the API and frontend together.

---

## Verify everything works

1. **Backend health** — open in a browser or use curl:

   ```bash
   curl http://localhost:4001/api/v1/health
   ```

   You should get a successful response from the health endpoint.

2. **Frontend** — open [http://localhost:5174](http://localhost:5174) in your browser. You should see the Blinky Lightning Wallet UI.

3. **Console output** — the backend terminal should show something like:

   ```
   DB connected
   server running on: http://localhost:4001
   ```

If MongoDB is not reachable, the API may fail to start or log connection errors. Double-check `MONGO_URI` and that MongoDB is running.

---

## Project structure (quick reference)

```
.
├── backend/          # NestJS API (invoices, payments, webhooks)
│   ├── src/
│   └── .env          # Backend secrets (create from .env.example)
├── frontend/         # React + Vite web app
│   ├── src/
│   └── .env          # Frontend config (create from .env.example)
├── package.json      # Root scripts and workspaces
└── README.md
```

---

## Common issues

### `npm install` fails

- Ensure Node.js LTS is installed (`node -v`)
- Delete `node_modules` and try again:

  ```bash
  rm -rf node_modules frontend/node_modules backend/node_modules
  npm install
  ```

### Port already in use

Change ports in your `.env` files:

- Backend: `API_PORT=4002`
- Frontend: `VITE_PORT=5175` and update `VITE_API_BASE_URL` if needed

### MongoDB connection error

- Local: confirm MongoDB is running and `MONGO_URI` matches your setup
- Atlas: whitelist your IP in the Atlas dashboard and use the full connection string with username and password

### Frontend cannot reach the API

- Confirm the backend is running on the port in `VITE_API_BASE_URL`
- Default should be `http://localhost:4001/api/v1`

### Blink / invoice errors

- Replace `replace_me` values in `backend/.env` with real Blink credentials
- Without valid keys, the app may start but invoice creation will fail

---

## Useful commands

| Command | Where | Purpose |
|---------|--------|---------|
| `npm install` | Root | Install all dependencies |
| `npm run start:dev` | `backend/` | Start API with hot reload |
| `npm run dev` | `frontend/` | Start web dev server |
| `npm run dev:web` | Root | Start frontend from root |
| `npm run build` | Root | Build frontend and backend for production |

---

## Next steps in class

1. Clone the **starter repo** when the link is shared
2. Complete this setup and confirm health check + frontend load
3. Add your Blink API credentials
4. Follow the instructor walkthrough for creating invoices and handling webhooks

If you get stuck, share your terminal output and which step failed — that makes debugging much faster.
