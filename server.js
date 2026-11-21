/**
 * GameHub — Unified Booking Platform Server
 * Node.js + Express + MongoDB (Mongoose) Localhost: mongodb://127.0.0.1:27017/gamehub
 * 
 * Includes 4 Advanced Commercial Features:
 * 1. Receptionist QR Code Scanner & Check-in Verification
 * 2. Squad Finder & Matchmaking Beacon Board
 * 3. In-Venue F&B Cafe & Snack Bar Menu at Checkout
 * 4. Real-time Seat Locking Engine (5-minute auto-release)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Check for installed dependencies
let express = null;
let mongoose = null;
let cors = null;
let QRCode = null;
let dotenv = null;

try {
  express = require('express');
  mongoose = require('mongoose');
  cors = require('cors');
  QRCode = require('qrcode');
  dotenv = require('dotenv');
  dotenv.config();
} catch (err) {
  // Gracefully handles when npm install has not been run yet
}

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gamehub';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_BACKUP_PATH = path.join(DATA_DIR, 'gamehub-local.json');

// Memory & JSON fallback store
let store = {
  venues: [],
  bookings: [],
  activity_logs: [],
  squad_beacons: []
};

// Real-Time Seat Locking Map: key = `${venueId}_${date}_${timeSlot}` -> { [seatId]: { sessionId, expiresAt } }
const seatLocks = new Map();

function cleanExpiredSeatLocks() {
  const now = Date.now();
  for (const [key, locks] of seatLocks.entries()) {
    for (const [seatId, lockData] of Object.entries(locks)) {
      if (lockData.expiresAt <= now) {
        delete locks[seatId];
      }
    }
    if (Object.keys(locks).length === 0) {
      seatLocks.delete(key);
    }
  }
}

// Periodically purge expired locks every 30 seconds
setInterval(cleanExpiredSeatLocks, 30000);

// Auto-seed initial realistic demo data
function seedInitialData() {
  const today = new Date().toISOString().split('T')[0];

  store.venues = [
    {
      _id: '673d001a1111111111111111',
      shopName: 'Nexus Arena Esports Hub',
      ownerName: 'Vikram Malhotra',
      phone: '+91 98765 43210',
      city: 'Bangalore',
      address: '4th Floor, Garuda Mall, Magrath Road, Ashok Nagar, Bangalore, Karnataka 560025',
      mapUrl: 'https://maps.google.com/?q=Garuda+Mall+Bangalore',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80',
      category: 'Online Gaming',
      gamesOffered: ['Valorant', 'PUBG PC', 'Free Fire MAX', 'PS5 Pro (FIFA 24)', 'Counter-Strike 2', 'Dota 2'],
      pricePerHour: 150,
      totalCapacity: 24, // 24 Gaming Stations (A1-A12, B1-B12)
      courtStatus: 'Empty',
      subscriptionStatus: 'Active',
      subscriptionFee: 999,
      description: 'Premier RGB gaming lounge with RTX 4090 rigs, 360Hz monitors, secretlab chairs, and fiber-optic low-ping lines.',
      rating: 4.9,
      createdAt: new Date().toISOString()
    },
    {
      _id: '673d001a2222222222222222',
      shopName: 'Smash & Spike Volleyball Complex',
      ownerName: 'Kavita Reddy',
      phone: '+91 91234 56789',
      city: 'Hyderabad',
      address: 'Plot 42, Gachibowli Stadium Road, Near Bio-Diversity Park, Hyderabad, Telangana 500032',
      mapUrl: 'https://maps.google.com/?q=Gachibowli+Stadium+Hyderabad',
      image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1000&q=80',
      category: 'Offline Sports',
      gamesOffered: ['Volleyball', 'Beach Volleyball', 'Throwball'],
      pricePerHour: 600,
      totalCapacity: 2, // 2 Championship maplewood courts
      courtStatus: 'Empty',
      subscriptionStatus: 'Active',
      subscriptionFee: 999,
      description: 'Olympic maplewood indoor volleyball courts with professional net systems, LED broadcast lighting, and locker facilities.',
      rating: 4.8,
      createdAt: new Date().toISOString()
    },
    {
      _id: '673d001a3333333333333333',
      shopName: 'BlueWave Olympic Aquatics & Pool',
      ownerName: 'Arunmozhi Varman',
      phone: '+91 99887 76655',
      city: 'Chennai',
      address: '15/2 East Coast Road, Near Palavakkam Beach, Chennai, Tamil Nadu 600041',
      mapUrl: 'https://maps.google.com/?q=Palavakkam+Chennai',
      image: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1000&q=80',
      category: 'Offline Sports',
      gamesOffered: ['Swimming', 'Lap Swimming', 'Water Polo', 'Aqua Aerobics'],
      pricePerHour: 250,
      totalCapacity: 10, // Strict Max 10 members per 1-hour batch
      courtStatus: 'Empty',
      subscriptionStatus: 'Active',
      subscriptionFee: 999,
      description: 'Temperature-controlled 50m Olympic size indoor pool with 8 lanes, certified lifeguards, and strict 10-swimmer capacity batches.',
      rating: 4.9,
      createdAt: new Date().toISOString()
    },
    {
      _id: '673d001a4444444444444444',
      shopName: 'Titan Turf & Esports Lounge',
      ownerName: 'Rohan Deshmukh',
      phone: '+91 97654 32109',
      city: 'Mumbai',
      address: 'Crossover Mall Rooftop, Link Road, Andheri West, Mumbai, Maharashtra 400053',
      mapUrl: 'https://maps.google.com/?q=Andheri+West+Mumbai',
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1000&q=80',
      category: 'Both',
      gamesOffered: ['Valorant', 'PS5 Pro (EA FC 24)', 'Box Cricket Turf', 'Badminton'],
      pricePerHour: 200,
      totalCapacity: 16, // 16 Gaming Stations + 1 Cricket/Badminton Court
      courtStatus: 'Empty',
      subscriptionStatus: 'Active',
      subscriptionFee: 999,
      description: 'Dual-entertainment hub combining a high-end console & PC gaming arena with a rooftop FIFA-certified astro-turf.',
      rating: 4.7,
      createdAt: new Date().toISOString()
    }
  ];

  store.bookings = [
    {
      _id: '673d001b1111111111111111',
      bookingId: '#GH-84920',
      venueId: '673d001a1111111111111111',
      venueName: 'Nexus Arena Esports Hub',
      playerName: 'Aman Sharma',
      phone: '+91 98201 12345',
      date: today,
      timeSlot: '05:00 PM - 06:00 PM',
      category: 'Online Gaming',
      seats: ['A1', 'A2'],
      spotsCount: 2,
      paymentMethod: 'Pay Online',
      paymentStatus: 'Paid Online',
      checkInStatus: 'Checked-In',
      checkInTime: new Date(Date.now() - 3600000).toISOString(),
      snacks: [
        { id: 'snk_1', name: 'Red Bull Energy Drink (250ml)', price: 125, qty: 1 }
      ],
      snacksTotal: 125,
      totalAmount: 425,
      createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      _id: '673d001b2222222222222222',
      bookingId: '#GH-91024',
      venueId: '673d001a1111111111111111',
      venueName: 'Nexus Arena Esports Hub',
      playerName: 'Priya Mehta',
      phone: '+91 98450 67890',
      date: today,
      timeSlot: '05:00 PM - 06:00 PM',
      category: 'Online Gaming',
      seats: ['A3', 'A4', 'B1'],
      spotsCount: 3,
      paymentMethod: 'Pay at Venue',
      paymentStatus: 'Pay at Venue (Pending)',
      checkInStatus: 'Booked',
      snacks: [
        { id: 'snk_3', name: 'Hot Peri-Peri Cheese Maggi', price: 75, qty: 2 }
      ],
      snacksTotal: 150,
      totalAmount: 600,
      createdAt: new Date(Date.now() - 5400000).toISOString()
    },
    {
      _id: '673d001b3333333333333333',
      bookingId: '#GH-33418',
      venueId: '673d001a3333333333333333',
      venueName: 'BlueWave Olympic Aquatics & Pool',
      playerName: 'Chennai Swim Club (Batch of 6)',
      phone: '+91 94441 55667',
      date: today,
      timeSlot: '05:00 PM - 06:00 PM',
      category: 'Offline Sports',
      seats: [],
      spotsCount: 6,
      paymentMethod: 'Pay Online',
      paymentStatus: 'Paid Online',
      checkInStatus: 'Booked',
      snacks: [],
      snacksTotal: 0,
      totalAmount: 1500,
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  store.activity_logs = [
    {
      _id: '673d001c1111111111111111',
      action: 'System Initialized',
      details: 'GameHub platform database initialized with 4 verified demo hubs.',
      type: 'system',
      timestamp: new Date(Date.now() - 18000000).toISOString()
    },
    {
      _id: '673d001c2222222222222222',
      action: 'Monthly ₹999 subscription paid',
      details: 'Nexus Arena Esports Hub renewed monthly listing pass.',
      type: 'subscription',
      timestamp: new Date(Date.now() - 14400000).toISOString()
    },
    {
      _id: '673d001c3333333333333333',
      action: 'Customer booked Seats A1, A2',
      details: 'Aman Sharma reserved 2 PC stations at Nexus Arena (#GH-84920).',
      type: 'booking',
      timestamp: new Date(Date.now() - 7200000).toISOString()
    },
    {
      _id: '673d001c4444444444444444',
      action: 'Customer booked 6 Swimming Slots',
      details: 'Chennai Swim Club booked 6/10 spots for 05:00 PM batch at BlueWave Aquatics (#GH-33418).',
      type: 'booking',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      _id: '673d001c5555555555555555',
      action: 'Reception Check-In Verified',
      details: 'Aman Sharma checked in at Nexus Arena gate for ticket #GH-84920.',
      type: 'system',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  // Auto-seed Squad Beacons for Matchmaking
  store.squad_beacons = [
    {
      _id: '673d001d1111111111111111',
      title: 'Valorant 5v5 Ranked — Need 2 Players (Ascendant/Diamond)',
      venueId: '673d001a1111111111111111',
      venueName: 'Nexus Arena Esports Hub',
      city: 'Bangalore',
      category: 'Online Gaming',
      game: 'Valorant',
      date: today,
      timeSlot: '06:00 PM - 07:00 PM',
      spotsTotal: 5,
      spotsNeeded: 2,
      hostName: 'Kunal Ray',
      hostPhone: '+91 98450 11223',
      skillLevel: 'High Competitive (Diamond+)',
      description: 'Looking for a reliable Controller and Initiator to grind Premier and high-elo 5v5 ranked games with low-ping LAN rigs.',
      members: [
        { name: 'Kunal Ray (Host)', phone: '+91 98450 11223', joinedAt: new Date(Date.now() - 7200000).toISOString() },
        { name: 'Tanmay Bhatt', phone: '+91 98111 22334', joinedAt: new Date(Date.now() - 5400000).toISOString() },
        { name: 'Rohit Joshi', phone: '+91 98222 33445', joinedAt: new Date(Date.now() - 3600000).toISOString() }
      ],
      status: 'Open',
      createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      _id: '673d001d2222222222222222',
      title: 'Volleyball 6v6 Evening Match — Need 3 Attackers/Blockers',
      venueId: '673d001a2222222222222222',
      venueName: 'Smash & Spike Volleyball Complex',
      city: 'Hyderabad',
      category: 'Offline Sports',
      game: 'Volleyball',
      date: today,
      timeSlot: '07:00 PM - 08:00 PM',
      spotsTotal: 6,
      spotsNeeded: 3,
      hostName: 'Sanjay Varma',
      hostPhone: '+91 99881 22334',
      skillLevel: 'Intermediate (Fun & Fast)',
      description: 'Friendly competitive 6v6 evening volleyball match on championship wooden court. Cost is split equally!',
      members: [
        { name: 'Sanjay Varma (Host)', phone: '+91 99881 22334', joinedAt: new Date(Date.now() - 10800000).toISOString() },
        { name: 'Aditya Rao', phone: '+91 99771 22334', joinedAt: new Date(Date.now() - 9000000).toISOString() },
        { name: 'Nikhil Kumar', phone: '+91 99661 22334', joinedAt: new Date(Date.now() - 7200000).toISOString() }
      ],
      status: 'Open',
      createdAt: new Date(Date.now() - 10800000).toISOString()
    },
    {
      _id: '673d001d3333333333333333',
      title: 'FIFA 24 PS5 Pro 2v2 Tournament Practice',
      venueId: '673d001a4444444444444444',
      venueName: 'Titan Turf & Esports Lounge',
      city: 'Mumbai',
      category: 'Online Gaming',
      game: 'PS5 Pro (FIFA 24)',
      date: today,
      timeSlot: '08:00 PM - 09:00 PM',
      spotsTotal: 4,
      spotsNeeded: 1,
      hostName: 'Sameer Sheikh',
      hostPhone: '+91 97555 66778',
      skillLevel: 'Semi-Pro',
      description: 'Co-op 2v2 FIFA 24 matches on 75-inch 120Hz gaming screens. Need 1 skilled teammate.',
      members: [
        { name: 'Sameer Sheikh (Host)', phone: '+91 97555 66778', joinedAt: new Date(Date.now() - 14400000).toISOString() },
        { name: 'Deepak Patel', phone: '+91 97444 55667', joinedAt: new Date(Date.now() - 12000000).toISOString() },
        { name: 'Farhan Akhtar', phone: '+91 97333 44556', joinedAt: new Date(Date.now() - 9600000).toISOString() }
      ],
      status: 'Open',
      createdAt: new Date(Date.now() - 14400000).toISOString()
    }
  ];

  saveStore();
}

function loadStore() {
  if (fs.existsSync(DB_BACKUP_PATH)) {
    try {
      const content = fs.readFileSync(DB_BACKUP_PATH, 'utf8');
      store = JSON.parse(content);
      if (!Array.isArray(store.squad_beacons)) {
        store.squad_beacons = [];
      }
      if (store.squad_beacons.length === 0) {
        seedInitialData();
      }
    } catch (e) {
      console.warn('[Store] Resetting storage file.');
      seedInitialData();
    }
  } else {
    seedInitialData();
  }
}

function saveStore() {
  try {
    fs.writeFileSync(DB_BACKUP_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.error('[Store] Failed to write store:', e.message);
  }
}

loadStore();

// Track MongoDB connectivity
let isMongoLive = false;
let mongoStatusText = 'Checking local MongoDB connection...';
let VenueModel = null;
let BookingModel = null;
let ActivityLogModel = null;
let SquadBeaconModel = null;

async function attemptMongoConnect() {
  if (!mongoose) {
    mongoStatusText = 'Using Active Local Engine (Run npm install to connect Mongoose)';
    return;
  }
  try {
    console.log(`[MongoDB] Connecting to ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000
    });
    isMongoLive = true;
    mongoStatusText = `Connected to local MongoDB (${MONGODB_URI})`;
    console.log(`[MongoDB] ✅ Connected to local MongoDB at ${MONGODB_URI}`);

    // Load Mongoose models
    VenueModel = require('./models/Venue');
    BookingModel = require('./models/Booking');
    ActivityLogModel = require('./models/ActivityLog');
    SquadBeaconModel = require('./models/SquadBeacon');

    // Auto-seed Mongoose if empty
    const count = await VenueModel.countDocuments();
    if (count === 0) {
      console.log('[MongoDB] Auto-seeding 4 demo venues into MongoDB...');
      await VenueModel.insertMany(store.venues.map(v => {
        const { _id, ...rest } = v;
        return rest;
      }));
      console.log('[MongoDB] Demo venues seeded into MongoDB!');
    }
  } catch (err) {
    isMongoLive = false;
    mongoStatusText = `Local MongoDB offline (${err.message}). Active local persistence mode enabled.`;
    console.log(`[MongoDB] ℹ️ Local daemon not responding. Seamless fallback active at ${DB_BACKUP_PATH}`);
  }
}

attemptMongoConnect();

// Log Activity Helper
async function recordActivity(action, details, type = 'system', meta = {}) {
  const timestamp = new Date();
  const entry = {
    _id: 'act_' + Date.now() + Math.random().toString(36).substring(2, 6),
    action,
    details,
    type,
    meta,
    timestamp: timestamp.toISOString()
  };

  if (isMongoLive && ActivityLogModel) {
    try {
      await ActivityLogModel.create({ action, details, type, meta, timestamp });
    } catch (e) {
      console.warn('Mongo activity log failed:', e.message);
    }
  }

  store.activity_logs.unshift(entry);
  if (store.activity_logs.length > 200) store.activity_logs.pop();
  saveStore();
}

// ==========================================
// CORE REST API HANDLER
// ==========================================
async function handleApiRequest(req, res, pathname, query, body) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. GET /api/status
  if (req.method === 'GET' && pathname === '/api/status') {
    res.writeHead(200);
    return res.end(JSON.stringify({
      status: 'online',
      appName: 'GameHub Pro',
      dbConnected: isMongoLive,
      dbStatusMessage: mongoStatusText,
      mongoUri: MONGODB_URI,
      database: 'gamehub',
      collections: ['venues', 'bookings', 'activity_logs', 'squad_beacons'],
      venuesCount: store.venues.length,
      bookingsCount: store.bookings.length,
      squadBeaconsCount: store.squad_beacons.length
    }));
  }

  // 2. GET /api/venues
  if (req.method === 'GET' && pathname === '/api/venues') {
    const { category, city, search } = query;
    let list = store.venues.filter(v => v.subscriptionStatus === 'Active');

    if (category && category !== 'All') {
      if (category === 'Online Gaming') {
        list = list.filter(v => v.category === 'Online Gaming' || v.category === 'Both');
      } else if (category === 'Offline Sports') {
        list = list.filter(v => v.category === 'Offline Sports' || v.category === 'Both');
      } else {
        list = list.filter(v => v.category === category);
      }
    }

    if (city && city !== 'All') {
      list = list.filter(v => v.city.toLowerCase() === city.toLowerCase());
    }

    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(v =>
        v.shopName.toLowerCase().includes(s) ||
        v.city.toLowerCase().includes(s) ||
        v.address.toLowerCase().includes(s) ||
        (Array.isArray(v.gamesOffered) && v.gamesOffered.some(g => g.toLowerCase().includes(s)))
      );
    }

    res.writeHead(200);
    return res.end(JSON.stringify({ success: true, count: list.length, venues: list }));
  }

  // 3. GET /api/venues/:id/availability (Includes Real-Time Locked Seats!)
  const availMatch = pathname.match(/^\/api\/venues\/([^/]+)\/availability$/);
  if (req.method === 'GET' && availMatch) {
    const venueId = availMatch[1];
    const { date, timeSlot, sessionId } = query;

    if (!date || !timeSlot) {
      res.writeHead(400);
      return res.end(JSON.stringify({ success: false, error: 'date and timeSlot query params required' }));
    }

    cleanExpiredSeatLocks();

    const venue = store.venues.find(v => String(v._id) === String(venueId));
    if (!venue) {
      res.writeHead(404);
      return res.end(JSON.stringify({ success: false, error: 'Venue not found' }));
    }

    const matchingBookings = store.bookings.filter(b =>
      String(b.venueId) === String(venueId) &&
      b.date === date &&
      b.timeSlot === timeSlot
    );

    const bookedSeats = [];
    let bookedSpots = 0;
    matchingBookings.forEach(b => {
      if (Array.isArray(b.seats)) {
        b.seats.forEach(s => bookedSeats.push(s));
      }
      bookedSpots += (b.spotsCount || (b.seats ? b.seats.length : 1));
    });

    // Real-Time Locked Seats (Held for checkout by another player)
    const lockKey = `${venueId}_${date}_${timeSlot}`;
    const activeLocks = seatLocks.get(lockKey) || {};
    const lockedSeatsInfo = [];

    for (const [sId, lData] of Object.entries(activeLocks)) {
      if (!bookedSeats.includes(sId)) {
        lockedSeatsInfo.push({
          seatId: sId,
          isMine: sessionId ? lData.sessionId === sessionId : false,
          expiresInSeconds: Math.max(0, Math.round((lData.expiresAt - Date.now()) / 1000))
        });
      }
    }

    const isSwimming = venue.gamesOffered && venue.gamesOffered.some(g => g.toLowerCase().includes('swim'));
    const isVolleyball = venue.gamesOffered && venue.gamesOffered.some(g => g.toLowerCase().includes('volley') || g.toLowerCase().includes('court'));
    const maxCapacity = venue.totalCapacity || (isSwimming ? 10 : 20);
    const spotsRemaining = Math.max(0, maxCapacity - bookedSpots);
    const isCourtOccupied = venue.courtStatus === 'Occupied' || matchingBookings.length > 0;

    res.writeHead(200);
    return res.end(JSON.stringify({
      success: true,
      venueId: venue._id,
      shopName: venue.shopName,
      category: venue.category,
      date,
      timeSlot,
      totalCapacity: maxCapacity,
      totalSeats: maxCapacity,
      bookedSeats,
      lockedSeats: lockedSeatsInfo, // Real-time temporary locks
      availableSeatsCount: Math.max(0, maxCapacity - bookedSeats.length - lockedSeatsInfo.filter(l => !l.isMine).length),
      isSwimmingPool: isSwimming,
      swimmingMaxBatch: maxCapacity,
      swimmingFilledSpots: bookedSpots,
      swimmingSpotsLeft: spotsRemaining,
      isVolleyballOrCourt: isVolleyball,
      liveCourtStatus: venue.courtStatus,
      courtOccupiedForSlot: isCourtOccupied,
      courtEmpty: !isCourtOccupied
    }));
  }

  // 4. POST /api/venues/:id/lock-seat (Real-Time 5-minute Seat Lock)
  const lockMatch = pathname.match(/^\/api\/venues\/([^/]+)\/lock-seat$/);
  if (req.method === 'POST' && lockMatch) {
    const venueId = lockMatch[1];
    const { date, timeSlot, seatId, sessionId } = body;

    if (!date || !timeSlot || !seatId || !sessionId) {
      res.writeHead(400);
      return res.end(JSON.stringify({ success: false, error: 'Missing lock parameters (date, timeSlot, seatId, sessionId)' }));
    }

    cleanExpiredSeatLocks();

    // Check if booked
    const isAlreadyBooked = store.bookings.some(b =>
      String(b.venueId) === String(venueId) &&
      b.date === date &&
      b.timeSlot === timeSlot &&
      Array.isArray(b.seats) &&
      b.seats.includes(seatId)
    );

    if (isAlreadyBooked) {
      res.writeHead(409);
      return res.end(JSON.stringify({ success: false, error: `Seat ${seatId} is already booked.` }));
    }

    const lockKey = `${venueId}_${date}_${timeSlot}`;
    if (!seatLocks.has(lockKey)) {
      seatLocks.set(lockKey, {});
    }
    const locks = seatLocks.get(lockKey);

    // Check if locked by someone else
    if (locks[seatId] && locks[seatId].sessionId !== sessionId && locks[seatId].expiresAt > Date.now()) {
      res.writeHead(409);
      return res.end(JSON.stringify({
        success: false,
        error: `Seat ${seatId} is currently held by another player. Try again in a few minutes.`
      }));
    }

    // Set 5-minute lock (300,000 ms)
    const expiresAt = Date.now() + 300000;
    locks[seatId] = { sessionId, expiresAt };

    res.writeHead(200);
    return res.end(JSON.stringify({
      success: true,
      message: `Seat ${seatId} locked for 5 minutes`,
      seatId,
      expiresAt,
      expiresInSeconds: 300
    }));
  }

  // 5. POST /api/venues/:id/unlock-seat
  const unlockMatch = pathname.match(/^\/api\/venues\/([^/]+)\/unlock-seat$/);
  if (req.method === 'POST' && unlockMatch) {
    const venueId = unlockMatch[1];
    const { date, timeSlot, seatId, sessionId } = body;

    const lockKey = `${venueId}_${date}_${timeSlot}`;
    if (seatLocks.has(lockKey)) {
      const locks = seatLocks.get(lockKey);
      if (locks[seatId] && locks[seatId].sessionId === sessionId) {
        delete locks[seatId];
      }
    }

    res.writeHead(200);
    return res.end(JSON.stringify({ success: true, message: `Seat ${seatId} unlocked` }));
  }

  // 6. GET /api/venues/:id
  const singleVenueMatch = pathname.match(/^\/api\/venues\/([^/]+)$/);
  if (req.method === 'GET' && singleVenueMatch) {
    const venue = store.venues.find(v => String(v._id) === String(singleVenueMatch[1]));
    if (!venue) {
      res.writeHead(404);
      return res.end(JSON.stringify({ success: false, error: 'Venue not found' }));
    }
    res.writeHead(200);
    return res.end(JSON.stringify({ success: true, venue }));
  }

  // 7. POST /api/bookings (With F&B Snacks Support)
  if (req.method === 'POST' && pathname === '/api/bookings') {
    const {
      venueId,
      playerName,
      phone,
      date,
      timeSlot,
      seats = [],
      spotsCount = 1,
      paymentMethod = 'Pay Online',
      snacks = [],
      snacksTotal = 0,
      sessionId = ''
    } = body;

    if (!venueId || !playerName || !phone || !date || !timeSlot) {
      res.writeHead(400);
      return res.end(JSON.stringify({ success: false, error: 'Missing required booking parameters' }));
    }

    const venue = store.venues.find(v => String(v._id) === String(venueId));
    if (!venue) {
      res.writeHead(404);
      return res.end(JSON.stringify({ success: false, error: 'Venue not found' }));
    }

    // Check double booking of gaming seats
    if (Array.isArray(seats) && seats.length > 0) {
      const existing = store.bookings.filter(b => String(b.venueId) === String(venueId) && b.date === date && b.timeSlot === timeSlot);
      const conflicts = [];
      existing.forEach(b => {
        if (Array.isArray(b.seats)) {
          b.seats.forEach(s => { if (seats.includes(s)) conflicts.push(s); });
        }
      });
      if (conflicts.length > 0) {
        res.writeHead(409);
        return res.end(JSON.stringify({
          success: false,
          error: `Station(s) [${conflicts.join(', ')}] already booked for ${timeSlot}.`
        }));
      }
    }

    // Check swimming capacity
    const isSwimming = venue.gamesOffered && venue.gamesOffered.some(g => g.toLowerCase().includes('swim'));
    if (isSwimming) {
      const existing = store.bookings.filter(b => String(b.venueId) === String(venueId) && b.date === date && b.timeSlot === timeSlot);
      let filled = 0;
      existing.forEach(b => { filled += (b.spotsCount || 1); });
      const requested = parseInt(spotsCount, 10) || 1;
      const capacity = venue.totalCapacity || 10;
      if (filled + requested > capacity) {
        res.writeHead(400);
        return res.end(JSON.stringify({
          success: false,
          error: `Only ${Math.max(0, capacity - filled)} slots available for the ${timeSlot} batch (requested ${requested}).`
        }));
      }
    }

    const rate = venue.pricePerHour || 150;
    const count = (Array.isArray(seats) && seats.length > 0) ? seats.length : (parseInt(spotsCount, 10) || 1);
    const seatSubtotal = rate * count;
    const totalAmount = seatSubtotal + (Number(snacksTotal) || 0);

    // Unique Booking ID: #GH-84920
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const bookingId = `#GH-${randomDigits}`;
    const paymentStatus = paymentMethod === 'Pay Online' ? 'Paid Online' : 'Pay at Venue (Pending)';

    const newBooking = {
      _id: 'bkg_' + Date.now() + Math.random().toString(36).substring(2, 6),
      bookingId,
      venueId: venue._id,
      venueName: venue.shopName,
      playerName: playerName.trim(),
      phone: phone.trim(),
      date,
      timeSlot,
      category: venue.category,
      seats: Array.isArray(seats) ? seats : [],
      spotsCount: count,
      courtStatusAtBooking: 'Occupied',
      snacks: Array.isArray(snacks) ? snacks : [],
      snacksTotal: Number(snacksTotal) || 0,
      paymentMethod,
      paymentStatus,
      checkInStatus: 'Booked',
      checkInTime: null,
      totalAmount,
      qrCodeData: '',
      createdAt: new Date().toISOString()
    };

    // If QRCode package installed, generate data URL
    if (QRCode) {
      try {
        newBooking.qrCodeData = await QRCode.toDataURL(JSON.stringify({
          ticket: bookingId,
          venue: venue.shopName,
          player: playerName,
          slot: `${date} ${timeSlot}`,
          amount: `₹${totalAmount}`,
          status: paymentStatus
        }));
      } catch (e) {}
    }

    if (isMongoLive && BookingModel) {
      try {
        const doc = await BookingModel.create({
          bookingId,
          venueId: venue._id,
          venueName: venue.shopName,
          playerName,
          phone,
          date,
          timeSlot,
          category: venue.category,
          seats: newBooking.seats,
          spotsCount: count,
          snacks: newBooking.snacks,
          snacksTotal: newBooking.snacksTotal,
          paymentMethod,
          paymentStatus,
          checkInStatus: 'Booked',
          totalAmount,
          qrCodeData: newBooking.qrCodeData
        });
        newBooking._id = doc._id.toString();
      } catch (e) {
        console.warn('Mongoose booking creation error:', e.message);
      }
    }

    // Release seat locks since seats are now confirmed
    const lockKey = `${venueId}_${date}_${timeSlot}`;
    if (seatLocks.has(lockKey)) {
      const locks = seatLocks.get(lockKey);
      seats.forEach(s => delete locks[s]);
    }

    store.bookings.unshift(newBooking);
    saveStore();

    // Audit Log
    const desc = seats.length > 0 ? `Seats ${seats.join(', ')}` : `${count} spot(s)`;
    const snackDesc = newBooking.snacks.length > 0 ? ` + ${newBooking.snacks.length} F&B item(s)` : '';
    await recordActivity(
      `Customer booked ${desc}${snackDesc}`,
      `${playerName} reserved ${desc}${snackDesc} at ${venue.shopName} for ${date} (${timeSlot}) [${bookingId}]`,
      'booking',
      { bookingId, venueId: venue._id, totalAmount }
    );

    res.writeHead(201);
    return res.end(JSON.stringify({
      success: true,
      message: 'Booking confirmed successfully!',
      booking: newBooking
    }));
  }

  // 8. POST /api/bookings/verify-checkin (Receptionist Camera QR Ticket Scanner)
  if (req.method === 'POST' && pathname === '/api/bookings/verify-checkin') {
    const { bookingId, qrPayload } = body;
    let targetId = (bookingId || '').trim();

    // Parse QR payload if JSON was passed
    if (!targetId && qrPayload) {
      try {
        const parsed = JSON.parse(qrPayload);
        targetId = parsed.ticket || parsed.bookingId || '';
      } catch (e) {
        targetId = qrPayload.trim();
      }
    }

    if (!targetId) {
      res.writeHead(400);
      return res.end(JSON.stringify({ success: false, error: 'Please provide a Booking ID or scan a valid QR Code' }));
    }

    // Normalize #GH-...
    const cleanId = targetId.startsWith('#') ? targetId : `#${targetId}`;
    const booking = store.bookings.find(b => b.bookingId.toLowerCase() === cleanId.toLowerCase());

    if (!booking) {
      res.writeHead(404);
      return res.end(JSON.stringify({
        success: false,
        error: `Invalid Ticket ID [${cleanId}]. No matching reservation found in MongoDB.`
      }));
    }

    // Check if already checked-in
    if (booking.checkInStatus === 'Checked-In') {
      res.writeHead(200);
      return res.end(JSON.stringify({
        success: true,
        alreadyCheckedIn: true,
        message: `⚠️ Ticket already scanned and checked in at ${new Date(booking.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        booking
      }));
    }

    // Mark as Checked-In
    booking.checkInStatus = 'Checked-In';
    booking.checkInTime = new Date().toISOString();
    saveStore();

    if (isMongoLive && BookingModel) {
      try {
        await BookingModel.findOneAndUpdate(
          { bookingId: cleanId },
          { checkInStatus: 'Checked-In', checkInTime: new Date() }
        );
      } catch (e) {}
    }

    // Audit Log
    await recordActivity(
      'Reception Check-In Verified',
      `Customer ${booking.playerName} checked in at reception for ticket ${cleanId} (${booking.venueName}).`,
      'system',
      { bookingId: cleanId, playerName: booking.playerName }
    );

    res.writeHead(200);
    return res.end(JSON.stringify({
      success: true,
      alreadyCheckedIn: false,
      message: `✅ Entry Verified! Player ${booking.playerName} checked in successfully.`,
      booking
    }));
  }

  // 9. GET /api/bookings
  if (req.method === 'GET' && pathname === '/api/bookings') {
    const { phone, bookingId, venueId } = query;
    let list = [...store.bookings];

    if (phone) list = list.filter(b => b.phone.includes(phone.trim()));
    if (venueId) list = list.filter(b => String(b.venueId) === String(venueId));
    if (bookingId) list = list.filter(b => b.bookingId.toLowerCase().includes(bookingId.trim().toLowerCase()));

    res.writeHead(200);
    return res.end(JSON.stringify({ success: true, count: list.length, bookings: list }));
  }

  // 10. GET /api/squads (Squad Finder / Matchmaking Board)
  if (req.method === 'GET' && pathname === '/api/squads') {
    const { category, city, game, status } = query;
    let list = [...store.squad_beacons];

    if (category && category !== 'All') {
      list = list.filter(s => s.category === category);
    }
    if (city && city !== 'All') {
      list = list.filter(s => s.city.toLowerCase() === city.toLowerCase());
    }
    if (game && game !== 'All') {
      list = list.filter(s => s.game.toLowerCase().includes(game.toLowerCase()));
    }
    if (status && status !== 'All') {
      list = list.filter(s => s.status === status);
    }

    res.writeHead(200);
    return res.end(JSON.stringify({ success: true, count: list.length, squads: list }));
  }

  // 11. POST /api/squads (Create Matchmaking Beacon)
  if (req.method === 'POST' && pathname === '/api/squads') {
    const {
      title,
      venueId,
      venueName,
      city,
      category,
      game,
      date,
      timeSlot,
      spotsTotal = 5,
      spotsNeeded = 2,
      hostName,
      hostPhone,
      skillLevel = 'All Skill Levels',
      description = ''
    } = body;

    if (!title || !venueName || !city || !category || !game || !date || !timeSlot || !hostName || !hostPhone) {
      res.writeHead(400);
      return res.end(JSON.stringify({ success: false, error: 'Missing required squad beacon details' }));
    }

    const newSquad = {
      _id: 'sqd_' + Date.now() + Math.random().toString(36).substring(2, 6),
      title: title.trim(),
      venueId: venueId || null,
      venueName: venueName.trim(),
      city: city.trim(),
      category,
      game: game.trim(),
      date,
      timeSlot,
      spotsTotal: Number(spotsTotal) || 5,
      spotsNeeded: Number(spotsNeeded) || 2,
      hostName: hostName.trim(),
      hostPhone: hostPhone.trim(),
      skillLevel: skillLevel.trim(),
      description: description.trim(),
      members: [
        {
          name: `${hostName.trim()} (Host)`,
          phone: hostPhone.trim(),
          joinedAt: new Date().toISOString()
        }
      ],
      status: 'Open',
      createdAt: new Date().toISOString()
    };

    if (isMongoLive && SquadBeaconModel) {
      try {
        const doc = await SquadBeaconModel.create(newSquad);
        newSquad._id = doc._id.toString();
      } catch (e) {}
    }

    store.squad_beacons.unshift(newSquad);
    saveStore();

    // Audit Log
    await recordActivity(
      'New squad beacon posted',
      `${hostName} posted squad beacon: "${title}" for ${game} at ${venueName}.`,
      'system',
      { squadId: newSquad._id, game, city }
    );

    res.writeHead(201);
    return res.end(JSON.stringify({
      success: true,
      message: 'Squad Matchmaking Beacon posted successfully!',
      squad: newSquad
    }));
  }

  // 12. POST /api/squads/:id/join (Join a Squad)
  const joinSquadMatch = pathname.match(/^\/api\/squads\/([^/]+)\/join$/);
  if (req.method === 'POST' && joinSquadMatch) {
    const squadId = joinSquadMatch[1];
    const { name, phone } = body;

    if (!name || !phone) {
      res.writeHead(400);
      return res.end(JSON.stringify({ success: false, error: 'Player name and contact phone are required' }));
    }

    const squad = store.squad_beacons.find(s => String(s._id) === String(squadId));
    if (!squad) {
      res.writeHead(404);
      return res.end(JSON.stringify({ success: false, error: 'Squad beacon not found' }));
    }

    if (squad.spotsNeeded <= 0 || squad.status === 'Full') {
      res.writeHead(400);
      return res.end(JSON.stringify({ success: false, error: 'This squad is already full.' }));
    }

    // Add member
    squad.members.push({
      name: name.trim(),
      phone: phone.trim(),
      joinedAt: new Date().toISOString()
    });

    squad.spotsNeeded = Math.max(0, squad.spotsNeeded - 1);
    if (squad.spotsNeeded === 0) {
      squad.status = 'Full';
    }

    saveStore();

    if (isMongoLive && SquadBeaconModel) {
      try {
        await SquadBeaconModel.findByIdAndUpdate(squadId, {
          members: squad.members,
          spotsNeeded: squad.spotsNeeded,
          status: squad.status
        });
      } catch (e) {}
    }

    // Audit Log
    await recordActivity(
      'Player joined squad',
      `${name} joined "${squad.title}" (${squad.spotsNeeded} spot(s) remaining).`,
      'system',
      { squadId: squad._id, playerName: name }
    );

    res.writeHead(200);
    return res.end(JSON.stringify({
      success: true,
      message: `🎉 Successfully joined ${squad.title}! Reach out to the captain at ${squad.hostPhone}.`,
      squad
    }));
  }

  // 13. POST /api/venues (Owner Onboarding)
  if (req.method === 'POST' && pathname === '/api/venues') {
    const {
      shopName,
      ownerName,
      phone,
      city,
      address,
      mapUrl = '',
      image = '',
      category = 'Online Gaming',
      gamesOffered = [],
      totalCapacity = 20,
      pricePerHour = 150,
      description = ''
    } = body;

    if (!shopName || !ownerName || !phone || !city || !address) {
      res.writeHead(400);
      return res.end(JSON.stringify({ success: false, error: 'Missing required shop registration details' }));
    }

    const defaultImg = category === 'Online Gaming'
      ? 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80'
      : (category === 'Offline Sports'
        ? 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1000&q=80'
        : 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1000&q=80');

    const newVenue = {
      _id: 'ven_' + Date.now() + Math.random().toString(36).substring(2, 6),
      shopName: shopName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      city: city.trim(),
      address: address.trim(),
      mapUrl: mapUrl ? mapUrl.trim() : `https://maps.google.com/?q=${encodeURIComponent(shopName + ' ' + city)}`,
      image: image.trim() || defaultImg,
      category,
      gamesOffered: Array.isArray(gamesOffered) ? gamesOffered : String(gamesOffered).split(',').map(s => s.trim()).filter(Boolean),
      pricePerHour: Number(pricePerHour) || 150,
      totalCapacity: Number(totalCapacity) || 20,
      courtStatus: 'Empty',
      subscriptionStatus: 'Active',
      subscriptionFee: 999,
      subscriptionPaidAt: new Date().toISOString(),
      description: description.trim() || `Verified ${category} facility in ${city}.`,
      rating: 5.0,
      createdAt: new Date().toISOString()
    };

    if (isMongoLive && VenueModel) {
      try {
        const doc = await VenueModel.create(newVenue);
        newVenue._id = doc._id.toString();
      } catch (e) {
        console.warn('Mongoose venue create error:', e.message);
      }
    }

    store.venues.unshift(newVenue);
    saveStore();

    // Audit logs
    await recordActivity(
      'New shop registered',
      `Owner ${ownerName} registered "${shopName}" in ${city} with ${newVenue.totalCapacity} capacity.`,
      'venue',
      { venueId: newVenue._id, shopName }
    );

    await recordActivity(
      'Monthly ₹999 subscription paid',
      `"${shopName}" activated 30-day listing on GameHub homepage (₹999 paid).`,
      'subscription',
      { venueId: newVenue._id, amount: 999 }
    );

    res.writeHead(201);
    return res.end(JSON.stringify({
      success: true,
      message: 'Shop successfully registered and published live on GameHub!',
      venue: newVenue
    }));
  }

  // 14. PATCH /api/venues/:id/status (Owner Court Toggle)
  const statusMatch = pathname.match(/^\/api\/venues\/([^/]+)\/status$/);
  if (req.method === 'PATCH' && statusMatch) {
    const venueId = statusMatch[1];
    const { courtStatus } = body;

    if (!['Empty', 'Occupied'].includes(courtStatus)) {
      res.writeHead(400);
      return res.end(JSON.stringify({ success: false, error: 'courtStatus must be "Empty" or "Occupied"' }));
    }

    const venue = store.venues.find(v => String(v._id) === String(venueId));
    if (!venue) {
      res.writeHead(404);
      return res.end(JSON.stringify({ success: false, error: 'Venue not found' }));
    }

    venue.courtStatus = courtStatus;
    saveStore();

    if (isMongoLive && VenueModel) {
      try {
        await VenueModel.findByIdAndUpdate(venueId, { courtStatus });
      } catch (e) {}
    }

    // Audit log
    await recordActivity(
      `Owner changed court status to ${courtStatus}`,
      `Court status for "${venue.shopName}" was updated to ${courtStatus} by owner.`,
      'court_status',
      { venueId: venue._id, courtStatus }
    );

    res.writeHead(200);
    return res.end(JSON.stringify({
      success: true,
      message: `Court status updated to ${courtStatus}`,
      venue
    }));
  }

  // 15. GET /api/activity-logs
  if (req.method === 'GET' && pathname === '/api/activity-logs') {
    const logs = store.activity_logs.slice(0, 50);
    res.writeHead(200);
    return res.end(JSON.stringify({ success: true, count: logs.length, logs }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ success: false, error: 'Endpoint not found' }));
}

// ==========================================
// STATIC FILE SERVING
// ==========================================
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveStaticFile(req, res, pathname) {
  let relativePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, relativePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Access denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const fallbackIndex = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(fallbackIndex, (err2, data) => {
        if (err2) {
          res.writeHead(404);
          return res.end('Page not found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

// ==========================================
// UNIFIED HTTP SERVER
// ==========================================
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const query = Object.fromEntries(parsedUrl.searchParams.entries());

  if (pathname.startsWith('/api/')) {
    let rawBody = '';
    req.on('data', chunk => { rawBody += chunk; });
    req.on('end', async () => {
      let body = {};
      if (rawBody) {
        try {
          body = JSON.parse(rawBody);
        } catch (e) {
          body = {};
        }
      }
      try {
        await handleApiRequest(req, res, pathname, query, body);
      } catch (err) {
        console.error('API Error:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      }
    });
    return;
  }

  serveStaticFile(req, res, pathname);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server] Port ${PORT} is already in use. Set PORT to another value or stop the process using it.`);
  } else {
    console.error('[Server] Failed to start:', err.message);
  }
  process.exitCode = 1;
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 GameHub Pro — Unified Booking Platform running!`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`📦 MongoDB Connection: ${MONGODB_URI}`);
  console.log(`⚡ Collections: venues, bookings, activity_logs, squad_beacons`);
  console.log(`✨ Features: Seat Locking, QR Scanner, Squad Finder, F&B Cafe`);
  console.log(`=======================================================`);
});
