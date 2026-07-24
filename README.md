# Food Order Payment Management System

A full-stack web application for managing daily food orders and payments for team meals.

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (Docker)
- **Auth:** JWT (JSON Web Token)

## Features

- **Dashboard:** Monthly overview with daily breakdown, unpaid orders summary
- **Daily Orders:** Add, edit, delete, and mark orders as paid
- **My Orders / Person Orders:** View order history by person and date range
- **Persons Management:** Admin-only CRUD for team members
- **Change Password:** All users can change their own password
- **Reset Password:** Admin can reset any user's password
- **Telegram Notifications:** Automatic notification on payment

## Access Control

| Role | Permissions |
|------|-------------|
| **Admin** | See all data, manage persons, reset any user's password |
| **User** | See only own orders, create orders for self, change own password |

## Default Login

| Name | Password | Role |
|------|----------|------|
| Madero | password123 | Admin |
| Bona | password123 | User |
| Sreymom | password123 | User |
| All other users | password123 | User |

## Setup

### 1. Start PostgreSQL (Docker)

```bash
docker run -d \
  --name food-order-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=food_orders \
  -p 5433:5432 \
  postgres:16-alpine
```

### 2. Setup Backend

```bash
cd backend
npm install
npm run seed    # Creates tables and imports data from Excel
npm run dev     # Starts on http://localhost:3001
```

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev     # Starts on http://localhost:5173
```

## Network Access

For access from other devices on the network:

- Frontend: `http://192.168.10.82:5173`
- Backend: `http://192.168.10.82:3001`

## Project Structure

```
food-order-payment/
├── backend/
│   ├── src/
│   │   ├── index.js           # Express server entry
│   │   ├── db.js              # PostgreSQL pool & schema
│   │   ├── seed.js            # Data seeding from Excel
│   │   ├── telegram.js        # Telegram notifications
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT auth middleware
│   │   └── routes/
│   │       ├── auth.js        # Login, register, change/reset password
│   │       ├── orders.js      # Order CRUD + pay
│   │       ├── persons.js     # Person CRUD
│   │       └── dashboard.js   # Dashboard stats
│   └── .env                   # Environment variables
├── frontend/
│   ├── public/
│   │   └── bg_login.png       # Login background image
│   └── src/
│       ├── App.jsx            # Main app with routing
│       ├── api/client.js      # API client with auth
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx
│       │   ├── DailyOrders.jsx
│       │   ├── PersonOrders.jsx
│       │   ├── Persons.jsx
│       │   └── ChangePassword.jsx
│       ├── components/
│       │   ├── OrderForm.jsx
│       │   ├── OrderTable.jsx
│       │   ├── DateSelector.jsx
│       │   └── PersonForm.jsx
│       └── styles/
│           └── app.css
└── Food_Order_Jul.xlsx        # Source data
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/change-password` - Change own password
- `POST /api/auth/reset-password` - Admin: reset user password

### Orders
- `GET /api/orders` - List orders (filtered by person for non-admin)
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order
- `POST /api/orders/:id/pay` - Mark order as paid

### Persons
- `GET /api/persons` - List persons (non-admin: only self)
- `POST /api/persons` - Create person (admin only)
- `PUT /api/persons/:id` - Update person (admin only)
- `DELETE /api/persons/:id` - Delete person (admin only)

### Dashboard
- `GET /api/dashboard` - Monthly stats
- `GET /api/dashboard/unpaid` - Unpaid orders list

## Environment Variables (backend/.env)

```
DB_HOST=localhost
DB_PORT=5433
DB_NAME=food_orders
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```
