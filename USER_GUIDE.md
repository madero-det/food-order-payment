# Food Order Payment — User Guide

## Getting Started

### Login

1. Open the app: **https://food-order-payment.vercel.app**
2. Enter your **name** and **password** (see admin for credentials)
3. Optionally check **Remember me** to stay logged in

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access: manage persons, approve/reject payments & deletions, view all data |
| **User** | View own orders, create orders, pay orders, request deletion, change password |

---

## Dashboard

![Dashboard](https://food-order-payment.vercel.app/app_icon.png)

### Summary Cards
Shows current month statistics:
- **Total Orders** — number of orders this month
- **Unpaid Orders** — count of pending orders
- **Total Revenue** — total price of all orders
- **Total Paid** — amount already paid
- **Unpaid Amount** — amount still outstanding

### Today's Orders *(all users)*
Shows all orders placed today. Columns: #, Avatar, Name, Price, Paid, Payment Status.
- **Mobile**: Card layout with avatar, name, price, paid, and method
- **Desktop**: Table with avatars and notes displayed under names

### Daily Expense Chart
Line chart showing daily totals for the selected month. Hover for exact values. Use month/year selectors to view different periods.

### Monthly Expense Chart
Line chart showing month-by-month totals for the current year.

### Daily Breakdown *(admin only)*
Clickable table showing each day's order count, total, and paid amount. Click a row to go to that day's orders.

### By Person *(admin only)*
Table showing each person's avatar, name, order count, unpaid count, and total spent. Click a row to view that person's order history.

### Export to Excel
Click the **Export Excel** button on the Dashboard to download monthly orders as a spreadsheet. Includes: Date, Person, Price, Paid, Transaction Date, Status, Method, Notes.

---

## Orders Page

Manage daily orders. Accessible from the sidebar: **Orders**.

### Navigating Dates
- Use **← Prev / Next →** buttons to move between days
- Click **Today** to jump to current date
- Use the date picker to select any date

### Creating an Order
1. Click **+ New Order**
2. Select the **person** (admin only), enter **price** (auto-fills from default price if set)
3. Optionally add **Notes** (e.g., menu item, special requests)
4. Select **Payment Method** (Cash or Bank Transfer)
5. Optionally enter **paid amount** and **transaction date**
6. Click **Save**

### Editing an Order
1. Click the **pencil icon** on any order
2. Modify fields and click **Save**

### Paying an Order
1. Click the **checkmark icon** on an unpaid order
2. Enter the **transaction date & time**
3. Click **Confirm Pay**

**For users:** Payment goes to pending approval. Admin is notified via Telegram.
**For admins:** Payment is auto-approved. User receives notification.

### Requesting Deletion *(user)*
1. Click the **trash icon** on an order
2. Confirm in the dialog
3. Order status changes to "Delete Pending"
4. Admin receives notification and can approve or cancel

### Approving/Rejecting Payments *(admin)*
When a payment is pending, two grouped buttons appear:
- **Green checkmark** — Approve payment
- **Red X** — Reject payment (opens confirmation modal)

### Approving/Canceling Deletions *(admin)*
When deletion is pending, two grouped buttons appear:
- **Red trash** — Approve deletion (opens confirmation modal)
- **Amber X** — Cancel deletion request (opens confirmation modal)

---

## Person Orders (My Orders)

View all orders for a specific person. Accessible from sidebar.

### For Admins
1. Select a **person** from the dropdown
2. Optionally set date range using **From / To**
3. View summary stats: total orders, spent, paid, unpaid

**On desktop:** Use **Previous/Next** buttons to page through results (15 per page).
**On mobile:** Scroll down to auto-load more orders (infinite scroll).

Click any **unpaid order** to go directly to that date's order page.

### For Users
Shows only your own orders. Same date filtering and pagination as above.

---

## Persons Page *(admin only)*

Manage all team members. Accessible from sidebar: **Persons**.

### Viewing Persons
Table shows: Avatar, Name, Role, and Actions.

### Actions
- **Edit** *(pencil)* — Change name or role
- **Reset Password** *(key)* — Set a new password for this person
- **Delete** *(trash)* — Remove the person (only if they have no orders)

### Adding a Person
1. Click **+ New Person**
2. Enter name, role, and password
3. Click **Save**

### Uploading Profile Image
1. Click the **camera icon** on a person's avatar
2. Select an image, crop if needed
3. Click **Save** — image is uploaded to Cloudinary

---

## Notifications

### Notification Bell
Located in the top-right navbar. Shows a **red badge** with the count of unread notifications. Updates automatically.

### Notification History
Click the **bell icon** to view all notifications. Each notification shows:
- **Type icon** — colored by category (green = approved, red = rejected, amber = pending, blue = updated)
- **Title** — what happened
- **Message** — details including person name, amount, order date, transaction date
- **Timestamp** — how long ago

**Click** a notification to go to the related order's date page.
**Click the X** to delete a notification.
**Mark all as read** via the button at the top.

### Notification Types

| Icon | Title | Trigger |
|------|-------|---------|
| ✅ | Payment Approved | Your payment was approved |
| ❌ | Payment Rejected | Your payment was rejected |
| ⚠️ | Payment Pending Approval | User submitted payment (admin) |
| 🔄 | Payment Updated | Admin recorded a payment (admin) |
| 🗑️ | Delete Request Pending | User requested deletion (admin) |
| ✅ | Delete Request Approved | Your deletion was approved |
| ❌ | Delete Request Cancelled | Your deletion request was cancelled |

---

## Settings Page

Accessible from the **gear icon** in the navbar.

### Change Password
1. Enter your **current password**
2. Enter and confirm your **new password** (min 6 characters)
3. Click **Change Password**

### Profile Image
Upload or change your profile picture. Supports JPG, PNG, GIF, WebP (max 2 MB).

### Push Notifications *(browser only)*
Toggle browser push notifications on/off. When enabled:
- You'll receive popup alerts for payment approvals, rejections, and deletion updates
- Works even when the browser tab is in the background

**To disable:** Click the toggle to turn it off. Preference is saved and persists across sessions.

### Dark Mode
Click the **sun/moon icon** in the navbar to toggle dark mode. Preference is saved and persists across sessions.

---

## Mobile App

### Installation
Download the APK (Android) or IPA (iOS) from the project repository. Or install directly from the browser as a Progressive Web App (PWA) — tap "Add to Home Screen" in your browser menu.

### Differences from Web
- Same functionality as web version
- Push notifications via browser/webview
- Optimized for touch: card layout on small screens, hamburger menu
- Safe area insets for notched devices
- Safe area insets for notched devices

### Network
The mobile app connects to the same backend server. Ensure your device has internet access.

---

## Approval Workflow

### Payment Flow
```
1. User pays → "Pending" status
2. Telegram notification sent to admin
3. Admin clicks Approve or Reject in Telegram or on Orders page
4. User receives toast + push + notification history entry
```

### Deletion Flow
```
1. User requests deletion → "Delete Pending" status
2. Telegram notification sent to admin
3. Admin clicks Approve (deletes) or Cancel in Telegram or on Orders page
4. User receives toast + push + notification history entry
```

### Admin Direct Payment
```
1. Admin pays on behalf of user → "Paid" status
2. User receives: "Payment Approved" notification
3. Admin receives: "Payment Updated" notification
```

---

## Tips

- **Real-time updates:** The app uses Server-Sent Events (SSE) for live updates. Dashboard, Orders, and Person Orders auto-refresh when changes happen.
- **Telegram bot:** Approvals can be handled directly from Telegram without opening the web app.
- **Date shortcuts:** On the Orders page, click **Today** to jump to the current date. Use the month selector on Dashboard to view historical data.
- **Notification clicks:** Click any notification to jump directly to the relevant order date page.
- **Mobile:** The app works as a Progressive Web App (PWA). On Android/iOS, you can "Add to Home Screen" for a native-like experience.
- **Keyboard shortcuts:** The Orders page supports tab navigation between form fields.
