# ZeliaOMS Mobile App

React Native (Expo) frontend for the ZeliaOMS Django backend.

## Backend API
`https://zeliaoms.mcdave.co.ke/api/`
Authentication: Token-based (`Authorization: Token <token>`)

---

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (for APK builds): `npm install -g eas-cli`
- Android device or emulator

---

## Setup

```bash
cd frontedapp
npm install
npx expo start
```

To run on Android:
```bash
npx expo start --android
```

---

## Build APK (Preview)

```bash
eas login          # Login to your Expo account
eas build --platform android --profile preview
```

The `preview` profile generates an `.apk` you can install directly.

---

## Features

### Login
- Username + password authentication
- **Camera photo capture** (rear camera, forced — matches web app)
- **Live GPS coordinates** acquired at login
- Watermark overlay on photo: username + GPS + timestamp
- Login session saved to backend (`POST /api/auth/login-session/save/`)

### Dashboard
- Real-time stats: orders, customers, revenue, pending count
- Quick action buttons
- Recent orders list
- Pull-to-refresh

### Orders
- Full order list with search + status filter (All / Pending / Partial / Paid)
- Order detail: customer info, items, payments, balance
- **Create order** with live GPS location capture (OpenStreetMap reverse geocoding)
- Record payment (Cash / M-Pesa / Cheque / Bank Transfer)
- **M-Pesa STK Push** integration (Daraja API)

### Customers
- Full customer list with search + category filter
- Customer profile: contact, order history, total value
- One-tap call / email
- Add new customers

### Products
- Full product list with search + status filter
- Product detail: all 5 pricing tiers, stock by store
- Low-stock badge warning

### Stock Management
- Stock alerts (low stock / out of stock)
- Pending transfers view
- (More stock actions accessible via web app)

### Internal Messages
- Broadcast messages to all system users
- Real-time polling (10 seconds)
- Chat bubble UI

### Notifications
- Notification feed with type icons
- Mark all as read

### Profile
- User details view
- Sign out

---

## Folder Structure

```
frontedapp/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout (QueryClient, Toast)
│   ├── index.tsx           # Auth redirect
│   ├── login.tsx           # Login + camera + GPS
│   └── (tabs)/
│       ├── _layout.tsx     # Bottom tab navigation
│       ├── index.tsx       # Dashboard
│       ├── orders/         # Orders stack
│       ├── customers/      # Customers stack
│       ├── products/       # Products stack
│       └── more.tsx        # Stock, Messages, Notifications, Profile
├── src/
│   ├── api/                # Axios API service layer
│   ├── components/         # Reusable components
│   │   ├── ui/             # Button, Card, Input, Badge, etc.
│   │   ├── CameraCapture   # Camera + GPS watermark
│   │   ├── OrderCard
│   │   ├── CustomerCard
│   │   └── ProductCard
│   ├── constants/          # Colors, spacing, fonts
│   ├── store/              # Zustand auth store
│   └── types/              # TypeScript interfaces
├── assets/images/          # App icon, splash, etc.
├── app.json                # Expo config
├── eas.json                # EAS build config
└── package.json
```

---

## Backend Endpoints Used

| Feature | Method | Endpoint |
|---------|--------|----------|
| Login | POST | `/api/auth/login/post/` |
| Logout | POST | `/api/auth/logout/post/` |
| Login Session | POST | `/api/auth/login-session/save/` |
| Profile | GET | `/api/users/profile/me/` |
| Dashboard | GET | `/api/orders/dashboard_stats/` |
| Orders | GET | `/api/orders/` |
| Create Order | POST | `/api/orders/create_order/` |
| Order Detail | GET | `/api/orders/{id}/` |
| Add Payment | POST | `/api/payments/` |
| M-Pesa STK | POST | `/api/mpesa-transactions/stk_push/` |
| Products | GET | `/api/products/` |
| Customers | GET | `/api/customers/` |
| Stock Alerts | GET | `/api/stock/alerts/` |
| Messages | GET/POST | `/api/messages/` |
| Notifications | GET | `/api/notifications/` |
| Feedback | POST | `/api/feedback/` |

---

## Notes for Production

1. **M-Pesa**: Update sandbox credentials to production in Django `settings.py`
2. **Camera**: On Android, users will be prompted to grant camera permission on first use
3. **GPS**: High-accuracy GPS required — users must allow location
4. **Backend CORS**: Ensure `django-cors-headers` is configured to allow requests from the mobile app
