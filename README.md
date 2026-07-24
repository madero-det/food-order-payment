# Food Order Payment Management System

A full-stack web application for managing daily food orders and payments for team meals.

## Live URLs

| Service | URL |
|---------|-----|
| Web App | https://food-order-payment.vercel.app |
| API | https://food-order-payment-api.onrender.com |

## Architecture

```
Phone/Browser
    ↓
Vercel (Frontend - React + Vite) — always on, free
    ↓
Render (Backend - Node.js + Express) — sleeps after 15min idle
    ↓
Neon.tech (PostgreSQL) — free forever
    ↓
Cloudinary (Image Uploads) — free forever, 25GB
    ↓
Telegram Bot (Payment/Deletion Approvals)
```

## Tech Stack

- **Frontend:** React + Vite, React Router, Recharts
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (Neon.tech for production, Docker for local)
- **Auth:** JWT with 7-day expiry
- **Real-time:** Server-Sent Events (SSE)
- **Media:** Cloudinary (profile images)
- **Notifications:** Toast + Push + Telegram Bot + In-app notification history
- **Mobile:** Capacitor (Android APK + iOS IPA)

## Features

- **Dashboard:** Monthly stats, daily chart, by-person breakdown, today's orders
- **Daily Orders:** Add/edit/delete orders, pay with datetime, bulk actions
- **Person Orders:** Pagination (web) / Infinite scroll (mobile), date range filter
- **Persons Management:** Admin CRUD, avatar upload, role management
- **Notifications:** Bell icon with unread badge, in-app history, push + toast alerts
- **Approval Workflow:** User pays → pending → Telegram → admin approve → approved
- **Deletion Workflow:** User requests → pending → admin approve/cancel
- **Mobile Apps:** Android APK and iOS IPA via Capacitor
- **Responsive:** Desktop table layout, mobile card layout with hamburger menu

## Access Control

| Role | Permissions |
|------|-------------|
| **Admin** | See all data, manage persons, approve/reject payments, approve/cancel deletions, reset passwords |
| **User** | See own orders, create orders, pay orders, request deletion, change password |

## Default Login

| Name | Password | Role |
|------|----------|------|
| Madero | `****` | Admin |
| All others | `****` | User |

All 19 persons share the same default password (see project admin).

## Notification Flow

| Action | User Gets | Admin Gets |
|--------|-----------|------------|
| User submits payment | — | "Payment Pending Approval" |
| User requests deletion | — | "Delete Request Pending" |
| Admin approves payment | "Payment Approved" | — |
| Admin rejects payment | "Payment Rejected" | — |
| Admin approves deletion | "Delete Request Approved" | — |
| Admin cancels deletion | "Delete Request Cancelled" | — |
| Admin direct payment | "Payment Approved" | "Payment Updated" |

## Local Development Setup

### 1. Start PostgreSQL (Docker)

```bash
docker run -d \
  --name food-order-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=food_order \
  -p 5433:5432 \
  postgres:16-alpine
```

### 2. Setup Backend

```bash
cd backend
npm install
node src/seed.js    # Creates tables and seeds data
node src/index.js   # Starts on http://localhost:3001
```

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev         # Starts on http://localhost:5173
```

### 4. Import Historical Data

```bash
cd backend
node src/import-all.js   # Imports Jan-May 2026
node src/import-jun.js   # Imports Jun 2026
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/change-password` | Change own password |
| POST | `/api/auth/reset-password` | Admin: reset user password |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List orders (paginated, with summary) |
| POST | `/api/orders` | Create order |
| PUT | `/api/orders/:id` | Update order |
| DELETE | `/api/orders/:id` | Delete order (user: request, admin: direct) |
| POST | `/api/orders/:id/pay` | Pay order |
| POST | `/api/orders/:id/approve` | Approve pending payment |
| POST | `/api/orders/:id/reject` | Reject pending payment |
| POST | `/api/orders/:id/approve-deletion` | Approve deletion request |
| POST | `/api/orders/:id/cancel-deletion` | Cancel deletion request |

### Persons
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/persons` | List persons |
| POST | `/api/persons` | Create person (admin) |
| PUT | `/api/persons/:id` | Update person (admin) |
| DELETE | `/api/persons/:id` | Delete person (admin) |
| POST | `/api/persons/:id/avatar` | Upload profile image |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Monthly stats, daily breakdown, by-person, today's orders |
| GET | `/api/dashboard/unpaid` | Unpaid orders list |
| GET | `/api/dashboard/monthly` | Monthly expense data (charts) |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications (paginated) |
| GET | `/api/notifications/unread-count` | Get unread count |
| PATCH | `/api/notifications/:id/read` | Mark as read |
| PATCH | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |

### SSE (Real-time)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events?token=xxx` | Server-Sent Events stream |

## Mobile Apps

### Android (APK)
```bash
cd frontend
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
# APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

### iOS (IPA)
```bash
cd frontend
npm run build && npx cap sync ios
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' build \
  CODE_SIGNING_ALLOWED=NO
# App at: Build/Products/Release-iphoneos/App.app
```

## Deployment

### Frontend (Vercel)
- Root Directory: `frontend`
- Framework: Vite
- Auto-deploys on push to `main`

### Backend (Render)
- Root Directory: `backend`
- Build: `npm install`
- Start: `node src/index.js`
- Keep awake: [cron-job.org](https://cron-job.org) ping every 14 minutes

### Database (Neon.tech)
- Free PostgreSQL with connection string
- Export from Docker: `docker exec food-order-pg pg_dump -U postgres -d food_order --no-owner > backup.sql`
- Import to Neon: `psql "$NEON_URL" < backup.sql`

## Environment Variables

### Backend (backend/.env)
```
PORT=3001                                   # (optional, defaults to 3001)
DATABASE_URL=postgresql://...               # Neon.tech connection string
JWT_SECRET=your-secret-key
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CORS_ORIGIN=https://food-order-payment.vercel.app
```

### Frontend (frontend/.env.production)
```
VITE_API_URL=https://food-order-payment-api.onrender.com/api
VITE_UPLOADS_URL=https://food-order-payment-api.onrender.com/uploads
```

## Project Structure

```
food-order-payment/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server entry
│   │   ├── db.js                 # PostgreSQL pool & schema
│   │   ├── events.js             # SSE client management
│   │   ├── notifications.js      # Notification save & formatting
│   │   ├── seed.js               # Initial data seeding
│   │   ├── telegram.js           # Telegram bot polling
│   │   ├── import-all.js         # Import Jan-May Excel data
│   │   ├── import-jun.js         # Import Jun Excel data
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT authentication
│   │   │   └── errorHandler.js
│   │   └── routes/
│   │       ├── auth.js           # Login, change/reset password
│   │       ├── orders.js         # Order CRUD, pay, approve, reject, deletion
│   │       ├── persons.js        # Person CRUD, avatar upload
│   │       ├── dashboard.js      # Dashboard stats & charts
│   │       ├── notifications.js  # Notification history
│   │       └── sse.js            # SSE endpoint
│   └── uploads/                  # Local uploads (dev only)
├── frontend/
│   ├── public/
│   │   ├── app_icon.png
│   │   ├── bg_login.png
│   │   └── sw.js                 # Service worker for push
│   ├── src/
│   │   ├── App.jsx               # Main app, routing, SSE listeners
│   │   ├── main.jsx              # Entry point
│   │   ├── api/
│   │   │   └── client.js         # API client, getImageUrl
│   │   ├── hooks/
│   │   │   └── useSSE.js         # SSE hook with auto-reconnect
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DailyOrders.jsx
│   │   │   ├── PersonOrders.jsx
│   │   │   ├── Persons.jsx
│   │   │   ├── ChangePassword.jsx
│   │   │   └── Notifications.jsx
│   │   ├── components/
│   │   │   ├── OrderForm.jsx
│   │   │   ├── OrderTable.jsx
│   │   │   ├── CropModal.jsx
│   │   │   ├── Toast.jsx
│   │   │   ├── DateSelector.jsx
│   │   │   └── DateTimeInput.jsx
│   │   └── styles/
│   │       └── app.css
│   ├── vercel.json               # Vercel deployment config
│   ├── capacitor.config.json     # Capacitor mobile config
│   └── vite.config.js
└── Food_Order_*.xlsx             # Source data files (Jan-Jul 2026)
```
