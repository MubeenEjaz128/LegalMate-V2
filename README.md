# ⚖️ LegalMate - AI-Powered Legal Consultation & Practice Management Platform

[![CI/CD Status](https://img.shields.io/badge/CI%2FCD-Ready-success.svg)](https://github.com/MubeenEjaz128/LegalMate-V2)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-orange.svg)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**LegalMate** is an enterprise-grade legal consultation and law practice management platform tailored for the Pakistani legal ecosystem. It connects clients with verified advocates, provides real-time WebRTC video consultations and Socket.IO chat, features an AI legal assistant powered by Retrieval-Augmented Generation (RAG) referencing Pakistani statutes and case law, and includes a full PKR wallet system with JazzCash, EasyPaisa, and Bank Transfer support.

---

## 📑 Table of Contents
- [Core Features](#-core-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Repository Structure](#-repository-structure)
- [User Roles & Permissions](#-user-roles--permissions)
- [Prerequisites](#-prerequisites)
- [Local Development Setup](#-local-development-setup)
- [Environment Variables Guide](#-environment-variables-guide)
- [Deployment Guide](#-deployment-guide)
  - [Backend Deployment (Render)](#1-backend-deployment-render-web-service)
  - [Frontend Deployment (Vercel)](#2-frontend-deployment-vercel)
- [End-to-End Testing with Playwright](#-end-to-end-testing-with-playwright)
- [Health Checks & Observability](#-health-checks--observability)
- [Security & Compliance](#-security--compliance)
- [License](#-license)

---

## 🌟 Core Features

- **AI Legal Assistant (RAG)**: In-process legal AI powered by LangChain, HuggingFace transformers (`@xenova/transformers`), HNSW vector store, and LLM integrations (Perplexity Sonar & Google Gemini 2.0 Flash) answering queries based on Pakistani law (`dataset.json`).
- **Advocate Discovery & Verification**: Search and filter verified lawyers by legal specialization, city/location, hourly consultation rate, and client ratings.
- **Appointment Scheduling**: Real-time consultation booking with calendar slot management, status tracking (pending, confirmed, completed, cancelled), and email alerts.
- **Real-Time 1-to-1 Chat**: Low-latency Socket.IO chat with file/document attachments, typing indicators, delivery status, and conversation history.
- **WebRTC Video Consultations**: In-browser video and audio consultations with camera/microphone controls, room signaling, and consultation timing.
- **PKR Wallet & Financials**:
  - Client balance top-ups with JazzCash, EasyPaisa, and Bank Transfer payment proofs.
  - Lawyer earnings wallet, platform commission deduction, and withdrawal requests.
  - Admin approval/rejection workflows with proof attachments.
- **Content Management System (CMS)**: Dynamic public services catalog, legal blog articles, expandable FAQs, and contact inquiry handling.
- **Admin Command Center**: Real-time telemetry (online users, live calls, pending appointments), user management, lawyer verifications, and financial audit logs.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client[Client / Lawyer Browser] -->|HTTPS / WSS| Vercel[Vercel Frontend (React + Vite)]
    Vercel -->|REST API Requests| Render[Render Backend (Node.js + Express)]
    Client -->|Socket.IO Events & WebRTC Signaling| Render
    Render -->|Queries / Mutations| MongoDB[(MongoDB Atlas)]
    Render -->|Embeddings & Retrieval| RAG[In-Process RAG (HNSW + LangChain)]
    RAG -->|LLM Prompts| AI[Perplexity Sonar / Google Gemini]
    Render -->|Transactional Emails| Email[Brevo / Gmail SMTP]
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 7, TailwindCSS 3.4, Framer Motion, Lucide React, Zustand, Axios, Socket.IO Client |
| **Backend** | Node.js (v20+), Express 4, Socket.IO 4, Mongoose 8, Helmet, Compression, Express Rate Limit |
| **AI / RAG** | LangChain, `@langchain/google-genai`, `@langchain/openai`, `@xenova/transformers`, HNSWLib |
| **Database** | MongoDB / MongoDB Atlas (with in-memory fallback for local development) |
| **Testing** | Playwright E2E (Chromium, Firefox, WebKit, Mobile Viewports) |
| **Deployment** | Vercel (Frontend Static SPA), Render (Backend Node.js Web Service) |

---

## 📁 Repository Structure

```
LegalMate/
├── backend/
│   ├── config/             # DB connection, CORS, JWT, commission configs
│   ├── controllers/        # Route controllers (AI, Admin, Appointments, etc.)
│   ├── middleware/         # Auth (JWT & RBAC), Rate limiting, Multer uploads
│   ├── models/             # Mongoose schemas (User, Appointment, Balance, etc.)
│   ├── routes/             # Express API routes (Auth, Lawyers, Wallet, CMS, etc.)
│   ├── services/           # RAG Service (LangChain, HuggingFace, Perplexity/Gemini)
│   ├── uploads/            # Profile pictures, chat files, payment proofs
│   ├── utils/              # Email dispatcher, Admin seeder, Notification helpers
│   ├── dataset.json        # Pakistani legal corpus for RAG indexing
│   ├── package.json        # Backend dependencies & scripts
│   └── server.js           # Main Express server & Socket.IO initialization
├── frontend/
│   ├── public/             # Static assets, favicon
│   ├── src/
│   │   ├── components/     # Reusable UI components (Auth, Chat, Admin, Meeting)
│   │   ├── pages/          # Application views (Home, Search, Dashboard, Wallet)
│   │   ├── services/       # Axios API client & endpoints
│   │   ├── stores/         # Zustand global state (authStore)
│   │   ├── App.jsx         # Route definitions & transitions
│   │   └── main.jsx        # React DOM root
│   ├── package.json        # Frontend dependencies & scripts
│   ├── vercel.json         # Vercel SPA rewrites & security headers
│   └── vite.config.js      # Vite build configuration
├── tests/
│   ├── e2e/                # Playwright E2E test suites
│   ├── fixtures/           # Test users & viewport definitions
│   └── helpers/            # Auth and navigation test helpers
├── playwright.config.js    # Playwright multi-browser test configuration
├── render.yaml             # Render Web Service Infrastructure-as-Code blueprint
├── ecosystem.config.js     # PM2 configuration for VPS hosting
└── README.md               # Project documentation
```

---

## 👥 User Roles & Permissions

| Role | Access & Capabilities |
| :--- | :--- |
| **Client** | Browse lawyers, book consultations, AI legal chat, PKR wallet top-up, 1-to-1 chat, WebRTC video calls, leave lawyer reviews. |
| **Lawyer** | Manage availability schedule, accept/reject bookings, client chat, WebRTC video calls, earnings wallet, submit withdrawal requests. |
| **Admin** | Real-time platform telemetry, approve/reject lawyers, manage users, approve PKR top-ups & withdrawals, manage CMS & platform settings. |

---

## 📋 Prerequisites

- **Node.js**: v20.x or v22.x LTS
- **npm**: v10.x or higher
- **MongoDB**: Local MongoDB instance OR MongoDB Atlas connection string (Free M0 cluster recommended).

---

## 🚀 Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/MubeenEjaz128/LegalMate-V2.git
cd LegalMate-V2
```

### 2. Configure Backend Environment
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

### 3. Configure Frontend Environment
```bash
cd ../frontend
cp .env.example .env
# VITE_API_URL is set to http://localhost:9000/api by default
```

### 4. Install Dependencies
```bash
# In project root
npm run install:all
```

### 5. Start the Application

**Option A: Unified Development Server** (Single Port 9000):
```bash
npm start
```

**Option B: Decoupled Development Server**:
```bash
# Terminal 1 - Backend:
cd backend && npm run dev

# Terminal 2 - Frontend:
cd frontend && npm run dev
```

---

## 🔐 Environment Variables Guide

### Backend Environment Variables (`backend/.env`)

| Variable | Required | Description | Example / Default |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | Environment mode | `development` or `production` |
| `PORT` | Optional | Express server port | `9000` (Render sets automatically) |
| `MONGODB_URI` | **Yes (Prod)** | MongoDB connection URI | `mongodb+srv://user:pass@cluster.mongodb.net/legalmate` |
| `JWT_SECRET` | **Yes** | Secret for signing auth tokens (min 32 chars) | `your-super-secret-jwt-key` |
| `JWT_EXPIRES_IN` | No | Token expiration duration | `7d` |
| `FRONTEND_URL` | **Yes** | Client application origin | `https://your-legalmate.vercel.app` |
| `CORS_ORIGIN` | No | Comma-separated allowed origins | `https://your-legalmate.vercel.app,http://localhost:5173` |
| `PERPLEXITY_API_KEY`| Optional | Perplexity Sonar API key for legal citations | `pplx-xxxxxxxxxxxxxxxxxxxx` |
| `GEMINI_API_KEY` | Optional | Google Gemini 2.0 API key for fallback legal AI | `AIzaSyxxxxxxxxxxxxxxxxxxxx` |
| `BREVO_API_KEY` | Optional | Brevo API key for transactional emails | `xkeysib-xxxxxxxxxxxxxxxx` |
| `EMAIL_USER` | Optional | SMTP username / Gmail address | `legalmate.services@gmail.com` |
| `EMAIL_PASS` | Optional | SMTP password / Gmail app password | `xxxx xxxx xxxx xxxx` |
| `ADMIN_EMAIL` | Optional | Default Superadmin Email seeded on first run | `legalmate.services@gmail.com` |
| `ADMIN_PASSWORD` | Optional | Default Superadmin Password seeded on first run | `Legal@12` |

### Frontend Environment Variables (`frontend/.env`)

| Variable | Required | Description | Example / Default |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | **Yes** | Backend REST API endpoint | `https://your-backend.onrender.com/api` |

---

## 🌐 Deployment Guide

### 1. Backend Deployment (Render Web Service)

1. Sign in to [Render](https://render.com/) and click **New + > Web Service**.
2. Connect your GitHub repository (`https://github.com/MubeenEjaz128/LegalMate-V2`).
3. Configure the following settings:
   - **Name**: `legalmate-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Health Check Path**: `/api/health`
4. Add the required Environment Variables in the Render dashboard:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `<Your MongoDB Atlas Connection String>`
   - `JWT_SECRET`: `<Generate a random 32-character secret>`
   - `FRONTEND_URL`: `https://<your-frontend-app>.vercel.app`
   - `CORS_ORIGIN`: `https://<your-frontend-app>.vercel.app`
   - `GEMINI_API_KEY` or `PERPLEXITY_API_KEY`: `<Your AI Key>`
5. Click **Create Web Service**. Your backend will be live at `https://legalmate-backend.onrender.com`.

*(Alternatively, use the included `render.yaml` for automatic Infrastructure-as-Code deployment via Render Blueprints).*

---

### 2. Frontend Deployment (Vercel)

1. Sign in to [Vercel](https://vercel.com/) and click **Add New > Project**.
2. Import the `LegalMate-V2` repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_URL`: `https://<your-backend-service>.onrender.com/api`
5. Click **Deploy**. Vercel will build the SPA and deploy it globally with edge caching.

---

## 🧪 End-to-End Testing with Playwright

LegalMate includes an automated Playwright test suite covering all major public, authenticated, and edge-case user journeys across multiple browsers and responsive viewports.

### Run All E2E Tests
```bash
npx playwright test
```

### Run Tests in a Specific Browser
```bash
# Chromium (Desktop Chrome):
npx playwright test --project=chromium

# Mobile Chrome (Pixel 5 Viewport):
npx playwright test --project=mobile-chrome
```

### View Interactive HTML Test Report
```bash
npx playwright show-report
```

---

## 🩺 Health Checks & Observability

The backend provides a public health check endpoint:
```http
GET /api/health
```

**Response Example**:
```json
{
  "status": "ok",
  "db": "connected",
  "uptime": 142.35,
  "timestamp": "2026-09-20T13:30:00.000Z"
}
```

---

## 🔒 Security & Compliance

- **Authentication**: Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256, single-session active token tracking, and password hashing using `bcryptjs` with salt rounds = 12.
- **Authorization**: Strict role-based access control (RBAC) middleware verifying user permissions at the API route level.
- **Rate Limiting**: IP-based rate limiting on all `/api/` endpoints with strict per-user minute/daily quotas on AI consultations.
- **Input Sanitization**: HTML sanitization on real-time chat messages via `sanitize-html` and parameterized Mongoose queries preventing NoSQL injection.
- **CORS & HTTP Headers**: Hardened with `helmet` and custom cross-origin resource policy rules.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
