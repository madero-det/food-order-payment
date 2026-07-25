# Food Order Payment — API Specifications

## Base URL

| Environment | URL |
|------------|-----|
| Production | `https://food-order-payment-api.onrender.com` |
| Local      | `http://localhost:3001` |

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

SSE endpoints accept the token as a query parameter:

```
GET /api/events?token=<token>
```

Tokens expire after 7 days. Obtain a token via `POST /api/auth/login`.

---

## Common Response Formats

### Success
```json
{ "field": "value" }
```

### Error
```json
{ "error": "Error message" }
```

### Paginated
```json
{
  "orders": [],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5,
  "summary": {
    "total_orders": "100",
    "total_spent": "500000",
    "total_paid": "400000",
    "total_unpaid": "100000"
  }
}
```

---

## Public Endpoints

### GET /api/health

Server health check. No authentication required.

**Response 200:**
```json
{
  "status": "ok",
  "db": "connected",
  "uptime": 1234.56
}
```

**Response 503:**
```json
{
  "status": "error",
  "db": "disconnected"
}
```

---

## Auth Endpoints

### POST /api/auth/login

Authenticate and receive a JWT token.

**Request:**
```json
{
  "name": "Madero",
  "password": "****"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 20,
    "pid": 20,
    "name": "Madero",
    "role": "admin",
    "profile_image": "https://res.cloudinary.com/..."
  }
}
```

**Response 401:**
```json
{ "error": "Invalid credentials" }
```

---

### POST /api/auth/change-password

Change own password. Requires authentication.

**Request:**
```json
{
  "current_password": "old",
  "new_password": "new123"
}
```

**Response 200:**
```json
{ "message": "Password changed successfully" }
```

**Response 400:**
```json
{ "error": "Current password is incorrect" }
```

---

### POST /api/auth/reset-password

Admin only. Reset any user's password.

**Request:**
```json
{
  "person_id": 5,
  "new_password": "new123"
}
```

**Response 200:**
```json
{ "message": "Password reset successfully" }
```

---

## Orders Endpoints

### GET /api/orders

List orders with optional filters and pagination.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `date` | string | — | Single date: `2026-07-25` |
| `start_date` | string | — | Date range start |
| `end_date` | string | — | Date range end |
| `person_id` | int | — | Filter by person (admin only) |
| `paid` | string | — | `"true"` or `"false"` |
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |

**Notes:**
- Non-admin users are automatically scoped to their own orders
- When `person_id` or non-admin scoping is active, a `summary` object is included

**Response 200 (paginated with summary):**
```json
{
  "orders": [
    {
      "id": 50,
      "order_date": "2026-07-25",
      "price": 8000,
      "paid_amount": 8000,
      "transaction_date": "2026-07-25 10:30:00",
      "payment_status": "approved",
      "deletion_status": null,
      "person_id": 20,
      "person_name": "Madero",
      "person_avatar": null
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3,
  "summary": {
    "total_orders": "50",
    "total_spent": "400000",
    "total_paid": "350000",
    "total_unpaid": "50000"
  }
}
```

---

### GET /api/orders/:id

Get a single order by ID.

**Response 200:**
```json
{
  "id": 50,
  "order_date": "2026-07-25",
  "price": 8000,
  "paid_amount": 8000,
  "transaction_date": "2026-07-25 10:30:00",
  "payment_status": "approved",
  "deletion_status": null,
  "person_id": 20,
  "person_name": "Madero",
  "person_avatar": null
}
```

---

### POST /api/orders

Create a new order.

**Request:**
```json
{
  "order_date": "2026-07-25",
  "price": 8000,
  "paid_amount": 8000,
  "transaction_date": "2026-07-25T10:30",
  "person_id": 20
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `order_date` | Yes | `YYYY-MM-DD` format |
| `price` | Yes | Integer, in Cambodian Riel |
| `person_id` | Admin only | Non-admin auto-assigned to self |
| `paid_amount` | No | Sets payment if provided |
| `transaction_date` | No | ISO datetime string or `YYYY-MM-DDTHH:MM` |

**Response 201:**
```json
{
  "id": 51,
  "order_date": "2026-07-25",
  "price": 8000,
  "paid_amount": 8000,
  "transaction_date": "2026-07-25 10:30:00",
  "payment_status": null,
  "deletion_status": null,
  "person_id": 20,
  "person_name": "Madero"
}
```

**SSE Event:** `order_created`

---

### PUT /api/orders/:id

Update an order.

**Request:** Same shape as POST.

**Notes:**
- Non-admin users can only update their own orders
- Non-admin setting `paid_amount` triggers `payment_status = 'pending'` and sends Telegram + admin notification

**SSE Event:** `order_updated` or `payment_submitted`

---

### DELETE /api/orders/:id

Delete or request deletion of an order.

**Notes:**
- **Admin:** Directly deletes the order
- **User:** Sets `deletion_status = 'pending'`, sends Telegram notification to admin

**Response 200 (user):**
```json
{
  "message": "Deletion request sent",
  "id": 50,
  "deletion_status": "pending"
}
```

**Response 200 (admin):**
```json
{
  "message": "Order deleted",
  "id": 50
}
```

**SSE Events:**
- User: `deletion_requested`
- Admin direct delete: `order_deleted`

---

### POST /api/orders/:id/pay

Submit payment for an order.

**Request:**
```json
{
  "paid_amount": 8000,
  "transaction_date": "2026-07-25T10:30"
}
```

**Notes:**
- **User pays:** `payment_status = 'pending'`, Telegram notification sent, admin gets notification
- **Admin pays:** `payment_status = 'approved'`, user gets notification, admin gets "Payment Updated" notification
- `paid_amount` defaults to the order's price

**Response 200:**
```json
{
  "id": 50,
  "price": 8000,
  "paid_amount": 8000,
  "transaction_date": "2026-07-25 10:30:00",
  "payment_status": "pending",
  "person_name": "Madero"
}
```

**SSE Events:**
- User pay: `payment_submitted`
- Admin pay: `payment_approved`

---

### POST /api/orders/:id/approve

Admin only. Approve a pending payment.

**Response 200:**
```json
{
  "id": 50,
  "payment_status": "approved",
  "person_name": "Madero"
}
```

**SSE Event:** `payment_approved`

---

### POST /api/orders/:id/reject

Admin only. Reject a pending payment. Clears `paid_amount` and `transaction_date`.

**Response 200:**
```json
{
  "id": 50,
  "payment_status": "rejected",
  "person_name": "Madero"
}
```

**SSE Event:** `payment_rejected`

---

### POST /api/orders/:id/approve-deletion

Admin only. Approve a pending deletion request. Permanently deletes the order.

**Response 200:**
```json
{
  "message": "Deletion approved and order deleted",
  "id": 50
}
```

**SSE Event:** `order_deleted`

---

### POST /api/orders/:id/cancel-deletion

Admin only. Cancel a pending deletion request. Clears `deletion_status`.

**Response 200:**
```json
{
  "id": 50,
  "deletion_status": null,
  "person_name": "Madero"
}
```

**SSE Event:** `deletion_cancelled`

---

## Persons Endpoints

### GET /api/persons

List all persons.

**Notes:** Non-admin users see only themselves.

**Response 200:**
```json
[
  {
    "id": 20,
    "name": "Madero",
    "role": "admin",
    "profile_image": "https://res.cloudinary.com/..."
  }
]
```

---

### POST /api/persons

Admin only. Create a new person.

**Request:**
```json
{
  "name": "NewPerson",
  "role": "user",
  "password": "new123"
}
```

**Response 201:**
```json
{
  "id": 25,
  "name": "NewPerson",
  "role": "user",
  "profile_image": null
}
```

---

### PUT /api/persons/:id

Admin only. Update a person.

**Request:**
```json
{
  "name": "UpdatedName",
  "role": "user"
}
```

---

### DELETE /api/persons/:id

Admin only. Delete a person.

**Response 200:**
```json
{ "message": "Person deleted", "id": 25 }
```

---

### POST /api/persons/:id/avatar

Upload a profile image. Uploaded to Cloudinary in production.

**Request:** `multipart/form-data`

| Field | Type | Constraints |
|-------|------|-------------|
| `image` | File | Max 2 MB, formats: jpeg, jpg, png, gif, webp |

**Response 200:**
```json
{
  "id": 20,
  "name": "Madero",
  "role": "admin",
  "profile_image": "https://res.cloudinary.com/mfgsequ3/image/upload/v1234/food-order-avatars/avatar-20-1234567890.jpg"
}
```

---

## Dashboard Endpoints

### GET /api/dashboard

Get monthly dashboard summary, daily breakdown, by-person stats, and today's orders.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `month` | int | Current | Month number (1-12) |
| `year` | int | Current | Year (e.g., 2026) |

**Notes:**
- Non-admin users see only their own data
- Today's orders (non-admin): all persons' orders for today
- Today's date uses Cambodia timezone (UTC+7)

**Response 200:**
```json
{
  "period": { "month": 7, "year": 2026 },
  "summary": {
    "total_orders": 1030,
    "total_price": 7500000,
    "paid_orders": 950,
    "total_paid": 7200000,
    "unpaid_orders": 80,
    "total_unpaid": 300000
  },
  "daily": [
    {
      "date": "2026-07-01",
      "order_count": 35,
      "total": 245000,
      "paid": 240000
    }
  ],
  "by_person": [
    {
      "person_id": 20,
      "name": "Madero",
      "order_count": 45,
      "unpaid_count": 2,
      "total_spent": 360000,
      "total_paid": 350000
    }
  ],
  "today_orders": [
    {
      "id": 51,
      "order_date": "2026-07-25",
      "price": 8000,
      "paid_amount": 8000,
      "payment_status": "approved",
      "person_name": "Madero",
      "person_avatar": null
    }
  ]
}
```

---

### GET /api/dashboard/unpaid

Get list of unpaid orders for the selected month/year.

**Query Parameters:** Same as `GET /api/dashboard`

**Response 200:**
```json
[
  {
    "id": 55,
    "order_date": "2026-07-20",
    "price": 7000,
    "person_name": "Saven"
  }
]
```

---

### GET /api/dashboard/monthly

Get monthly expense totals for the selected year (for charts).

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `year` | int | Current | Year |

**Response 200:**
```json
[
  { "month": 1, "name": "Jan", "total": 500000, "paid": 450000 },
  { "month": 2, "name": "Feb", "total": 520000, "paid": 500000 }
]
```

---

## Notifications Endpoints

### GET /api/notifications

List notifications for the authenticated user.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 50 | Items per page |

**Response 200:**
```json
{
  "notifications": [
    {
      "id": 100,
      "type": "payment_approved",
      "title": "Payment Approved",
      "message": "Your payment for 8,000 R has been approved!\nOrder: 2026-07-25\nTxn: 2026-07-25 10:30 AM",
      "order_id": 50,
      "is_read": false,
      "created_at": "2026-07-25T03:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

### Notification Types

| Type | Icon | Trigger |
|------|------|---------|
| `payment_approved` | ✅ Green | Payment approved (user) |
| `payment_rejected` | ❌ Red | Payment rejected (user) |
| `payment_submitted` | ⚠️ Amber | Payment pending approval (admin) |
| `payment_updated` | 🔄 Blue | Admin direct payment recorded (admin) |
| `deletion_requested` | 🗑️ Amber | Deletion request submitted (admin) |
| `deletion_approved` | ✅ Green | Deletion approved (user) |
| `deletion_cancelled` | ❌ Gray | Deletion cancelled (user) |

---

### GET /api/notifications/unread-count

Get unread notification count.

**Response 200:**
```json
{ "count": 5 }
```

---

### PATCH /api/notifications/:id/read

Mark a notification as read.

**Response 200:**
```json
{
  "id": 100,
  "is_read": true
}
```

---

### PATCH /api/notifications/read-all

Mark all notifications as read.

**Response 200:**
```json
{ "message": "All notifications marked as read" }
```

---

### DELETE /api/notifications/:id

Delete a notification.

**Response 200:**
```json
{ "message": "Notification deleted", "id": 100 }
```

---

## SSE (Server-Sent Events)

### GET /api/events

Real-time event stream for live updates.

**Authentication:** Token required via `?token=` query parameter.

**Event Types:**

| Event | Recipient | Trigger |
|-------|-----------|---------|
| `connected` | All | Initial connection confirmation |
| `heartbeat` | All | Keep-alive every 30 seconds |
| `order_created` | All | New order created |
| `order_updated` | All | Order modified |
| `order_deleted` | All | Order deleted |
| `payment_submitted` | Admin | User paid (pending approval) |
| `payment_approved` | User + Admin | Payment approved |
| `payment_rejected` | User | Payment rejected |
| `deletion_requested` | Admin | User requested deletion |
| `deletion_approved` | User | Admin approved deletion |
| `deletion_cancelled` | User | Admin cancelled deletion |

**Event Format:**
```
event: payment_approved
data: {"id":50,"person_id":20,"person_name":"Madero","price":8000,"order_date":"2026-07-25","transaction_date":"2026-07-25 10:30:00","payment_status":"approved","triggeredBy":20}
```

**Notes:**
- Each client (tab/page) opens a separate SSE connection
- Auto-reconnect with exponential backoff (max 10 attempts, up to 30s delay)
- Connection closes on page unload or logout

---

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing/invalid/expired token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 500 | Internal server error |

---

## Rate Limits

No rate limiting is currently enforced. The following limits apply per platform free tier:

| Limit | Value |
|-------|-------|
| Render bandwidth | 100 GB/month |
| Neon compute | Unlimited (free tier) |
| Cloudinary storage | 25 GB |
| Cloudinary bandwidth | 25 GB/month |
| Cron-job pings | 1 per 14 minutes (keeps server awake) |
