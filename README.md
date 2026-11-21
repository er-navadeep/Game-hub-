# 🎮 GameHub — Unified Gaming & Sports Booking Platform

A warm, user-friendly full-stack web application designed as a unified booking, live matchmaking, and digital gate pass management platform for both **Online Gaming Zones** (PC, PS5, Racing Simulators, Mobile) and **Offline Sports Complexes** (Volleyball, Swimming Pool batches, Box Cricket, Badminton, Table Tennis, Snooker, Futsal), powered by **Node.js + Express + MongoDB (Mongoose)** connected to local MongoDB at `mongodb://127.0.0.1:27017/gamehub`.

---

## 🌟 Top Navigation Bar & Architecture

The application is built on a clean `#F8FAFC` background with rounded friendly cards, intuitive helper text, and high-contrast **Green (Available/Empty)** and **Red (Booked/Occupied)** status badges.

The top navigation bar provides instant access to 5 primary views & authentication:
1. **Explore Hubs (Customer Home)**: Discover verified gaming zones and sports complexes with live capacity summaries, distinct Online vs. Offline game badges, sort dropdown (`Highest Rated`, `Most Capacity`, `Price Low/High`, `Newest`), city filters, and direct links to Google Maps and Phone.
2. **Existing Games Directory**: Complete directory of all supported **Online Games** (`PUBG / BGMI`, `Free Fire`, `Valorant`, `PS5`, `PC Gaming`, `FIFA / EA FC`, `Call of Duty`, `Counter-Strike 2`, `Racing Simulator`) and **Offline Sports** (`Volleyball`, `Swimming`, `Badminton`, `Table Tennis`, `Box Cricket`, `Basketball`, `Snooker / Pool`, `Futsal`) showing which hubs offer each game with direct booking shortcuts.
3. **My Tickets / Bookings**: Digital pass wallet displaying entry passes with unique `#GH-XXXXX` Booking IDs, visual QR codes, reserved stations/courts, pre-ordered F&B snacks, and **one-click Booking Cancellation** that instantly frees up reserved stations/courts.
4. **List Your Shop (Owner Portal & Insights)**: 3-step shop onboarding wizard with clickable chips for existing games, live cover photo preview, simulated ₹999/month listing fee checkout, **Live Owner Revenue Insights** (gross revenue, online vs venue breakdown, F&B snack revenue, cancellation count), and real-time court availability toggles (`Empty` / `Occupied`).
5. **Sign In / User Profile**: Dedicated customer registration, login modal with **1-Click Demo Logins** (Aman, Priya, Rohan), and user profile drawer showing preferred city, favorite game tags, and booking history.

---

## 🚀 Key Features

### 1. User Registration, Authentication & Profile (Stored in MongoDB)
- **New Player Registration**: Full Name, Email, Phone, Preferred City, Password, and interactive favorite games chip picker.
- **Persistent Sessions**: User profile saved in MongoDB `users` collection with local storage session sync.
- **1-Click Demo Logins**: Instant switch between demo personas:
  - *Aman Sharma* (Bangalore • PC/Console Gamer)
  - *Priya Mehta* (Mumbai • FIFA & Sports Athlete)
  - *Rohan Deshmukh* (Bangalore • Box Cricket & Aquatics)
- **Auto-Fill Bookings**: Booking modal automatically pre-populates the customer's name and phone number when signed in.

### 2. Unified Hubs Discovery & Multi-Criteria Sorting
- **Distinct Online & Offline Game Badges**: Every venue card clearly distinguishes between online esports titles (blue badges) and offline sports (emerald badges).
- **Live Availability Summaries**:
  - 🟢 **Gaming Zones**: e.g. `24 Stations Ready`
  - 🟢/🔴 **Court-based Sports (Volleyball/Badminton)**: `Volleyball Court: Empty (Ready)` or `Occupied`
  - 🟢 **Swimming Pool Batches**: `Swimming: 6/10 Slots Filled (4 spots left)`
- **Dynamic Sorting Options**:
  - `Highest Rated ★` (descending review score)
  - `Most Available Capacity` (descending stations/capacity)
  - `Price: Low to High` (ascending hourly rate)
  - `Price: High to Low` (descending hourly rate)
  - `Newest Hubs First`
- **Filters**: Category toggle (`All Hubs`, `Online Gaming`, `Offline Sports`), City dropdown (`Bangalore`, `Mumbai`, `Hyderabad`, `Chennai`), and search bar.

### 3. Ratings & Quick Reviews System
- **Customer Reviews**: Logged-in players or visitors can rate any venue (1 to 5 stars) and write comments on gear, ping, court quality, or snacks.
- **Automatic Score Recalculation**: Backend immediately recalculates the venue's average rating and total review count, persisting to MongoDB `venues.reviews` and `venues.rating`.
- **Review Badges**: Displayed with amber star badges on all Explore cards with review counts.

### 4. Interactive Booking Flow (Online Seats + Offline Courts & Batches)
- **Online Gaming Zones (BookMyShow-Style Visual Seat Grid)**:
  - Row A (A1-A12) and Row B (B1-B12) interactive station map.
  - Live color legend: **Total Seats**, **Available Seats (Green - Clickable)**, **Booked Seats (Red - Disabled)**, **Selected Seats (Blue)**, and **Held Seats (Amber - Temporarily Locked)**.
  - **Real-Time 5-Minute Seat Hold**: Selecting a seat locks it on the backend for 300 seconds with an animated countdown timer.
- **Offline Court-Based Sports (Volleyball, Badminton, Box Cricket, etc.)**:
  - Slot-based availability check displaying *"✅ Court is Empty & Available for this Slot"* in Green or *"⛔ Court is Occupied for this Slot"* in Red.
- **Capacity-Based Activities (Swimming Pool)**:
  - Enforces a strict **Max 10 members per 1-hour batch** safety limit with real-time slot progress bar and counter selector.
- **In-Venue F&B Cafe & Snack Bar Menu**:
  - Pre-order gamer fuel and sports nutrition during checkout: *Red Bull (₹125)*, *Monster Energy (₹130)*, *Hot Peri-Peri Maggi (₹75)*, *Salted French Fries (₹90)*, *Whey Protein Shake (₹150)*, *Enerzal Drink (₹50)*.
- **Payment Method Choice**:
  - `⚡ Pay Online (UPI / Card)`
  - `💵 Pay at Venue (Cash/UPI at Shop)`
- **Digital QR Pass**:
  - Saving a booking generates an entry pass with visual QR code and unique `#GH-XXXXX` ID, stored immediately in MongoDB.

### 5. Booking Cancellation & Instant Slot Liberation
- Under **My Tickets / Bookings**, users can cancel any confirmed upcoming reservation (`PATCH /api/bookings/:id/cancel`).
- Automatically updates status to `Cancelled (Refunded)` in MongoDB.
- **Immediately frees up the seats, swimming spots, or court** in real-time slot availability for other players.
- Logs the cancellation in `activity_logs` and increments owner insight counters.

### 6. Owner Dashboard, ₹999 Activation & Revenue Insights
- **Owner Analytics Card**:
  - **Total Bookings & Active Reservations**
  - **Gross Revenue & F&B Snacks Revenue**
  - **Payment Mode Split**: `Pay Online` vs. `Pay at Venue (Pending)`
  - **Cancelled Reservations Count**
- **Existing Games Chips**: Clickable chips of all 17 platform games to easily register venue capabilities.
- **₹999/Month Subscription**: Activating a shop saves the venue to MongoDB with `subscriptionPaid: true` and `subscriptionStatus: 'Active'`, immediately publishing it live.
- **Live Court Controls**: Owners can toggle court status between `Empty` and `Occupied` (`PATCH /api/venues/:id/status`), instantly updating the public view.

### 7. Receptionist QR Code Gate Pass Scanner
- Reception staff can scan ticket QR codes or enter Booking IDs (e.g. `#GH-84920`).
- Validates against MongoDB, checks in the player with an exact timestamp, rejects cancelled tickets, warns against double entry, and records the event in `activity_logs`.

---

## 🗄️ MongoDB Database Architecture

### Connection URI:
```
mongodb://127.0.0.1:27017/gamehub
```

### Collections & Schemas:
1. **`users`**:
   - `name`, `email`, `phone`, `city`, `password`, `favoriteGames`, `createdAt`
2. **`venues`**:
   - `shopName`, `ownerName`, `phone`, `city`, `address`, `mapUrl`, `image`
   - `category`: `'Online Gaming' | 'Offline Sports' | 'Both'`
   - `gamesOffered`: Array of game names
   - `pricePerHour`: Hourly rate
   - `totalCapacity`: Number of stations or batch limit
   - `courtStatus`: `'Empty' | 'Occupied'`
   - `rating`: Recalculated average score
   - `reviewCount`: Total reviews
   - `reviews`: Subdocuments with `userName`, `userId`, `rating`, `comment`, `createdAt`
   - `subscriptionStatus`: `'Active'`, `subscriptionPaid`: `true`, `subscriptionFee`: `999`
3. **`bookings`**:
   - `bookingId`: Unique ticket ID (e.g. `#GH-84920`)
   - `userId`: Optional reference to User
   - `venueId`: Reference to Venue
   - `playerName`, `phone`, `date`, `timeSlot`
   - `seats`: Array of station IDs (e.g. `['A1', 'A2']`)
   - `spotsCount`: Number of spots reserved
   - `snacks`: Array of pre-ordered items with quantities
   - `snacksTotal`, `totalAmount`
   - `paymentMethod`: `'Pay Online' | 'Pay at Venue'`
   - `paymentStatus`: `'Paid Online' | 'Pay at Venue (Pending)' | 'Refunded'`
   - `status`: `'Confirmed' | 'Cancelled'`
   - `checkInStatus`: `'Booked' | 'Checked-In'`
   - `qrCodeData`: Base64 data URL QR code
4. **`activity_logs`**:
   - Audit trail of user registrations, logins, reviews, shop registrations, ₹999 subscription activations, bookings, cancellations, reception check-ins, and court status changes with timestamps.
5. **`squad_beacons`**:
   - Matchmaking posts, captains, game titles, spots needed, and joined player rosters.

---

## 🚀 Setup & Run Instructions

### 1. Start Local MongoDB Daemon
Ensure MongoDB is running locally on port 27017:
```powershell
& "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath "c:\Users\navad\.cache\Desktop\GameHub\Game-hub-\data\db" --bind_ip 127.0.0.1 --port 27017
```

### 2. Install Dependencies & Run
From the project directory:
```powershell
cd Game-hub-
npm install
node server.js
```
*(Or from workspace root: `npm start`)*

### 3. Open in Browser
Visit:
👉 **[http://localhost:5000](http://localhost:5000)**

---

## 📋 Comprehensive Testing Checklist (26/26 Tests Passing)

Run the automated verification suite anytime:
```powershell
node verify_gamehub.js
```

### Manual Verification Checklist:
- [x] **MongoDB Live Connection**: Green pill `MongoDB: 127.0.0.1:27017` displayed in navbar.
- [x] **User Registration**: Create account with full name, email, phone, city, and favorite games chips.
- [x] **1-Click Demo Login**: Click Aman Sharma or Priya Mehta to auto-fill credentials and populate user avatar.
- [x] **Explore Hubs & Sorting**: Sort venues by rating, capacity, and price; filter by city and game.
- [x] **Existing Games Tab**: Browse 17 online and offline games; click any game to jump to hubs offering it.
- [x] **BookMyShow Seat Grid**: Select seats A1-A12 or B1-B12 with 5-minute hold timer; pre-order F&B snacks.
- [x] **Digital QR Pass**: Confirm booking; verify pass displays `#GH-XXXXX` and QR code.
- [x] **Cancel Booking**: In My Tickets, click "Cancel" to free up the seats in MongoDB availability.
- [x] **Leave a Review**: Rate a hub 1-5 stars; verify average rating recalculates live.
- [x] **Owner Portal**: Register shop with clickable chips and ₹999 fee; toggle court status; review revenue insights.
- [x] **Gate Pass Scanner**: Scan or enter `#GH-84920` to verify admission with live timestamp.
