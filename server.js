/**
 * GameHub — Unified Booking Platform Server
 * Node.js + Express + MongoDB (Mongoose) Localhost: mongodb://127.0.0.1:27017/gamehub
 * 
 * Collections:
 * 1. users: Registered players & authentication
 * 2. venues: Shop details, games, capacity, live court status, reviews & ratings, ₹999 subscriptions
 * 3. bookings: Reservations, seats, spots, snacks, QR passes, cancellation status
 * 4. activity_logs: Real-time platform audit feed
 * 5. squad_beacons: Community matchmaking posts
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

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
  // Handled gracefully
}

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gamehub';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_BACKUP_PATH = path.join(DATA_DIR, 'gamehub-local.json');

// In-Memory & Local Backup Store
let store = {
  users: [],
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

setInterval(cleanExpiredSeatLocks, 30000);

// Master catalog of all supported Online and Offline games
const ONLINE_GAMES_MASTER = [
  { name: 'PUBG / BGMI', category: 'Online Gaming', icon: 'crosshair', desc: 'High-octane mobile & PC battle royale on low-latency LAN rigs' },
  { name: 'Free Fire', category: 'Online Gaming', icon: 'flame', desc: 'Fast-paced mobile battle royale tournaments & custom room esports squad grinds' },
  { name: 'Valorant', category: 'Online Gaming', icon: 'shield', desc: '5v5 tactical shooter with 360Hz monitors, low-ping lines & mechanical keyboards' },
  { name: 'PS5', category: 'Online Gaming', icon: 'gamepad-2', desc: 'Sony PlayStation 5 Pro consoles connected to 4K HDR 120Hz displays' },
  { name: 'PC Gaming', category: 'Online Gaming', icon: 'monitor', desc: 'RTX 4080/4090 watercooled rigs, curved screens & Discord voice LAN' },
  { name: 'FIFA / EA FC', category: 'Online Gaming', icon: 'trophy', desc: 'EA SPORTS FC 24 competitive 1v1 and 2v2 co-op console match stations' },
  { name: 'Call of Duty', category: 'Online Gaming', icon: 'target', desc: 'Modern Warfare & Warzone competitive multiplayer loadouts' },
  { name: 'Counter-Strike 2', category: 'Online Gaming', icon: 'zap', desc: 'CS2 competitive Premier match setups with zero packet loss' },
  { name: 'Racing Simulator', category: 'Online Gaming', icon: 'gauge', desc: 'Direct-drive force feedback wheels, pedal boxes, and bucket cockpits' }
];

const OFFLINE_GAMES_MASTER = [
  { name: 'Volleyball', category: 'Offline Sports', icon: 'activity', desc: 'Championship indoor wooden courts with pro net systems & broadcast LED lights' },
  { name: 'Swimming', category: 'Offline Sports', icon: 'waves', desc: 'Olympic temperature-controlled 50m pool with strict 10-swimmer safety batches' },
  { name: 'Badminton', category: 'Offline Sports', icon: 'wind', desc: 'BWF-grade synthetic vinyl courts with anti-glare overhead lighting' },
  { name: 'Table Tennis', category: 'Offline Sports', icon: 'circle-dot', desc: 'ITTF-approved competition tables with pro bats and 3-star balls' },
  { name: 'Box Cricket', category: 'Offline Sports', icon: 'disc', desc: 'Full-caged astro-turf arena with floodlights for 6v6 box cricket matches' },
  { name: 'Basketball', category: 'Offline Sports', icon: 'dribbble', desc: 'FIBA standard full court & half-court shootout hoops with breakaway rims' },
  { name: 'Snooker / Pool', category: 'Offline Sports', icon: 'sparkles', desc: '12ft English tournament snooker tables with Strachan 6811 tournament cloth' },
  { name: 'Futsal', category: 'Offline Sports', icon: 'futbol', desc: '5-a-side indoor astroturf arena with padded perimeter rebound boards' }
];

function loadStore() {
  if (fs.existsSync(DB_BACKUP_PATH)) {
    try {
      const content = fs.readFileSync(DB_BACKUP_PATH, 'utf8');
      store = JSON.parse(content);
      if (!Array.isArray(store.users)) store.users = [];
      if (!Array.isArray(store.venues)) store.venues = [];
      if (!Array.isArray(store.bookings)) store.bookings = [];
      if (!Array.isArray(store.activity_logs)) store.activity_logs = [];
      if (!Array.isArray(store.squad_beacons)) store.squad_beacons = [];
    } catch (e) {
      console.warn('[Store] Resetting backup storage file.');
    }
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
let UserModel = null;
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
      serverSelectionTimeoutMS: 2500,
      connectTimeoutMS: 2500
    });
    isMongoLive = true;
    mongoStatusText = `Connected to local MongoDB (${MONGODB_URI})`;
    console.log(`[MongoDB] ✅ Connected to local MongoDB at ${MONGODB_URI}`);

    // Load Mongoose models
    UserModel = require('./models/User');
    VenueModel = require('./models/Venue');
    BookingModel = require('./models/Booking');
    ActivityLogModel = require('./models/ActivityLog');
    SquadBeaconModel = require('./models/SquadBeacon');

    // Seed database if needed
    try {
      const { seedDatabase } = require('./seed');
      await seedDatabase();
    } catch (seedErr) {
      console.warn('[MongoDB] Seed script notice:', seedErr.message);
    }

    // Synchronize all collections into store
    const dbUsers = await UserModel.find({}).lean();
    if (dbUsers) store.users = dbUsers.map(u => ({ ...u, _id: u._id.toString() }));

    const dbVenues = await VenueModel.find({}).lean();
    if (dbVenues) store.venues = dbVenues.map(v => ({ ...v, _id: v._id.toString() }));

    const dbBookings = await BookingModel.find({}).sort({ createdAt: -1 }).lean();
    if (dbBookings) store.bookings = dbBookings.map(b => ({
      ...b,
      _id: b._id.toString(),
      venueId: b.venueId ? b.venueId.toString() : b.venueId,
      userId: b.userId ? b.userId.toString() : null
    }));

    const dbLogs = await ActivityLogModel.find({}).sort({ timestamp: -1 }).limit(100).lean();
    if (dbLogs) store.activity_logs = dbLogs.map(l => ({ ...l, _id: l._id.toString() }));

    const dbSquads = await SquadBeaconModel.find({}).sort({ createdAt: -1 }).lean();
    if (dbSquads) store.squad_beacons = dbSquads.map(s => ({
      ...s,
      _id: s._id.toString(),
      venueId: s.venueId ? s.venueId.toString() : s.venueId
    }));

    saveStore();
    console.log(`[MongoDB] Synchronized: ${store.users.length} users, ${store.venues.length} venues, ${store.bookings.length} bookings.`);
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
      collections: ['users', 'venues', 'bookings', 'activity_logs', 'squad_beacons'],
      usersCount: store.users.length,
      venuesCount: store.venues.length,
      bookingsCount: store.bookings.length,
      gamesCount: ONLINE_GAMES_MASTER.length + OFFLINE_GAMES_MASTER.length,
      squadBeaconsCount: store.squad_beacons.length
    }));
  }

  // 2. USER AUTH: POST /api/auth/register
  if (req.method === 'POST' && pathname === '/api/auth/register') {
    const { name, email, phone, city = 'Bangalore', password, favoriteGames = [] } = body;

    if (!name || !email || !phone || !password) {
      res.writeHead(400);
      return res.end(JSON.stringify({ success: false, error: 'Full name, email, phone, and password are required.' }));
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = store.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      res.writeHead(409);
      return res.end(JSON.stringify({ success: false, error: 'An account with this email address already exists. Please log in.' }));
    }

    const newUser = {
      _id: 'usr_' + Date.now() + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      city: city.trim(),
      password: String(password),
      favoriteGames: Array.isArray(favoriteGames) ? favoriteGames : [],
      createdAt: new Date().toISOString()
    };

    if (isMongoLive && UserModel) {
      try {
        const doc = await UserModel.create({
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          city: newUser.city,
          password: newUser.password,
          favoriteGames: newUser.favoriteGames
        });
        newUser._id = doc._id.toString();
      } catch (err) {
        console.warn('Mongoose user create error:', err.message);
      }
    }

    store.users.unshift(newUser);
    saveStore();

    await recordActivity(
      'New user registered',
      `${newUser.name} created an account with preferred city ${newUser.city}.`,
      'user',
      { userId: newUser._id, email: newUser.email }
    );

    const { password: _, ...userSafe } = newUser;
    res.writeHead(201);
    return res.end(JSON.stringify({
      success: true,
      message: 'Account created successfully! Welcome to GameHub.',
      user: userSafe
    }));
  }

  // 3. USER AUTH: POST /api/auth/login
  if (req.method === 'POST' && pathname === '/api/auth/login') {
    const { email, password } = body;

    if (!email || !password) {
      res.writeHead(400);
      return res.end(JSON.stringify({ success: false, error: 'Email and password are required.' }));
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = store.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user || user.password !== String(password)) {
      res.writeHead(401);
      return res.end(JSON.stringify({ success: false, error: 'Invalid email address or password. Please try again.' }));
    }

    await recordActivity(
      'User logged in',
      `${user.name} logged into their GameHub account.`,
      'user',
      { userId: user._id, email: user.email }
    );

    const { password: _, ...userSafe } = user;
    res.writeHead(200);
    return res.end(JSON.stringify({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: userSafe
    }));
  }

  // 4. USER PROFILE: GET /api/users/:id
  const userMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
  if (req.method === 'GET' && userMatch) {
    const userId = userMatch[1];
    const user = store.users.find(u => String(u._id) === String(userId));
    if (!user) {
      res.writeHead(404);
      return res.end(JSON.stringify({ success: false, error: 'User not found' }));
    }

    const userBookings = store.bookings.filter(b =>
      (b.userId && String(b.userId) === String(userId)) ||
      (user.phone && b.phone && b.phone.includes(user.phone))
    );

    const { password: _, ...userSafe } = user;
    res.writeHead(200);
    return res.end(JSON.stringify({
      success: true,
      user: userSafe,
      bookingsCount: userBookings.length,
      bookings: userBookings
    }));
  }

  // 5. GET /api/games (All Online & Offline Games Directory)
  if (req.method === 'GET' && pathname === '/api/games') {
    const allVenues = store.venues.filter(v => v.subscriptionStatus === 'Active');

    const mapVenuesToGame = (gameDef) => {
      const gNorm = gameDef.name.toLowerCase();
      const matching = allVenues.filter(v => {
        if (!Array.isArray(v.gamesOffered)) return false;
        return v.gamesOffered.some(item => {
          const itemNorm = item.toLowerCase();
          return itemNorm.includes(gNorm) || gNorm.includes(itemNorm) ||
            (gNorm.includes('pubg') && itemNorm.includes('pubg')) ||
            (gNorm.includes('bgmi') && itemNorm.includes('bgmi')) ||
            (gNorm.includes('fifa') && (itemNorm.includes('fifa') || itemNorm.includes('fc'))) ||
            (gNorm.includes('snooker') && (itemNorm.includes('snooker') || itemNorm.includes('pool')));
        });
      }).map(v => ({
        _id: v._id,
        shopName: v.shopName,
        city: v.city,
        address: v.address,
        category: v.category,
        pricePerHour: v.pricePerHour,
        courtStatus: v.courtStatus,
        totalCapacity: v.totalCapacity,
        gamesOffered: v.gamesOffered,
        rating: v.rating || 4.8,
        reviewCount: (v.reviews && v.reviews.length) || v.reviewCount || 0,
        image: v.image
      }));
      return { ...gameDef, venues: matching, count: matching.length };
    };

    const onlineGames = ONLINE_GAMES_MASTER.map(mapVenuesToGame);
    const offlineGames = OFFLINE_GAMES_MASTER.map(mapVenuesToGame);

    res.writeHead(200);
    return res.end(JSON.stringify({
      success: true,
      totalGames: onlineGames.length + offlineGames.length,
      onlineGames,
      offlineGames,
      allGames: [...onlineGames, ...offlineGames]
    }));
  }

  // 6. GET /api/venues (With Sorting, Filtering & Reviews)
  if (req.method === 'GET' && pathname === '/api/venues') {
    const { category, city, game, search, sort } = query;
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

    if (game && game !== 'All') {
      const g = game.trim().toLowerCase();
      list = list.filter(v =>
        Array.isArray(v.gamesOffered) &&
        v.gamesOffered.some(item => {
          const itemNorm = item.toLowerCase();
          return itemNorm.includes(g) || g.includes(itemNorm) ||
            (g.includes('pubg') && itemNorm.includes('pubg')) ||
            (g.includes('fifa') && (itemNorm.includes('fifa') || itemNorm.includes('fc')));
        })
      );
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

    // Sort Support: rating, price_asc, price_desc, capacity, newest
    if (sort) {
      if (sort === 'rating') {
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (sort === 'price_asc') {
        list.sort((a, b) => (a.pricePerHour || 0) - (b.pricePerHour || 0));
      } else if (sort === 'price_desc') {
        list.sort((a, b) => (b.pricePerHour || 0) - (a.pricePerHour || 0));
      } else if (sort === 'capacity') {
        list.sort((a, b) => (b.totalCapacity || 0) - (a.totalCapacity || 0));
      } else if (sort === 'newest') {
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      }
    }

    res.writeHead(200);
    return res.end(JSON.stringify({ success: true, count: list.length, venues: list }));
  }

  // 7. GET /api/venues/:id
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

  // 8. POST /api/venues/:id/reviews (Leave a Star Rating & Review)
  const reviewMatch = pathname.match(/^\/api\/venues\/([^/]+)\/reviews$/);
  if (req.method === 'POST' && reviewMatch) {
    const venueId = reviewMatch[1];
    const { userName, userId, rating, comment } = body;

    if (!userName || !rating || !comment) {
      res.writeHead(400);
      return res.end(JSON.stringify({ success: false, error: 'User name, rating (1-5), and comment are required.' }));
    }

    const numRating = Math.max(1, Math.min(5, Number(rating) || 5));
    const venue = store.venues.find(v => String(v._id) === String(venueId));
    if (!venue) {
      res.writeHead(404);
      return res.end(JSON.stringify({ success: false, error: 'Venue not found' }));
    }

    if (!Array.isArray(venue.reviews)) venue.reviews = [];
    const revId = (mongoose && mongoose.Types && mongoose.Types.ObjectId)
      ? new mongoose.Types.ObjectId().toString()
      : 'rev_' + Date.now() + Math.random().toString(36).substring(2, 6);

    const newRev = {
      _id: revId,
      userName: userName.trim(),
      userId: (userId && mongoose && mongoose.Types && mongoose.Types.ObjectId.isValid(userId)) ? userId : null,
      rating: numRating,
      comment: comment.trim(),
      createdAt: new Date().toISOString()
    };

    venue.reviews.unshift(newRev);
    const sum = venue.reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    venue.rating = Math.round((sum / venue.reviews.length) * 10) / 10;
    venue.reviewCount = venue.reviews.length;
    saveStore();

    if (isMongoLive && VenueModel) {
      try {
        await VenueModel.findByIdAndUpdate(venueId, {
          $push: { reviews: { $each: [newRev], $position: 0 } },
          rating: venue.rating,
          reviewCount: venue.reviewCount
        });
      } catch (err) {
        console.warn('Review write error:', err.message);
      }
    }

    await recordActivity(
      'Venue review posted',
      `${userName} gave ${numRating}★ to ${venue.shopName}: "${comment.substring(0, 50)}..."`,
      'review',
      { venueId: venue._id, rating: numRating }
    );

    res.writeHead(201);
    return res.end(JSON.stringify({
      success: true,
      message: 'Thank you for your rating & review!',
      rating: venue.rating,
      reviewCount: venue.reviewCount,
      venue: {
        _id: venue._id,
        shopName: venue.shopName,
        rating: venue.rating,
        reviewCount: venue.reviewCount,
        reviews: venue.reviews
      },
      review: newRev
    }));
  }

  // 9. GET /api/venues/:id/availability (Ignores Cancelled Bookings!)
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

    // Filter ONLY active/confirmed bookings (cancelled bookings free up the slot!)
    const matchingBookings = store.bookings.filter(b =>
      String(b.venueId) === String(venueId) &&
      b.date === date &&
      b.timeSlot === timeSlot &&
      b.status !== 'Cancelled'
    );

    const bookedSeats = [];
    let bookedSpots = 0;
    matchingBookings.forEach(b => {
      if (Array.isArray(b.seats)) {
        b.seats.forEach(s => bookedSeats.push(s));
      }
      bookedSpots += (b.spotsCount || (b.seats ? b.seats.length : 1));
    });

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
      lockedSeats: lockedSeatsInfo,
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

  // 10. POST /api/venues/:id/lock-seat
  const lockMatch = pathname.match(/^\/api\/venues\/([^/]+)\/lock-seat$/);
  if (req.method === 'POST' && lockMatch) {
    const venueId = lockMatch[1];
    const { date, timeSlot, seatId, sessionId } = body;

    if (!date || !timeSlot || !seatId || !sessionId) {
      res.writeHead(400);
      return res.end(JSON.stringify({ success: false, error: 'Missing lock parameters (date, timeSlot, seatId, sessionId)' }));
    }

    cleanExpiredSeatLocks();

    const isAlreadyBooked = store.bookings.some(b =>
      String(b.venueId) === String(venueId) &&
      b.date === date &&
      b.timeSlot === timeSlot &&
      b.status !== 'Cancelled' &&
      Array.isArray(b.seats) &&
      b.seats.includes(seatId)
    );

    if (isAlreadyBooked) {
      res.writeHead(409);
      return res.end(JSON.stringify({ success: false, error: `Seat ${seatId} is already booked.` }));
    }

    const lockKey = `${venueId}_${date}_${timeSlot}`;
    if (!seatLocks.has(lockKey)) seatLocks.set(lockKey, {});
    const locks = seatLocks.get(lockKey);

    if (locks[seatId] && locks[seatId].sessionId !== sessionId && locks[seatId].expiresAt > Date.now()) {
      res.writeHead(409);
      return res.end(JSON.stringify({
        success: false,
        error: `Seat ${seatId} is currently held by another player. Try again in a few minutes.`
      }));
    }

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

  // 11. POST /api/venues/:id/unlock-seat
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

  // 12. POST /api/bookings (Create Reservation)
  if (req.method === 'POST' && pathname === '/api/bookings') {
    const {
      venueId,
      userId = null,
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

    if (Array.isArray(seats) && seats.length > 0) {
      const existing = store.bookings.filter(b =>
        String(b.venueId) === String(venueId) &&
        b.date === date &&
        b.timeSlot === timeSlot &&
        b.status !== 'Cancelled'
      );
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

    const isSwimming = venue.gamesOffered && venue.gamesOffered.some(g => g.toLowerCase().includes('swim'));
    if (isSwimming) {
      const existing = store.bookings.filter(b =>
        String(b.venueId) === String(venueId) &&
        b.date === date &&
        b.timeSlot === timeSlot &&
        b.status !== 'Cancelled'
      );
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

    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const bookingId = `#GH-${randomDigits}`;
    const paymentStatus = paymentMethod === 'Pay Online' ? 'Paid Online' : 'Pay at Venue (Pending)';

    const newBooking = {
      _id: 'bkg_' + Date.now() + Math.random().toString(36).substring(2, 6),
      bookingId,
      userId: userId || null,
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
      status: 'Confirmed',
      checkInStatus: 'Booked',
      checkInTime: null,
      totalAmount,
      qrCodeData: '',
      createdAt: new Date().toISOString()
    };

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
          userId: (newBooking.userId && mongoose && mongoose.Types && mongoose.Types.ObjectId.isValid(newBooking.userId)) ? newBooking.userId : null,
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
          status: 'Confirmed',
          checkInStatus: 'Booked',
          totalAmount,
          qrCodeData: newBooking.qrCodeData
        });
        newBooking._id = doc._id.toString();
      } catch (e) {
        console.warn('Mongoose booking creation error:', e.message);
      }
    }

    const lockKey = `${venueId}_${date}_${timeSlot}`;
    if (seatLocks.has(lockKey)) {
      const locks = seatLocks.get(lockKey);
      seats.forEach(s => delete locks[s]);
    }

    store.bookings.unshift(newBooking);
    saveStore();

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

  // 13. CANCEL BOOKING: PATCH /api/bookings/:id/cancel
  const cancelMatch = pathname.match(/^\/api\/bookings\/([^/]+)\/cancel$/);
  if (req.method === 'PATCH' && cancelMatch) {
    const bookingIdentifier = decodeURIComponent(cancelMatch[1]).trim();
    const rawCode = bookingIdentifier.replace(/^#/, '');
    const cleanId = `#${rawCode}`;

    const booking = store.bookings.find(b =>
      String(b._id) === String(bookingIdentifier) ||
      b.bookingId.toLowerCase() === bookingIdentifier.toLowerCase() ||
      b.bookingId.toLowerCase() === cleanId.toLowerCase() ||
      b.bookingId.replace(/^#/, '').toLowerCase() === rawCode.toLowerCase()
    );

    if (!booking) {
      res.writeHead(404);
      return res.end(JSON.stringify({ success: false, error: 'Booking not found.' }));
    }

    if (booking.status === 'Cancelled') {
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true, message: 'This booking is already cancelled.', booking }));
    }

    booking.status = 'Cancelled';
    booking.checkInStatus = 'Cancelled';
    if (booking.paymentMethod === 'Pay Online') {
      booking.paymentStatus = 'Refunded';
    }
    saveStore();

    if (isMongoLive && BookingModel) {
      try {
        await BookingModel.findOneAndUpdate(
          { $or: [{ _id: booking._id }, { bookingId: booking.bookingId }] },
          { status: 'Cancelled', checkInStatus: 'Cancelled', paymentStatus: booking.paymentStatus }
        );
      } catch (err) {
        console.warn('Booking cancel update error:', err.message);
      }
    }

    await recordActivity(
      'Booking cancelled by player',
      `Customer ${booking.playerName} cancelled reservation ${booking.bookingId} (${booking.venueName}). Stations/court spots have been freed up.`,
      'booking',
      { bookingId: booking.bookingId, venueId: booking.venueId }
    );

    res.writeHead(200);
    return res.end(JSON.stringify({
      success: true,
      message: `Booking ${booking.bookingId} successfully cancelled. Reserved stations/spots have been released!`,
      booking
    }));
  }

  // 14. GET /api/bookings (List / Search Bookings)
  if (req.method === 'GET' && pathname === '/api/bookings') {
    const { phone, bookingId, venueId, userId } = query;
    let list = [...store.bookings];

    if (userId) list = list.filter(b => b.userId && String(b.userId) === String(userId));
    if (phone) list = list.filter(b => b.phone && b.phone.includes(phone.trim()));
    if (venueId) list = list.filter(b => String(b.venueId) === String(venueId));
    if (bookingId) list = list.filter(b => b.bookingId.toLowerCase().includes(bookingId.trim().toLowerCase()));

    res.writeHead(200);
    return res.end(JSON.stringify({ success: true, count: list.length, bookings: list }));
  }

  // 15. POST /api/bookings/verify-checkin (Receptionist Scanner)
  if (req.method === 'POST' && pathname === '/api/bookings/verify-checkin') {
    const { bookingId, qrPayload } = body;
    let targetId = (bookingId || '').trim();

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

    const cleanId = targetId.startsWith('#') ? targetId : `#${targetId}`;
    const booking = store.bookings.find(b => b.bookingId.toLowerCase() === cleanId.toLowerCase());

    if (!booking) {
      res.writeHead(404);
      return res.end(JSON.stringify({
        success: false,
        error: `Invalid Ticket ID [${cleanId}]. No matching reservation found in MongoDB.`
      }));
    }

    if (booking.status === 'Cancelled') {
      res.writeHead(400);
      return res.end(JSON.stringify({
        success: false,
        error: `⛔ Entry Denied! Ticket ${cleanId} was CANCELLED by the customer.`
      }));
    }

    if (booking.checkInStatus === 'Checked-In') {
      res.writeHead(200);
      return res.end(JSON.stringify({
        success: true,
        alreadyCheckedIn: true,
        message: `⚠️ Ticket already scanned and checked in at ${new Date(booking.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        booking
      }));
    }

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

  // 16. OWNER INSIGHTS: GET /api/owner/insights
  if (req.method === 'GET' && pathname === '/api/owner/insights') {
    const { venueId } = query;
    let relevantBookings = store.bookings;
    if (venueId && venueId !== 'All') {
      relevantBookings = relevantBookings.filter(b => String(b.venueId) === String(venueId));
    }

    const totalBookings = relevantBookings.length;
    const activeBookings = relevantBookings.filter(b => b.status !== 'Cancelled');
    const cancelledBookings = relevantBookings.filter(b => b.status === 'Cancelled');

    let totalRevenue = 0;
    let onlineRevenue = 0;
    let venuePendingRevenue = 0;
    let snacksRevenue = 0;

    activeBookings.forEach(b => {
      totalRevenue += (b.totalAmount || 0);
      if (b.paymentMethod === 'Pay Online') {
        onlineRevenue += (b.totalAmount || 0);
      } else {
        venuePendingRevenue += (b.totalAmount || 0);
      }
      snacksRevenue += (b.snacksTotal || 0);
    });

    res.writeHead(200);
    return res.end(JSON.stringify({
      success: true,
      totalBookings,
      activeCount: activeBookings.length,
      confirmedBookings: activeBookings.length,
      cancelledCount: cancelledBookings.length,
      cancelledBookings: cancelledBookings.length,
      grossRevenue: totalRevenue,
      totalRevenue,
      onlineRevenue,
      venueRevenue: venuePendingRevenue,
      venuePendingRevenue,
      snacksRevenue,
      venuesCount: store.venues.length
    }));
  }

  // 17. POST /api/venues (Owner Onboarding + ₹999/month Subscription)
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

    const formattedGames = Array.isArray(gamesOffered)
      ? gamesOffered.map(g => g.trim()).filter(Boolean)
      : String(gamesOffered).split(',').map(s => s.trim()).filter(Boolean);

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
      gamesOffered: formattedGames,
      pricePerHour: Number(pricePerHour) || 150,
      totalCapacity: Number(totalCapacity) || 20,
      courtStatus: 'Empty',
      subscriptionStatus: 'Active',
      subscriptionFee: 999,
      subscriptionPaid: true,
      subscriptionPaidAt: new Date().toISOString(),
      description: description.trim() || `Verified ${category} facility in ${city}.`,
      rating: 5.0,
      reviewCount: 0,
      reviews: [],
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

    await recordActivity(
      'New shop registered',
      `Owner ${ownerName} registered "${shopName}" in ${city} with ${newVenue.totalCapacity} capacity offering [${formattedGames.join(', ')}].`,
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

  // 18. PATCH /api/venues/:id/status (Owner Court Toggle)
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

  // 19. GET /api/activity-logs
  if (req.method === 'GET' && pathname === '/api/activity-logs') {
    const logs = store.activity_logs.slice(0, 50);
    res.writeHead(200);
    return res.end(JSON.stringify({ success: true, count: logs.length, logs }));
  }

  // 20. GET /api/squads
  if (req.method === 'GET' && pathname === '/api/squads') {
    const { category, city, game, status } = query;
    let list = [...store.squad_beacons];

    if (category && category !== 'All') list = list.filter(s => s.category === category);
    if (city && city !== 'All') list = list.filter(s => s.city.toLowerCase() === city.toLowerCase());
    if (game && game !== 'All') list = list.filter(s => s.game.toLowerCase().includes(game.toLowerCase()));
    if (status && status !== 'All') list = list.filter(s => s.status === status);

    res.writeHead(200);
    return res.end(JSON.stringify({ success: true, count: list.length, squads: list }));
  }

  // 21. POST /api/squads
  if (req.method === 'POST' && pathname === '/api/squads') {
    const {
      title, venueId, venueName, city, category, game, date, timeSlot,
      spotsTotal = 5, spotsNeeded = 2, hostName, hostPhone, skillLevel = 'All Skill Levels', description = ''
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
      members: [{ name: `${hostName.trim()} (Host)`, phone: hostPhone.trim(), joinedAt: new Date().toISOString() }],
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

    await recordActivity(
      'New squad beacon posted',
      `${hostName} posted squad beacon: "${title}" for ${game} at ${venueName}.`,
      'system',
      { squadId: newSquad._id, game, city }
    );

    res.writeHead(201);
    return res.end(JSON.stringify({ success: true, message: 'Squad Matchmaking Beacon posted successfully!', squad: newSquad }));
  }

  // 22. POST /api/squads/:id/join
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

    squad.members.push({ name: name.trim(), phone: phone.trim(), joinedAt: new Date().toISOString() });
    squad.spotsNeeded = Math.max(0, squad.spotsNeeded - 1);
    if (squad.spotsNeeded === 0) squad.status = 'Full';
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
  '.jpeg': 'image/jpeg',
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
    console.error(`\n⚠️ [Server Error] Port ${PORT} is already in use.`);
    console.error(`👉 Either:`);
    console.error(`   1. GameHub is ALREADY active and serving traffic at http://localhost:${PORT}`);
    console.error(`   2. Run on a different port: $env:PORT="5001"; node server.js (PowerShell) or PORT=5001 node server.js\n`);
    process.exit(1);
  } else {
    console.error('[Server] Failed to start:', err.message);
    process.exit(1);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 GameHub Pro — Unified Booking Platform running!`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`📦 MongoDB Connection: ${MONGODB_URI}`);
  console.log(`⚡ Collections: users, venues, bookings, activity_logs, squad_beacons`);
  console.log(`✨ Features: Auth, Reviews, Cancellation, Insights, Seat Locking`);
  console.log(`=======================================================`);
});
