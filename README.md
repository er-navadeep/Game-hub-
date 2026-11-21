# 🎮 GameHub Pro — Unified Gaming & Sports Booking Platform

A full-stack web application designed as a unified booking, live matchmaking, and gate pass management platform for both **Online Gaming Zones** (PC, Console, Mobile) and **Offline Sports Complexes** (Volleyball, Swimming Pool batches, Astro-turf), powered by **Node.js + Express + MongoDB (Mongoose)** and connected to local MongoDB at `mongodb://127.0.0.1:27017/gamehub`.

---

## 🌟 Complete Feature Set

### 1. Unified Hubs Discovery (Customer Explore Page)
- **Minimalist Modern Card-Based UI** on `#F8FAFC` with crisp borders and high-contrast badges:
  - 🟢 **Green Badges**: Available stations / Empty courts / Open pool batches
  - 🟡 **Amber Badges**: Held stations (Temporarily locked during checkout)
  - 🔴 **Red Badges**: Booked stations / Occupied courts
- **Category Filter Pills**: Quick switch between `[All Hubs]`, `[🎮 Online Gaming]`, and `[⚽ Offline Sports]`.
- **Location & Search Filter**: City dropdown (Bangalore, Hyderabad, Chennai, Mumbai) and search bar by venue name, game, or area.
- Direct links to **📍 View on Google Maps** and **📞 Call Owner**.

---

### 🔥 4 Advanced Commercial Features

#### 📸 Feature 1: Receptionist QR Code Gate Pass Scanner
- Dedicated **Reception Gate Pass Scanner** built into the top navigation bar.
- Cafe receptionists and sports complex staff can scan customer QR passes directly or enter booking IDs (e.g. `#GH-84920`).
- **Instant Gate Validation against MongoDB**:
  - ✅ **Valid Ticket**: Highlights player details, venue, time slot, reserved seats/courts, and pre-ordered snacks, marking the booking as **`Checked-In`** with an exact timestamp.
  - ⚠️ **Already Used Ticket**: Flags warning banner indicating the ticket was already scanned.
  - ❌ **Invalid Ticket**: Prevents unauthorized entry.
- Automatically records check-in events in the MongoDB `activity_logs` audit trail.

#### 🤝 Feature 2: Squad Finder & Matchmaking Beacon Board
- Connects local players who need teammates or want to join friendly competitive matches.
- **Online Gaming Beacons**: Find duos or squads for *Valorant 5v5 Ranked*, *CS2 LAN matches*, or *FIFA PS5 co-op*.
- **Offline Sports Beacons**: Recruit missing players for *Volleyball 6v6*, *Box Cricket*, or *Morning Swimming Lap batches*.
- **Features**:
  - Post custom match beacons with game, venue, match time, skill level, and spots needed.
  - One-click **"Join Squad"** to register your name and contact phone on the squad roster.
  - Direct **"Chat with Captain"** link opening WhatsApp chat with the match host.
  - Persisted in MongoDB `squad_beacons` collection.

#### 🍿 Feature 3: In-Venue F&B Cafe & Snack Bar Menu at Checkout
- Players can pre-order gaming fuel and sports nutrition snacks during the booking flow:
  - *Red Bull Energy Drink (250ml)* — ₹125
  - *Monster Energy Super Fuel (350ml)* — ₹130
  - *Hot Peri-Peri Cheese Maggi* — ₹75
  - *Crispy Salted French Fries* — ₹90
  - *Whey Protein Post-Workout Shake* — ₹150
  - *Enerzal Electrolyte Sports Drink* — ₹50
- Real-time cart calculation dynamically adds snack costs to total payable.
- Pre-ordered items appear on the digital QR ticket pass and reception scan receipt.

#### ⏱️ Feature 4: Real-Time Seat Locking Engine (5-Minute Hold)
- **BookMyShow-Style Temporary Seat Locking**:
  - Clicking an available green gaming seat temporarily locks it for **5 minutes (300 seconds)** on the backend.
  - Displays a live countdown timer: `⏱️ Seats held for your session: 04:59`.
  - For other players browsing the same date and slot, the seat appears in **Amber/Yellow (`Held by another player`)** and is disabled to eliminate race conditions and double-booking.
  - If checkout is completed, the lock transitions to permanently **Booked (Red)**. If the session expires or is closed, the lock is automatically released back to **Available (Green)**.

---

### 2. Interactive Booking Engine
- **Online Gaming Zones**: Visual gaming station seat map (Row A & Row B) with real-time seat states.
- **Court-Based Sports (Volleyball)**: Live court status from MongoDB showing *"✅ Court is Empty & Available"* or *"⛔ Court is Occupied"*.
- **Capacity-Based Activities (Swimming Pool)**: Enforces a strict **Max 10 members per 1-hour batch** limit with a real-time progress bar (e.g. *"6/10 slots filled (4 spots left)"*).
- **Payment Options**: Customers choose between **⚡ Pay Online (UPI / Card)** or **💵 Pay at Venue (Cash on Arrival)**.

---

### 3. Digital QR Code Entry Pass
- Dynamic visual QR Code generated for every booking.
- Unique `#GH-84920` Booking ID, player name, slot, reserved seats, snacks ordered, and payment badge.
- One-click **"Print / Save PDF"** button.
- All bookings persist in MongoDB and can be viewed under the **"My Tickets"** tab with real-time phone/ID search.

---

### 4. Owner Onboarding & Management ("List Your Shop")
- **3-Step Wizard**: Shop Details ➔ Game & Capacity Setup ➔ Simulated ₹999/month subscription checkout.
- New shops are immediately published with `subscriptionStatus: 'Active'` to MongoDB.
- **Live Court Status Toggle**: Owners can switch court availability between **Empty (Green)** and **Occupied (Red)** with a single click (`PATCH /api/venues/:id/status`), instantly updating customer view and writing to `activity_logs`.

---

## 🗄️ MongoDB Database Architecture

### Connection URI:
```
mongodb://127.0.0.1:27017/gamehub
```

### MongoDB Collections:

1. **`venues`** — Registered hubs, categories, live court status, and ₹999/month active subscriptions.
2. **`bookings`** — Customer reservations, unique `#GH-...` IDs, seats, pre-ordered F&B snacks, QR code data, and `checkInStatus` (`Booked` / `Checked-In`).
3. **`activity_logs`** — Audit trail of bookings, reception check-ins, subscription payments, and court status changes.
4. **`squad_beacons`** — Community matchmaking posts, host details, skill levels, and joined player rosters.

---

## 🚀 Setup & Run Instructions

```powershell
# 1. Navigate to project directory
cd C:\Users\SHANKAR\Downloads\gamehub

# 2. Start the application
npm start
```

Open your browser to:
👉 **[http://localhost:5000](http://localhost:5000)**

---

## 🔍 Inspecting in MongoDB Compass

1. Launch **MongoDB Compass**.
2. Connect to: `mongodb://127.0.0.1:27017`
3. Select the **`gamehub`** database from the left sidebar.
4. Inspect the collections:
   - 📁 **`venues`**
   - 📁 **`bookings`**
   - 📁 **`activity_logs`**
   - 📁 **`squad_beacons`**
