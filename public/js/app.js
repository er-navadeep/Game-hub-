/**
 * GameHub — Unified Booking Platform Controller
 * Node.js + Express + MongoDB (Mongoose) Localhost: mongodb://127.0.0.1:27017/gamehub
 * 
 * Features:
 * 1. Receptionist QR Code Scanner & Check-in Verification
 * 2. Existing Games Directory (All Online & Offline Games)
 * 3. In-Venue F&B Cafe & Snack Bar Menu at Checkout
 * 4. Real-time Seat Locking Engine (5-minute auto-release)
 * 5. Squad Finder & Matchmaking Beacon Board
 * 6. User Authentication, Demo Logins & Profile Management
 * 7. Rating & Review System with Live Score Recalculation
 * 8. Booking Cancellation & Instant Slot Liberation
 * 9. Real-Time Owner Analytics & Revenue Insights
 */

// Master Lists of Standard Online and Offline Games
const ALL_ONLINE_GAMES = [
  'PUBG / BGMI',
  'Free Fire',
  'Valorant',
  'PS5',
  'PC Gaming',
  'FIFA / EA FC',
  'Call of Duty',
  'Counter-Strike 2',
  'Racing Simulator'
];

const ALL_OFFLINE_GAMES = [
  'Volleyball',
  'Swimming',
  'Badminton',
  'Table Tennis',
  'Box Cricket',
  'Basketball',
  'Snooker / Pool',
  'Futsal'
];

// Unique client session ID for real-time seat locking
let CLIENT_SESSION_ID = localStorage.getItem('gh_client_session_id');
if (!CLIENT_SESSION_ID) {
  CLIENT_SESSION_ID = 'sess_' + Math.random().toString(36).substring(2, 10) + Date.now();
  localStorage.setItem('gh_client_session_id', CLIENT_SESSION_ID);
}

// In-Venue F&B Cafe Menu
const SNACK_MENU = [
  { id: 'snk_1', name: 'Red Bull Energy Drink (250ml)', price: 125, desc: 'Chilled taurine boost for peak focus', icon: 'zap' },
  { id: 'snk_2', name: 'Monster Energy Super Fuel (350ml)', price: 130, desc: 'Electrolytes + B-vitamins', icon: 'flame' },
  { id: 'snk_3', name: 'Hot Peri-Peri Cheese Maggi', price: 75, desc: 'Fresh cooked gamer favorite snack', icon: 'utensils' },
  { id: 'snk_4', name: 'Crispy Salted French Fries', price: 90, desc: 'Golden fries with spiced dip', icon: 'package' },
  { id: 'snk_5', name: 'Whey Protein Post-Workout Shake', price: 150, desc: '25g protein recovery shake', icon: 'dumbbell' },
  { id: 'snk_6', name: 'Enerzal Electrolyte Citrus Drink', price: 50, desc: 'Hydration for intense sports matches', icon: 'droplet' }
];

// Available hourly slots
const HOURLY_SLOTS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
  '05:00 PM - 06:00 PM',
  '06:00 PM - 07:00 PM',
  '07:00 PM - 08:00 PM',
  '08:00 PM - 09:00 PM'
];

// Application State
const state = {
  currentView: 'explore',
  currentUser: null,
  venues: [],
  filteredVenues: [],
  categoryFilter: 'All',
  cityFilter: 'All',
  searchQuery: '',
  activeGameFilter: null,
  gamesData: { allGames: [], onlineGames: [], offlineGames: [] },
  gamesCategoryFilter: 'All',
  gamesSearchQuery: '',
  selectedOwnerGames: new Set(),
  selectedFavGames: new Set(),
  uploadedOwnerImagePreview: '',
  allBookings: [],
  squads: [],
  squadCategoryFilter: 'All',
  currentBookingVenue: null,
  selectedDate: '',
  selectedSlot: '05:00 PM - 06:00 PM',
  selectedSeats: [],
  selectedSnacks: {},
  swimmingSpots: 1,
  currentAvailability: null,
  seatLockTimer: null,
  seatLockRemainingSeconds: 300,
  joiningSquad: null,
  currentReviewVenueId: null,
  reviewStarRating: 5,
  dbStatus: { connected: false, message: 'Connecting...' }
};

function getDateOffset(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  // Load persisted user if any
  try {
    const saved = localStorage.getItem('gh_user');
    if (saved) {
      state.currentUser = JSON.parse(saved);
    }
  } catch (e) {
    state.currentUser = null;
  }

  updateNavAuthUI();
  renderRegFavoriteGamesChips();

  state.selectedDate = getDateOffset(0);
  const dateInput = document.getElementById('bookingCustomDate');
  if (dateInput) dateInput.value = state.selectedDate;

  renderOwnerGameChips();

  if (window.lucide) lucide.createIcons();

  await checkDbStatus();
  await fetchVenues();
  await fetchGames();
  await fetchBookings();
  await fetchSquads();
  await fetchActivityLogsMini();
  await fetchOwnerInsights();

  setInterval(checkDbStatus, 15000);
});

// Check Database connection
async function checkDbStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    state.dbStatus = data;

    const pill = document.getElementById('dbStatusPill');
    const text = document.getElementById('dbStatusText');

    if (data.dbConnected) {
      pill.className = 'flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-semibold text-emerald-800 shadow-sm';
      text.innerText = 'MongoDB: 127.0.0.1:27017';
      pill.title = `Connected to local MongoDB (${data.mongoUri})`;
    } else {
      pill.className = 'flex items-center space-x-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] font-semibold text-amber-800 shadow-sm';
      text.innerText = 'Local Persistence Active';
      pill.title = data.dbStatusMessage || 'Active local persistence mode';
    }
  } catch (err) {
    console.warn('Status check failed:', err.message);
  }
}

// ==========================================
// NAVIGATION (5 CORE TABS + MODALS)
// ==========================================
function navigate(viewName) {
  state.currentView = viewName;

  const views = ['explore', 'games', 'tickets', 'owner', 'squads'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    const navBtn = document.getElementById(`nav-${v}`);

    if (v === viewName) {
      if (el) el.classList.remove('hidden');
      if (navBtn) {
        navBtn.className = 'px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all flex items-center space-x-1.5 text-blue-600 bg-blue-50';
      }
    } else {
      if (el) el.classList.add('hidden');
      if (navBtn) {
        navBtn.className = 'px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center space-x-1.5';
      }
    }
  });

  if (viewName === 'explore') fetchVenues();
  if (viewName === 'games') fetchGames();
  if (viewName === 'tickets') fetchBookings();
  if (viewName === 'owner') {
    fetchOwnerVenues();
    fetchActivityLogsMini();
    fetchOwnerInsights();
  }
  if (viewName === 'squads') fetchSquads();

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (window.lucide) lucide.createIcons();
}

function toggleMobileMenu() {
  const m = document.getElementById('mobileMenu');
  if (m) m.classList.toggle('hidden');
}

// ==========================================
// USER AUTHENTICATION & PROFILE SYSTEM
// ==========================================
function updateNavAuthUI() {
  const navLoggedOut = document.getElementById('authNavLoggedOut');
  const navLoggedIn = document.getElementById('authNavLoggedIn');
  const navUserInitial = document.getElementById('navUserInitial');
  const navUserName = document.getElementById('navUserName');

  const mobileLoggedOut = document.getElementById('authMobileLoggedOut');
  const mobileLoggedIn = document.getElementById('authMobileLoggedIn');
  const mobileUserName = document.getElementById('mobileUserName');

  if (state.currentUser) {
    const firstName = (state.currentUser.name || 'Player').split(' ')[0];
    const initial = (state.currentUser.name || 'P')[0].toUpperCase();

    if (navLoggedOut) navLoggedOut.classList.add('hidden');
    if (navLoggedIn) navLoggedIn.classList.remove('hidden');
    if (navUserInitial) navUserInitial.innerText = initial;
    if (navUserName) navUserName.innerText = firstName;

    if (mobileLoggedOut) mobileLoggedOut.classList.add('hidden');
    if (mobileLoggedIn) mobileLoggedIn.classList.remove('hidden');
    if (mobileUserName) mobileUserName.innerText = firstName;
  } else {
    if (navLoggedOut) navLoggedOut.classList.remove('hidden');
    if (navLoggedIn) navLoggedIn.classList.add('hidden');

    if (mobileLoggedOut) mobileLoggedOut.classList.remove('hidden');
    if (mobileLoggedIn) mobileLoggedIn.classList.add('hidden');
  }

  if (window.lucide) lucide.createIcons();
}

function openAuthModal(defaultTab = 'login') {
  switchAuthTab(defaultTab);
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.add('hidden');
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('authTabBtnLogin');
  const tabRegister = document.getElementById('authTabBtnRegister');
  const formLogin = document.getElementById('loginForm');
  const formRegister = document.getElementById('registerForm');
  const title = document.getElementById('authModalTitle');

  if (tab === 'login') {
    if (tabLogin) tabLogin.className = 'flex-1 py-3 text-center text-blue-600 border-b-2 border-blue-600 bg-white';
    if (tabRegister) tabRegister.className = 'flex-1 py-3 text-center text-slate-500 hover:text-slate-800';
    if (formLogin) formLogin.classList.remove('hidden');
    if (formRegister) formRegister.classList.add('hidden');
    if (title) title.innerText = 'Sign In to GameHub';
  } else {
    if (tabLogin) tabLogin.className = 'flex-1 py-3 text-center text-slate-500 hover:text-slate-800';
    if (tabRegister) tabRegister.className = 'flex-1 py-3 text-center text-emerald-600 border-b-2 border-emerald-600 bg-white';
    if (formLogin) formLogin.classList.add('hidden');
    if (formRegister) formRegister.classList.remove('hidden');
    if (title) title.innerText = 'Create Player Account';
  }
}

function renderRegFavoriteGamesChips() {
  const container = document.getElementById('regFavoriteGamesChips');
  if (!container) return;

  const all = [...ALL_ONLINE_GAMES, ...ALL_OFFLINE_GAMES];
  container.innerHTML = all.map(g => {
    const isSelected = state.selectedFavGames.has(g);
    return `
      <button type="button" onclick="toggleRegFavGameChip('${g}')" class="px-2 py-1 rounded-lg text-[10px] font-semibold border transition ${
        isSelected
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
      }">
        ${isSelected ? '✓ ' : ''}${g}
      </button>
    `;
  }).join('');
}

function toggleRegFavGameChip(game) {
  if (state.selectedFavGames.has(game)) {
    state.selectedFavGames.delete(game);
  } else {
    state.selectedFavGames.add(game);
  }
  renderRegFavoriteGamesChips();
}

async function demoLogin(key) {
  let email = 'aman@gamehub.demo';
  if (key === 'priya') email = 'priya@gamehub.demo';
  if (key === 'rohan') email = 'rohan@gamehub.demo';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' })
    });
    const data = await res.json();
    if (data.success) {
      state.currentUser = data.user;
      localStorage.setItem('gh_user', JSON.stringify(data.user));
      updateNavAuthUI();
      closeAuthModal();

      // If booking modal is open, auto-fill credentials
      const pName = document.getElementById('bmPlayerName');
      const pPhone = document.getElementById('bmPlayerPhone');
      if (pName && !pName.value) pName.value = data.user.name;
      if (pPhone && !pPhone.value) pPhone.value = data.user.phone;

      alert(`👋 Welcome back, ${data.user.name}! You are now signed in to GameHub.`);
    } else {
      alert(`Demo login failed: ${data.error || 'Server error'}`);
    }
  } catch (err) {
    alert(`Demo login error: ${err.message}`);
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const btn = document.getElementById('loginSubmitBtn');

  if (!email || !password) return alert('Please enter both email and password.');

  btn.disabled = true;
  btn.innerHTML = 'Signing In...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      state.currentUser = data.user;
      localStorage.setItem('gh_user', JSON.stringify(data.user));
      updateNavAuthUI();
      closeAuthModal();

      const pName = document.getElementById('bmPlayerName');
      const pPhone = document.getElementById('bmPlayerPhone');
      if (pName && !pName.value) pName.value = data.user.name;
      if (pPhone && !pPhone.value) pPhone.value = data.user.phone;

      alert(`👋 Welcome back, ${data.user.name}!`);
    } else {
      alert(`Login failed: ${data.error || 'Invalid credentials'}`);
    }
  } catch (err) {
    alert(`Login error: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Sign In';
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('regUserName').value.trim();
  const email = document.getElementById('regUserEmail').value.trim();
  const phone = document.getElementById('regUserPhone').value.trim();
  const city = document.getElementById('regUserCity').value;
  const password = document.getElementById('regUserPassword').value.trim();
  const btn = document.getElementById('regUserSubmitBtn');

  if (!name || !email || !phone || !password) {
    return alert('Please fill in all required fields.');
  }

  btn.disabled = true;
  btn.innerHTML = 'Creating Account in MongoDB...';

  const favoriteGames = Array.from(state.selectedFavGames);

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, city, password, favoriteGames })
    });
    const data = await res.json();
    if (data.success) {
      state.currentUser = data.user;
      localStorage.setItem('gh_user', JSON.stringify(data.user));
      updateNavAuthUI();
      closeAuthModal();

      const pName = document.getElementById('bmPlayerName');
      const pPhone = document.getElementById('bmPlayerPhone');
      if (pName) pName.value = data.user.name;
      if (pPhone) pPhone.value = data.user.phone;

      alert(`🎉 Account created successfully in MongoDB!\nWelcome to GameHub, ${data.user.name}!`);
    } else {
      alert(`Registration failed: ${data.error || 'Server error'}`);
    }
  } catch (err) {
    alert(`Registration error: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Create Account in MongoDB';
  }
}

function handleLogout() {
  localStorage.removeItem('gh_user');
  state.currentUser = null;
  updateNavAuthUI();
  closeUserProfileModal();
  alert('You have been signed out.');
}

function openUserProfileModal() {
  if (!state.currentUser) {
    openAuthModal('login');
    return;
  }

  const u = state.currentUser;
  const initial = (u.name || 'P')[0].toUpperCase();

  const elAvatar = document.getElementById('profAvatar');
  const elName = document.getElementById('profName');
  const elEmail = document.getElementById('profEmail');
  const elPhone = document.getElementById('profPhone');
  const elCity = document.getElementById('profCity');
  const elGames = document.getElementById('profGamesList');

  if (elAvatar) elAvatar.innerText = initial;
  if (elName) elName.innerText = u.name;
  if (elEmail) elEmail.innerText = u.email;
  if (elPhone) elPhone.innerText = u.phone || 'Not provided';
  if (elCity) elCity.innerText = u.city || 'Bangalore';

  if (elGames) {
    const games = Array.isArray(u.favoriteGames) && u.favoriteGames.length > 0
      ? u.favoriteGames
      : ['PUBG / BGMI', 'Box Cricket'];
    elGames.innerHTML = games.map(g =>
      `<span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">${g}</span>`
    ).join(' ');
  }

  const modal = document.getElementById('userProfileModal');
  if (modal) modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeUserProfileModal() {
  const modal = document.getElementById('userProfileModal');
  if (modal) modal.classList.add('hidden');
}

// ==========================================
// 1. EXPLORE HUBS & VENUE CARDS
// ==========================================
async function fetchVenues() {
  try {
    const params = new URLSearchParams();
    if (state.categoryFilter !== 'All') params.append('category', state.categoryFilter);
    if (state.cityFilter !== 'All') params.append('city', state.cityFilter);
    if (state.activeGameFilter) params.append('game', state.activeGameFilter);
    if (state.searchQuery.trim()) params.append('search', state.searchQuery.trim());

    const sortEl = document.getElementById('sortFilter');
    if (sortEl && sortEl.value) {
      params.append('sort', sortEl.value);
    }

    const res = await fetch(`/api/venues?${params.toString()}`);
    const data = await res.json();

    if (data.success) {
      state.venues = data.venues || [];
      renderVenues(state.venues);
    }
  } catch (err) {
    console.error('Failed to fetch venues:', err);
  }
}

function renderVenues(venues) {
  const grid = document.getElementById('venuesGrid');
  const noVenues = document.getElementById('noVenuesNotice');
  const countText = document.getElementById('venueCountText');

  if (countText) countText.innerText = venues.length;

  // Active game banner
  const filterBanner = document.getElementById('activeGameFilterBanner');
  const filterGameName = document.getElementById('activeGameFilterName');
  if (state.activeGameFilter) {
    if (filterBanner) filterBanner.classList.remove('hidden');
    if (filterGameName) filterGameName.innerText = state.activeGameFilter;
  } else {
    if (filterBanner) filterBanner.classList.add('hidden');
  }

  if (venues.length === 0) {
    if (grid) grid.innerHTML = '';
    if (noVenues) noVenues.classList.remove('hidden');
    return;
  }
  if (noVenues) noVenues.classList.add('hidden');

  if (!grid) return;

  grid.innerHTML = venues.map(venue => {
    const isOnline = venue.category === 'Online Gaming';
    const isBoth = venue.category === 'Both';
    const isOffline = venue.category === 'Offline Sports';

    const categoryBadgeClass = isOnline
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : (isOffline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-purple-50 text-purple-700 border-purple-200');

    // Separate Online vs Offline Games offered at this venue
    const gamesList = Array.isArray(venue.gamesOffered) ? venue.gamesOffered : [];
    const onlineGamesHere = [];
    const offlineGamesHere = [];

    gamesList.forEach(g => {
      const gLower = g.toLowerCase();
      const isOff = ALL_OFFLINE_GAMES.some(og => gLower.includes(og.toLowerCase()) || og.toLowerCase().includes(gLower));
      if (isOff) {
        offlineGamesHere.push(g);
      } else {
        onlineGamesHere.push(g);
      }
    });

    const onlineBadges = onlineGamesHere.map(g =>
      `<span class="tag-online text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center space-x-1" title="Online Game">
        <i data-lucide="monitor" class="w-3 h-3 text-blue-500"></i>
        <span>${g}</span>
      </span>`
    ).join(' ');

    const offlineBadges = offlineGamesHere.map(g =>
      `<span class="tag-offline text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center space-x-1" title="Offline Sport">
        <i data-lucide="trophy" class="w-3 h-3 text-emerald-600"></i>
        <span>${g}</span>
      </span>`
    ).join(' ');

    // Live Availability Summary calculation
    let availabilityBadgeHtml = '';
    const isSwimming = gamesList.some(g => g.toLowerCase().includes('swim'));
    const isVolleyball = gamesList.some(g => g.toLowerCase().includes('volley'));
    const isCourtSport = isOffline && !isSwimming;

    if (isOnline) {
      availabilityBadgeHtml = `
        <span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold badge-available">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>${venue.totalCapacity || 24} Stations Ready</span>
        </span>
      `;
    } else if (isSwimming) {
      availabilityBadgeHtml = `
        <span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold badge-available">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Swimming: 6/10 Slots Filled (4 spots left)</span>
        </span>
      `;
    } else if (isVolleyball || isCourtSport) {
      const isCourtEmpty = venue.courtStatus === 'Empty';
      const courtLabel = isVolleyball ? 'Volleyball Court' : (gamesList[0] || 'Court');
      availabilityBadgeHtml = isCourtEmpty
        ? `
          <span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold badge-available">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>${courtLabel}: Empty (Ready)</span>
          </span>
        `
        : `
          <span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold badge-occupied">
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>${courtLabel}: Occupied</span>
          </span>
        `;
    } else if (isBoth) {
      const isCourtEmpty = venue.courtStatus === 'Empty';
      availabilityBadgeHtml = `
        <div class="flex flex-col gap-1">
          <span class="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold badge-available">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>16 Stations Ready</span>
          </span>
          <span class="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${isCourtEmpty ? 'badge-available' : 'badge-occupied'}">
            <span class="w-1.5 h-1.5 rounded-full ${isCourtEmpty ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
            <span>Court: ${isCourtEmpty ? 'Empty (Ready)' : 'Occupied'}</span>
          </span>
        </div>
      `;
    }

    const mapLink = venue.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(venue.shopName + ' ' + venue.city)}`;
    const reviewCount = venue.reviewCount !== undefined ? venue.reviewCount : (venue.reviews ? venue.reviews.length : 0);
    const ratingDisplay = Number(venue.rating || 4.8).toFixed(1);

    return `
      <div class="gamehub-card overflow-hidden flex flex-col justify-between">
        
        <div>
          <!-- Venue Cover Photo -->
          <div class="relative h-48 w-full bg-slate-100 overflow-hidden">
            <img src="${venue.image}" alt="${venue.shopName}" class="w-full h-full object-cover transition-transform duration-300 hover:scale-105" onerror="this.src='https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80'">
            <div class="absolute top-3 left-3">
              <span class="px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-sm ${categoryBadgeClass}">
                ${venue.category}
              </span>
            </div>
            <div class="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-lg text-xs font-bold text-slate-800 shadow-sm flex items-center space-x-1">
              <i data-lucide="star" class="w-3.5 h-3.5 text-amber-500 fill-amber-500"></i>
              <span>${ratingDisplay}</span>
              <span class="text-[10px] text-slate-500 font-normal">(${reviewCount})</span>
            </div>
          </div>

          <!-- Card Body -->
          <div class="p-5 space-y-3.5">
            <div>
              <h3 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight">${venue.shopName}</h3>
              <p class="text-xs text-slate-500 line-clamp-1 mt-0.5">${venue.description || 'Verified gaming and sports arena.'}</p>
            </div>

            <!-- Address & Map Link -->
            <div class="flex items-start justify-between text-xs text-slate-600 gap-2">
              <div class="flex items-start space-x-1.5 flex-1">
                <i data-lucide="map-pin" class="w-4 h-4 text-slate-400 shrink-0 mt-0.5"></i>
                <span class="line-clamp-2">${venue.address}</span>
              </div>
              <a href="${mapLink}" target="_blank" rel="noopener noreferrer" class="text-blue-600 font-semibold hover:underline shrink-0 flex items-center space-x-1 text-[11px] pt-0.5">
                <span>View Map</span>
                <i data-lucide="external-link" class="w-3 h-3"></i>
              </a>
            </div>

            <!-- Phone -->
            <div class="flex items-center space-x-1.5 text-xs text-slate-600">
              <i data-lucide="phone" class="w-3.5 h-3.5 text-slate-400"></i>
              <a href="tel:${venue.phone}" class="hover:text-blue-600 font-medium">${venue.phone}</a>
            </div>

            <!-- Distinct Online and Offline Games Badges (FEATURE REQUIREMENT) -->
            <div class="space-y-1.5 pt-1">
              ${onlineBadges ? `<div class="flex flex-wrap gap-1">${onlineBadges}</div>` : ''}
              ${offlineBadges ? `<div class="flex flex-wrap gap-1">${offlineBadges}</div>` : ''}
            </div>

            <!-- Live Status Summary -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>${availabilityBadgeHtml}</div>
              <div class="text-right">
                <span class="text-xs text-slate-400 block text-[10px] uppercase font-semibold">Rate</span>
                <span class="text-sm font-black text-slate-900">₹${venue.pricePerHour}<span class="text-xs font-normal text-slate-500">/hr</span></span>
              </div>
            </div>

          </div>
        </div>

        <!-- Card Action CTA -->
        <div class="p-5 pt-0 space-y-2">
          <button onclick="openBookingModal('${venue._id}')" class="w-full py-2.5 px-4 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center space-x-2">
            <i data-lucide="calendar" class="w-4 h-4"></i>
            <span>Book Slot & Stations</span>
          </button>
          
          <button onclick="openReviewModal('${venue._id}')" class="w-full py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5">
            <i data-lucide="star" class="w-3.5 h-3.5 text-amber-500 fill-amber-500"></i>
            <span>Rate & Reviews (${reviewCount})</span>
          </button>
        </div>

      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function setCategoryFilter(category) {
  state.categoryFilter = category;

  const btnAll = document.getElementById('btn-cat-all');
  const btnOnline = document.getElementById('btn-cat-online');
  const btnOffline = document.getElementById('btn-cat-offline');

  const activeClasses = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white shadow-sm transition-all whitespace-nowrap';
  const inactiveClasses = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center space-x-1.5 whitespace-nowrap';

  if (btnAll) btnAll.className = category === 'All' ? activeClasses : inactiveClasses;
  if (btnOnline) btnOnline.className = category === 'Online Gaming' ? activeClasses : inactiveClasses;
  if (btnOffline) btnOffline.className = category === 'Offline Sports' ? activeClasses : inactiveClasses;

  fetchVenues();
}

function applyFilters() {
  const citySelect = document.getElementById('cityFilter');
  const searchInput = document.getElementById('searchInput');

  if (citySelect) state.cityFilter = citySelect.value;
  if (searchInput) state.searchQuery = searchInput.value;

  fetchVenues();
}

function resetFilters() {
  const city = document.getElementById('cityFilter');
  const search = document.getElementById('searchInput');
  const sort = document.getElementById('sortFilter');

  if (city) city.value = 'All';
  if (search) search.value = '';
  if (sort) sort.value = '';

  state.cityFilter = 'All';
  state.searchQuery = '';
  state.activeGameFilter = null;
  setCategoryFilter('All');
}

function clearGameFilter() {
  state.activeGameFilter = null;
  fetchVenues();
}

// ==========================================
// 2. EXISTING GAMES DIRECTORY
// ==========================================
async function fetchGames() {
  try {
    const res = await fetch('/api/games');
    const data = await res.json();
    if (data.success) {
      state.gamesData = data;
      renderExistingGames();
    }
  } catch (err) {
    console.warn('Failed to fetch games:', err);
  }
}

function renderExistingGames() {
  const grid = document.getElementById('existingGamesGrid');
  if (!grid) return;

  let gamesToRender = [];
  if (state.gamesCategoryFilter === 'Online Gaming') {
    gamesToRender = state.gamesData.onlineGames || [];
  } else if (state.gamesCategoryFilter === 'Offline Sports') {
    gamesToRender = state.gamesData.offlineGames || [];
  } else {
    gamesToRender = state.gamesData.allGames || [...(state.gamesData.onlineGames || []), ...(state.gamesData.offlineGames || [])];
  }

  if (state.gamesSearchQuery.trim()) {
    const q = state.gamesSearchQuery.trim().toLowerCase();
    gamesToRender = gamesToRender.filter(g =>
      g.name.toLowerCase().includes(q) ||
      g.desc.toLowerCase().includes(q) ||
      (Array.isArray(g.venues) && g.venues.some(v => v.shopName.toLowerCase().includes(q) || v.city.toLowerCase().includes(q)))
    );
  }

  if (gamesToRender.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-2">
        <i data-lucide="search-x" class="w-8 h-8 mx-auto text-slate-400"></i>
        <h4 class="font-bold text-slate-800">No games found</h4>
        <p class="text-xs text-slate-500">Try adjusting your search query.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  grid.innerHTML = gamesToRender.map(game => {
    const isOnline = game.category === 'Online Gaming';
    const tagClass = isOnline ? 'tag-online' : 'tag-offline';
    const venues = game.venues || [];

    const venueChips = venues.length > 0
      ? venues.map(v => `
          <div class="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-300 transition-all flex items-center justify-between text-xs">
            <div>
              <div class="font-bold text-slate-800">${v.shopName}</div>
              <div class="text-[11px] text-slate-500 flex items-center space-x-1">
                <i data-lucide="map-pin" class="w-3 h-3 text-slate-400"></i>
                <span>${v.city} • ₹${v.pricePerHour}/hr</span>
              </div>
            </div>
            <button onclick="openBookingModal('${v._id}')" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition shadow-sm">
              Book
            </button>
          </div>
        `).join('')
      : `
        <div class="text-xs text-slate-400 italic py-2">
          No hubs currently offering this game. Be the first shop owner to add it!
        </div>
      `;

    return `
      <div class="gamehub-card p-5 flex flex-col justify-between space-y-4">
        <div>
          <!-- Header -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl ${isOnline ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'} flex items-center justify-center font-bold text-sm shrink-0">
                <i data-lucide="${game.icon || (isOnline ? 'monitor' : 'trophy')}" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-900">${game.name}</h3>
                <span class="inline-block text-[10px] font-bold px-2 py-0.2 rounded-full ${tagClass} mt-0.5">
                  ${game.category}
                </span>
              </div>
            </div>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
              ${venues.length} ${venues.length === 1 ? 'Hub' : 'Hubs'}
            </span>
          </div>

          <p class="text-xs text-slate-500 mt-2.5">${game.desc}</p>

          <!-- Venues offering this game -->
          <div class="mt-4 pt-3 border-t border-slate-100 space-y-2">
            <span class="text-[11px] uppercase tracking-wider font-bold text-slate-600 block">
              Participating Hubs (${venues.length}):
            </span>
            <div class="space-y-1.5 max-h-48 overflow-y-auto">
              ${venueChips}
            </div>
          </div>
        </div>

        <!-- Jump to Explore with Filter -->
        <div class="pt-2 border-t border-slate-100">
          <button onclick="jumpToExploreWithGame('${encodeURIComponent(game.name)}')" class="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5">
            <i data-lucide="compass" class="w-3.5 h-3.5 text-blue-600"></i>
            <span>View All Hubs for ${game.name}</span>
          </button>
        </div>

      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function filterExistingGamesCategory(cat) {
  state.gamesCategoryFilter = cat;

  const tabAll = document.getElementById('games-tab-all');
  const tabOnline = document.getElementById('games-tab-online');
  const tabOffline = document.getElementById('games-tab-offline');

  const activeClasses = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white transition';
  const inactiveClasses = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition flex items-center space-x-1.5';

  if (tabAll) tabAll.className = cat === 'All' ? activeClasses : inactiveClasses;
  if (tabOnline) tabOnline.className = cat === 'Online Gaming' ? activeClasses : inactiveClasses;
  if (tabOffline) tabOffline.className = cat === 'Offline Sports' ? activeClasses : inactiveClasses;

  renderExistingGames();
}

function filterExistingGamesSearch() {
  const input = document.getElementById('gamesSearchInput');
  if (input) state.gamesSearchQuery = input.value;
  renderExistingGames();
}

function jumpToExploreWithGame(encodedGame) {
  const game = decodeURIComponent(encodedGame);
  state.activeGameFilter = game;
  navigate('explore');
}

// ==========================================
// 3. OWNER ONBOARDING WITH CLICKABLE CHIPS
// ==========================================
function renderOwnerGameChips() {
  const onlineContainer = document.getElementById('onlineGamesChipsContainer');
  const offlineContainer = document.getElementById('offlineGamesChipsContainer');
  if (!onlineContainer || !offlineContainer) return;

  onlineContainer.innerHTML = ALL_ONLINE_GAMES.map(g => {
    const isSelected = state.selectedOwnerGames.has(g);
    return `
      <button type="button" onclick="toggleOwnerGameChip('${g}')" id="chip-${sanitizeId(g)}" class="game-chip ${isSelected ? 'active' : ''}">
        <i data-lucide="${isSelected ? 'check' : 'plus'}" class="w-3 h-3"></i>
        <span>${g}</span>
      </button>
    `;
  }).join('');

  offlineContainer.innerHTML = ALL_OFFLINE_GAMES.map(g => {
    const isSelected = state.selectedOwnerGames.has(g);
    return `
      <button type="button" onclick="toggleOwnerGameChip('${g}')" id="chip-${sanitizeId(g)}" class="game-chip ${isSelected ? 'active-offline' : ''}">
        <i data-lucide="${isSelected ? 'check' : 'plus'}" class="w-3 h-3"></i>
        <span>${g}</span>
      </button>
    `;
  }).join('');

  updateSelectedOwnerGamesCount();
  if (window.lucide) lucide.createIcons();
}

function sanitizeId(str) {
  return str.replace(/[^a-zA-Z0-9]/g, '_');
}

function toggleOwnerGameChip(gameName) {
  if (state.selectedOwnerGames.has(gameName)) {
    state.selectedOwnerGames.delete(gameName);
  } else {
    state.selectedOwnerGames.add(gameName);
  }
  renderOwnerGameChips();
}

function updateSelectedOwnerGamesCount() {
  const countLabel = document.getElementById('selectedGamesCountLabel');
  if (countLabel) {
    const count = state.selectedOwnerGames.size;
    countLabel.innerText = `${count} ${count === 1 ? 'game' : 'games'} selected`;
  }
}

function onCategoryRadioChange() {
  const selectedRadio = document.querySelector('input[name="regCategory"]:checked');
  const val = selectedRadio ? selectedRadio.value : 'Both';
  const onlineSec = document.getElementById('chipsOnlineSection');
  const offlineSec = document.getElementById('chipsOfflineSection');

  if (val === 'Online Gaming') {
    if (onlineSec) onlineSec.classList.remove('hidden');
    if (offlineSec) offlineSec.classList.add('hidden');
  } else if (val === 'Offline Sports') {
    if (onlineSec) onlineSec.classList.add('hidden');
    if (offlineSec) offlineSec.classList.remove('hidden');
  } else {
    if (onlineSec) onlineSec.classList.remove('hidden');
    if (offlineSec) offlineSec.classList.remove('hidden');
  }
}

function handleImageFilePreview(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    state.uploadedOwnerImagePreview = e.target.result;
    const notice = document.getElementById('imgPreviewNotice');
    if (notice) {
      notice.classList.remove('hidden');
      notice.innerText = `✅ Photo ready: ${file.name}`;
    }
  };
  reader.readAsDataURL(file);
}

async function handleRegisterVenue(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('regSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i><span>Processing ₹999 Activation...</span>`;

  try {
    const shopName = document.getElementById('regShopName').value.trim();
    const ownerName = document.getElementById('regOwnerName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const city = document.getElementById('regCity').value;
    const address = document.getElementById('regAddress').value.trim();
    const mapUrl = document.getElementById('regMapUrl').value.trim();
    const imageUrl = document.getElementById('regImageUrl').value.trim();
    const category = document.querySelector('input[name="regCategory"]:checked').value;
    const customGames = document.getElementById('regCustomGames').value.trim();
    const totalCapacity = parseInt(document.getElementById('regCapacity').value, 10) || 20;
    const pricePerHour = parseInt(document.getElementById('regPrice').value, 10) || 150;

    // Combine selected chips + custom typed games
    const games = Array.from(state.selectedOwnerGames);
    if (customGames) {
      customGames.split(',').forEach(g => {
        const clean = g.trim();
        if (clean && !games.includes(clean)) games.push(clean);
      });
    }

    if (games.length === 0) {
      alert('Please select at least one game or sport that your venue offers.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i data-lucide="shield-check" class="w-5 h-5"></i><span>Activate Listing & Pay ₹999</span>`;
      return;
    }

    const payload = {
      shopName,
      ownerName,
      phone,
      city,
      address,
      mapUrl,
      image: state.uploadedOwnerImagePreview || imageUrl,
      category,
      gamesOffered: games,
      totalCapacity,
      pricePerHour,
      subscriptionPaid: true,
      subscriptionStatus: 'Active'
    };

    const res = await fetch('/api/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      alert(`🎉 Congratulations! "${shopName}" is now officially published live on GameHub!\nMonthly ₹999 subscription activated in MongoDB.`);
      document.getElementById('ownerRegisterForm').reset();
      state.selectedOwnerGames.clear();
      renderOwnerGameChips();
      await fetchVenues();
      await fetchGames();
      await fetchOwnerInsights();
      navigate('explore');
    } else {
      alert(`Registration failed: ${data.error || 'Server error'}`);
    }
  } catch (err) {
    alert(`Registration failed: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i data-lucide="shield-check" class="w-5 h-5"></i><span>Activate Listing & Pay ₹999</span>`;
    if (window.lucide) lucide.createIcons();
  }
}

async function fetchOwnerVenues() {
  const container = document.getElementById('ownerVenuesList');
  if (!container) return;

  const res = await fetch('/api/venues');
  const data = await res.json();
  const venues = data.venues || [];

  if (venues.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400 italic">No registered venues.</p>';
    return;
  }

  container.innerHTML = venues.map(v => {
    const isCourtEmpty = v.courtStatus === 'Empty';
    return `
      <div class="p-3 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-xs font-bold text-slate-900">${v.shopName}</h4>
            <span class="text-[10px] text-slate-500">${v.city} • ${v.category}</span>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isCourtEmpty ? 'badge-available' : 'badge-occupied'}">
            ${v.courtStatus}
          </span>
        </div>

        <div class="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
          <span class="text-[11px] text-slate-600">Toggle Court:</span>
          <div class="space-x-1.5">
            <button onclick="updateCourtStatus('${v._id}', 'Empty')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg ${isCourtEmpty ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-700'}">
              Empty (Ready)
            </button>
            <button onclick="updateCourtStatus('${v._id}', 'Occupied')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg ${!isCourtEmpty ? 'bg-rose-600 text-white' : 'bg-white border text-slate-700'}">
              Occupied
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function updateCourtStatus(venueId, status) {
  try {
    const res = await fetch(`/api/venues/${venueId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courtStatus: status })
    });
    const data = await res.json();
    if (data.success) {
      await fetchVenues();
      await fetchOwnerVenues();
      await fetchActivityLogsMini();
    }
  } catch (e) {
    console.error('Failed to toggle court status:', e);
  }
}

async function fetchOwnerInsights() {
  try {
    const res = await fetch('/api/owner/insights');
    const data = await res.json();
    if (data.success) {
      const elTotal = document.getElementById('insTotalBookings');
      const elActive = document.getElementById('insActiveBookings');
      const elGross = document.getElementById('insGrossRevenue');
      const elSnacks = document.getElementById('insSnacksRevenue');
      const elOnline = document.getElementById('insOnlineRevenue');
      const elVenue = document.getElementById('insVenueRevenue');
      const elCancelled = document.getElementById('insCancelledCount');

      if (elTotal) elTotal.innerText = data.totalBookings || 0;
      if (elActive) elActive.innerText = `${data.confirmedBookings || 0} Active`;
      if (elGross) elGross.innerText = `₹${(data.grossRevenue || 0).toLocaleString()}`;
      if (elSnacks) elSnacks.innerText = `₹${(data.snacksRevenue || 0).toLocaleString()} F&B snacks`;
      if (elOnline) elOnline.innerText = `₹${(data.onlineRevenue || 0).toLocaleString()}`;
      if (elVenue) elVenue.innerText = `₹${(data.venueRevenue || 0).toLocaleString()}`;
      if (elCancelled) elCancelled.innerText = `${data.cancelledBookings || 0} Cancelled`;
    }
  } catch (e) {
    console.warn('Failed to fetch owner insights:', e);
  }
}

// ==========================================
// 4. RATINGS & QUICK REVIEWS
// ==========================================
function openReviewModal(venueId) {
  const venue = state.venues.find(v => String(v._id) === String(venueId));
  if (!venue) return;

  state.currentReviewVenueId = venueId;
  const nameEl = document.getElementById('revModalShopName');
  if (nameEl) nameEl.innerText = venue.shopName;

  const revUserName = document.getElementById('revUserName');
  if (revUserName) {
    revUserName.value = state.currentUser ? state.currentUser.name : '';
  }

  const revComment = document.getElementById('revComment');
  if (revComment) revComment.value = '';

  setStarRating(5);

  // Render existing reviews
  const existingList = document.getElementById('revExistingList');
  if (existingList) {
    const reviews = venue.reviews || [];
    if (reviews.length === 0) {
      existingList.innerHTML = '<p class="text-slate-400 italic">No reviews yet. Be the first player to review!</p>';
    } else {
      existingList.innerHTML = reviews.slice().reverse().map(r => `
        <div class="p-2.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-800">${r.userName || 'Verified Player'}</span>
            <span class="text-amber-500 font-bold text-xs">${'★'.repeat(r.rating || 5)}</span>
          </div>
          <p class="text-slate-600 text-[11px]">${r.comment || ''}</p>
          <span class="text-[9px] text-slate-400">${r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent'}</span>
        </div>
      `).join('');
    }
  }

  const modal = document.getElementById('reviewModal');
  if (modal) modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeReviewModal() {
  const modal = document.getElementById('reviewModal');
  if (modal) modal.classList.add('hidden');
}

function setStarRating(rating) {
  state.reviewStarRating = rating;

  const container = document.getElementById('starPickerContainer');
  if (container) {
    const buttons = container.querySelectorAll('.star-btn');
    buttons.forEach((btn, idx) => {
      if (idx < rating) {
        btn.className = 'star-btn text-amber-400 scale-110 transition-transform';
      } else {
        btn.className = 'star-btn text-slate-300 transition-transform';
      }
    });
  }

  const labels = {
    1: '1 Star — Poor',
    2: '2 Stars — Fair',
    3: '3 Stars — Good',
    4: '4 Stars — Great',
    5: '5 Stars — Outstanding Experience!'
  };

  const labelEl = document.getElementById('starRatingLabel');
  if (labelEl) labelEl.innerText = labels[rating] || `${rating} Stars`;
}

async function submitVenueReview() {
  if (!state.currentReviewVenueId) return;

  const userName = (document.getElementById('revUserName').value || '').trim();
  const comment = (document.getElementById('revComment').value || '').trim();

  if (!userName) return alert('Please enter your name.');
  if (!comment) return alert('Please enter your review comments.');

  const btn = document.getElementById('revSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = 'Submitting Review to MongoDB...';

  try {
    const res = await fetch(`/api/venues/${state.currentReviewVenueId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName,
        rating: state.reviewStarRating,
        comment
      })
    });

    const data = await res.json();
    if (data.success) {
      alert(`⭐ Thank you for your review! Venue updated to ${data.venue.rating} ★.`);
      closeReviewModal();
      await fetchVenues();
      await fetchActivityLogsMini();
    } else {
      alert(`Review submission failed: ${data.error || 'Server error'}`);
    }
  } catch (e) {
    alert(`Review error: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="star" class="w-4 h-4 text-amber-300"></i><span>Submit Review to MongoDB</span>`;
    if (window.lucide) lucide.createIcons();
  }
}

// ==========================================
// 5. INTERACTIVE BOOKING MODAL (SEATS & SLOTS)
// ==========================================
async function openBookingModal(venueId) {
  const venue = state.venues.find(v => String(v._id) === String(venueId));
  if (!venue) return;

  state.currentBookingVenue = venue;
  state.selectedSeats = [];
  state.selectedSnacks = {};
  state.swimmingSpots = 1;

  document.getElementById('bmShopName').innerText = venue.shopName;
  document.getElementById('bmAddress').innerHTML = `<i data-lucide="map-pin" class="w-3.5 h-3.5"></i><span>${venue.address}</span>`;
  document.getElementById('bmCategoryBadge').innerText = venue.category;
  document.getElementById('stationRateLabel').innerText = `₹${venue.pricePerHour}/hr`;

  renderHourlySlots();
  renderSnackBar();

  // Auto-fill logged in player info if available
  const pName = document.getElementById('bmPlayerName');
  const pPhone = document.getElementById('bmPlayerPhone');
  if (state.currentUser) {
    pName.value = state.currentUser.name || '';
    pPhone.value = state.currentUser.phone || '';
  } else {
    pName.value = '';
    pPhone.value = '';
  }

  stopSeatLockCountdown();

  document.getElementById('bookingModal').classList.remove('hidden');

  await loadSlotAvailability();

  if (window.lucide) lucide.createIcons();
}

function closeBookingModal() {
  if (state.currentBookingVenue && state.selectedSeats.length > 0) {
    state.selectedSeats.forEach(seatId => {
      fetch(`/api/venues/${state.currentBookingVenue._id}/unlock-seat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: state.selectedDate,
          timeSlot: state.selectedSlot,
          seatId,
          sessionId: CLIENT_SESSION_ID
        })
      }).catch(() => {});
    });
  }

  stopSeatLockCountdown();
  state.currentBookingVenue = null;
  state.selectedSeats = [];
  state.selectedSnacks = {};
  document.getElementById('bookingModal').classList.add('hidden');
}

function selectBookingDate(offset) {
  state.selectedDate = getDateOffset(offset);
  [0, 1, 2].forEach(i => {
    const btn = document.getElementById(`dateBtn-${i}`);
    if (btn) {
      if (i === offset) {
        btn.className = 'date-tab px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white border border-blue-600';
      } else {
        btn.className = 'date-tab px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200';
      }
    }
  });

  const customInput = document.getElementById('bookingCustomDate');
  if (customInput) customInput.value = state.selectedDate;

  loadSlotAvailability();
}

function onCustomDateChange(val) {
  if (!val) return;
  state.selectedDate = val;
  [0, 1, 2].forEach(i => {
    const btn = document.getElementById(`dateBtn-${i}`);
    if (btn) btn.className = 'date-tab px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200';
  });
  loadSlotAvailability();
}

function renderHourlySlots() {
  const container = document.getElementById('slotsContainer');
  if (!container) return;

  container.innerHTML = HOURLY_SLOTS.map(slot => {
    const isSelected = slot === state.selectedSlot;
    return `
      <button type="button" onclick="selectSlot('${slot}')" class="px-3 py-2 rounded-xl text-xs font-semibold border transition text-center ${
        isSelected
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
      }">
        ${slot}
      </button>
    `;
  }).join('');
}

function selectSlot(slot) {
  state.selectedSlot = slot;
  renderHourlySlots();
  loadSlotAvailability();
}

async function loadSlotAvailability() {
  if (!state.currentBookingVenue) return;

  const venue = state.currentBookingVenue;
  const isOnline = venue.category === 'Online Gaming' || venue.category === 'Both';
  const gamesList = venue.gamesOffered || [];
  const isSwimming = gamesList.some(g => g.toLowerCase().includes('swim'));
  const isVolleyball = gamesList.some(g => g.toLowerCase().includes('volley')) || (venue.category === 'Offline Sports' && !isSwimming);

  const seatSec = document.getElementById('seatMapSection');
  const courtSec = document.getElementById('courtStatusSection');
  const swimSec = document.getElementById('swimmingCapacitySection');

  if (isOnline) {
    if (seatSec) seatSec.classList.remove('hidden');
    if (courtSec) courtSec.classList.add('hidden');
    if (swimSec) swimSec.classList.add('hidden');
  } else if (isSwimming) {
    if (seatSec) seatSec.classList.add('hidden');
    if (courtSec) courtSec.classList.add('hidden');
    if (swimSec) swimSec.classList.remove('hidden');
  } else {
    if (seatSec) seatSec.classList.add('hidden');
    if (courtSec) courtSec.classList.remove('hidden');
    if (swimSec) swimSec.classList.add('hidden');
  }

  try {
    const params = new URLSearchParams({
      date: state.selectedDate,
      timeSlot: state.selectedSlot,
      sessionId: CLIENT_SESSION_ID
    });

    const res = await fetch(`/api/venues/${venue._id}/availability?${params.toString()}`);
    const data = await res.json();
    state.currentAvailability = data;

    if (isOnline) {
      renderInteractiveSeatGrid(data);
    } else if (isSwimming) {
      renderSwimmingAvailability(data);
    } else {
      renderCourtAvailability(data);
    }

    updateTotalAmountDisplay();
  } catch (err) {
    console.error('Failed to load slot availability:', err);
  }
}

// Visual Seat Grid (BookMyShow Style)
function renderInteractiveSeatGrid(avail) {
  const grid = document.getElementById('seatGrid');
  if (!grid) return;

  const bookedSeats = avail.bookedSeats || [];
  const lockedSeats = avail.lockedSeats || [];
  const totalCapacity = state.currentBookingVenue.totalCapacity || 24;

  const seats = [];
  const half = Math.ceil(totalCapacity / 2);
  for (let i = 1; i <= half; i++) seats.push(`A${i}`);
  for (let i = 1; i <= (totalCapacity - half); i++) seats.push(`B${i}`);

  grid.innerHTML = seats.map(sId => {
    const isBooked = bookedSeats.includes(sId);
    const lockInfo = lockedSeats.find(l => l.seatId === sId);
    const isLockedOther = lockInfo && !lockInfo.isMine;
    const isSelected = state.selectedSeats.includes(sId);

    let stateClass = 'seat-available';
    let title = `Station ${sId} - Available (₹${state.currentBookingVenue.pricePerHour}/hr)`;

    if (isBooked) {
      stateClass = 'seat-booked';
      title = `Station ${sId} - Already Booked`;
    } else if (isSelected) {
      stateClass = 'seat-selected';
      title = `Station ${sId} - Selected by you`;
    } else if (isLockedOther) {
      stateClass = 'seat-locked';
      title = `Station ${sId} - Temporarily held by another player (${lockInfo.expiresInSeconds}s left)`;
    }

    return `
      <div onclick="toggleSeat('${sId}', ${isBooked}, ${isLockedOther})" class="seat-btn ${stateClass}" title="${title}">
        <span>${sId}</span>
        <span class="text-[9px] opacity-75">${sId.startsWith('A') ? 'PC' : 'RIG'}</span>
      </div>
    `;
  }).join('');

  const label = document.getElementById('selectedSeatsLabel');
  if (label) label.innerText = state.selectedSeats.length > 0 ? state.selectedSeats.join(', ') : 'None';
}

async function toggleSeat(seatId, isBooked, isLockedOther) {
  if (isBooked) {
    alert(`Station ${seatId} is already booked for this slot.`);
    return;
  }
  if (isLockedOther) {
    alert(`Station ${seatId} is currently held by another player. Try again in a few minutes.`);
    return;
  }

  const index = state.selectedSeats.indexOf(seatId);
  if (index > -1) {
    // Deselect and release hold
    state.selectedSeats.splice(index, 1);
    await fetch(`/api/venues/${state.currentBookingVenue._id}/unlock-seat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: state.selectedDate,
        timeSlot: state.selectedSlot,
        seatId,
        sessionId: CLIENT_SESSION_ID
      })
    });
  } else {
    // Select and lock
    const res = await fetch(`/api/venues/${state.currentBookingVenue._id}/lock-seat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: state.selectedDate,
        timeSlot: state.selectedSlot,
        seatId,
        sessionId: CLIENT_SESSION_ID
      })
    });
    const lockResult = await res.json();
    if (!lockResult.success) {
      alert(lockResult.error || 'Seat could not be locked');
      return;
    }
    state.selectedSeats.push(seatId);
    startSeatLockCountdown(300);
  }

  await loadSlotAvailability();
}

function startSeatLockCountdown(seconds = 300) {
  stopSeatLockCountdown();
  state.seatLockRemainingSeconds = seconds;
  const banner = document.getElementById('seatLockTimerBanner');
  const timerText = document.getElementById('seatLockCountdown');

  if (banner) banner.classList.remove('hidden');

  const update = () => {
    const mins = Math.floor(state.seatLockRemainingSeconds / 60);
    const secs = state.seatLockRemainingSeconds % 60;
    if (timerText) timerText.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    if (state.seatLockRemainingSeconds <= 0) {
      stopSeatLockCountdown();
      alert('⏱️ Your 5-minute seat hold has expired. Please select your seats again.');
      state.selectedSeats = [];
      loadSlotAvailability();
    }
    state.seatLockRemainingSeconds--;
  };

  update();
  state.seatLockTimer = setInterval(update, 1000);
}

function stopSeatLockCountdown() {
  if (state.seatLockTimer) {
    clearInterval(state.seatLockTimer);
    state.seatLockTimer = null;
  }
  const banner = document.getElementById('seatLockTimerBanner');
  if (banner) banner.classList.add('hidden');
}

// Offline Sports: Court Availability
function renderCourtAvailability(avail) {
  const alertBox = document.getElementById('courtStatusAlert');
  if (!alertBox) return;

  const isAvailable = avail.courtEmpty;
  if (isAvailable) {
    alertBox.className = 'p-5 rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-900 flex items-center space-x-4';
    alertBox.innerHTML = `
      <div class="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
        <i data-lucide="check" class="w-6 h-6"></i>
      </div>
      <div>
        <h4 class="font-bold text-sm">✅ Court is Empty & Available!</h4>
        <p class="text-xs text-emerald-700 mt-0.5">Court is ready for reservation for ${state.selectedSlot}. Hourly booking rate: ₹${state.currentBookingVenue.pricePerHour}/hr.</p>
      </div>
    `;
  } else {
    alertBox.className = 'p-5 rounded-2xl border bg-rose-50 border-rose-200 text-rose-900 flex items-center space-x-4';
    alertBox.innerHTML = `
      <div class="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
        <i data-lucide="x" class="w-6 h-6"></i>
      </div>
      <div>
        <h4 class="font-bold text-sm">⛔ Court is Currently Occupied</h4>
        <p class="text-xs text-rose-700 mt-0.5">This court is reserved or marked in-use for ${state.selectedSlot}. Please choose another time slot.</p>
      </div>
    `;
  }
  if (window.lucide) lucide.createIcons();
}

// Capacity-Based: Swimming Pool Batch Limit (Max 10)
function renderSwimmingAvailability(avail) {
  const filled = avail.swimmingFilledSpots || 0;
  const maxCap = avail.swimmingMaxBatch || 10;
  const remaining = Math.max(0, maxCap - filled);

  const title = document.getElementById('swimmingSlotBatchTitle');
  const badge = document.getElementById('swimmingSpotsLeftBadge');
  const filledText = document.getElementById('swimmingFilledText');
  const bar = document.getElementById('swimmingCapacityBar');
  const spotsCount = document.getElementById('swimmingSpotsCount');

  if (title) title.innerText = `${state.selectedSlot} Batch`;
  if (badge) badge.innerText = `${remaining} spots left`;
  if (filledText) filledText.innerText = `${filled}/${maxCap} slots filled`;

  const percent = Math.min(100, Math.round((filled / maxCap) * 100));
  if (bar) {
    bar.style.width = `${percent}%`;
    bar.className = percent >= 100 ? 'bg-rose-600 h-3 rounded-full' : (percent >= 70 ? 'bg-amber-500 h-3 rounded-full' : 'bg-blue-600 h-3 rounded-full');
  }

  if (state.swimmingSpots > remaining) {
    state.swimmingSpots = Math.max(1, remaining);
  }
  if (spotsCount) spotsCount.innerText = state.swimmingSpots;
}

function changeSwimmingSpots(delta) {
  const avail = state.currentAvailability;
  const maxCap = (avail && avail.swimmingMaxBatch) || 10;
  const filled = (avail && avail.swimmingFilledSpots) || 0;
  const remaining = Math.max(0, maxCap - filled);

  const next = state.swimmingSpots + delta;
  if (next >= 1 && next <= remaining) {
    state.swimmingSpots = next;
    const count = document.getElementById('swimmingSpotsCount');
    if (count) count.innerText = state.swimmingSpots;
    updateTotalAmountDisplay();
  } else if (next > remaining) {
    alert(`Only ${remaining} slots available in this batch (Max 10 per hour safety limit).`);
  }
}

// In-Venue F&B Snack Bar
function renderSnackBar() {
  const list = document.getElementById('snackBarList');
  if (!list) return;

  list.innerHTML = SNACK_MENU.map(item => {
    const qty = state.selectedSnacks[item.id] || 0;
    return `
      <div class="snack-card flex items-center justify-between">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <i data-lucide="${item.icon}" class="w-4 h-4"></i>
          </div>
          <div>
            <div class="text-xs font-bold text-slate-800">${item.name}</div>
            <div class="text-[11px] font-semibold text-emerald-700">₹${item.price}</div>
          </div>
        </div>

        <div class="flex items-center space-x-1.5">
          <button type="button" onclick="adjustSnackQty('${item.id}', -1)" class="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 font-bold text-xs flex items-center justify-center">-</button>
          <span class="w-5 text-center text-xs font-bold text-slate-900">${qty}</span>
          <button type="button" onclick="adjustSnackQty('${item.id}', 1)" class="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 font-bold text-xs flex items-center justify-center">+</button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function adjustSnackQty(itemId, delta) {
  const current = state.selectedSnacks[itemId] || 0;
  const next = Math.max(0, current + delta);
  if (next === 0) {
    delete state.selectedSnacks[itemId];
  } else {
    state.selectedSnacks[itemId] = next;
  }
  renderSnackBar();
  updateTotalAmountDisplay();
}

function calculateSnacksTotal() {
  let sum = 0;
  for (const [id, qty] of Object.entries(state.selectedSnacks)) {
    const item = SNACK_MENU.find(m => m.id === id);
    if (item) sum += item.price * qty;
  }
  return sum;
}

function updateTotalAmountDisplay() {
  if (!state.currentBookingVenue) return;
  const rate = state.currentBookingVenue.pricePerHour || 150;
  const isOnline = state.currentBookingVenue.category === 'Online Gaming' || state.currentBookingVenue.category === 'Both';
  const gamesList = state.currentBookingVenue.gamesOffered || [];
  const isSwimming = gamesList.some(g => g.toLowerCase().includes('swim'));

  let primaryCount = 1;
  if (isOnline) {
    primaryCount = state.selectedSeats.length;
  } else if (isSwimming) {
    primaryCount = state.swimmingSpots;
  }

  const seatTotal = rate * primaryCount;
  const snacksTotal = calculateSnacksTotal();
  const grandTotal = seatTotal + snacksTotal;

  const totalText = document.getElementById('bmTotalAmountText');
  const snacksPill = document.getElementById('snacksTotalPill');
  if (totalText) totalText.innerText = `₹${grandTotal}`;
  if (snacksPill) snacksPill.innerText = `₹${snacksTotal} in snacks`;
}

async function submitBooking() {
  if (!state.currentBookingVenue) return;

  const venue = state.currentBookingVenue;
  const playerName = document.getElementById('bmPlayerName').value.trim();
  const phone = document.getElementById('bmPlayerPhone').value.trim();
  const paymentMethod = document.querySelector('input[name="bmPaymentMethod"]:checked').value;

  if (!playerName || !phone) {
    alert('Please enter your full name and phone number.');
    return;
  }

  const isOnline = venue.category === 'Online Gaming' || venue.category === 'Both';
  const gamesList = venue.gamesOffered || [];
  const isSwimming = gamesList.some(g => g.toLowerCase().includes('swim'));

  if (isOnline && state.selectedSeats.length === 0) {
    alert('Please select at least one gaming seat from the interactive seat map.');
    return;
  }

  if (!isOnline && !isSwimming && state.currentAvailability && !state.currentAvailability.courtEmpty) {
    alert('This court is occupied for the selected slot. Please choose another time slot.');
    return;
  }

  const confirmBtn = document.getElementById('bmConfirmBtn');
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i><span>Confirming in MongoDB...</span>`;

  // Build snacks array
  const snacksOrdered = [];
  for (const [id, qty] of Object.entries(state.selectedSnacks)) {
    const item = SNACK_MENU.find(m => m.id === id);
    if (item && qty > 0) {
      snacksOrdered.push({ id: item.id, name: item.name, price: item.price, qty });
    }
  }

  const payload = {
    userId: state.currentUser ? (state.currentUser.id || state.currentUser._id) : undefined,
    venueId: venue._id,
    playerName,
    phone,
    date: state.selectedDate,
    timeSlot: state.selectedSlot,
    seats: isOnline ? state.selectedSeats : [],
    spotsCount: isSwimming ? state.swimmingSpots : 1,
    paymentMethod,
    snacks: snacksOrdered,
    snacksTotal: calculateSnacksTotal(),
    sessionId: CLIENT_SESSION_ID
  };

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      closeBookingModal();
      openTicketModal(data.booking);
      await fetchBookings();
      await fetchVenues();
      await fetchOwnerInsights();
    } else {
      alert(`Booking failed: ${data.error || 'Server error'}`);
    }
  } catch (err) {
    alert(`Booking failed: ${err.message}`);
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i><span>Confirm & Generate Pass</span>`;
    if (window.lucide) lucide.createIcons();
  }
}

// ==========================================
// 6. DIGITAL QR ENTRY PASS, CANCELLATION & TICKETS
// ==========================================
async function fetchBookings() {
  try {
    const res = await fetch('/api/bookings');
    const data = await res.json();
    if (data.success) {
      state.allBookings = data.bookings || [];
      renderBookings(state.allBookings);

      const badge = document.getElementById('ticketCountBadge');
      const badgeMobile = document.getElementById('ticketCountBadgeMobile');
      if (badge) badge.innerText = state.allBookings.length;
      if (badgeMobile) badgeMobile.innerText = state.allBookings.length;
    }
  } catch (err) {
    console.warn('Failed to fetch bookings:', err);
  }
}

function renderBookings(bookings) {
  const grid = document.getElementById('ticketsGrid');
  const noNotice = document.getElementById('noTicketsNotice');

  if (bookings.length === 0) {
    if (grid) grid.innerHTML = '';
    if (noNotice) noNotice.classList.remove('hidden');
    return;
  }
  if (noNotice) noNotice.classList.add('hidden');

  if (!grid) return;

  grid.innerHTML = bookings.map(b => {
    const isCancelled = b.status === 'Cancelled';
    const isCheckedIn = b.checkInStatus === 'Checked-In';
    const reservedText = (b.seats && b.seats.length > 0)
      ? `Seats: ${b.seats.join(', ')}`
      : `${b.spotsCount || 1} Court/Pool Spot(s)`;

    let statusBadgeHtml = '';
    if (isCancelled) {
      statusBadgeHtml = `<span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">Cancelled (Refunded)</span>`;
    } else if (isCheckedIn) {
      statusBadgeHtml = `<span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Checked-In</span>`;
    } else {
      statusBadgeHtml = `<span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Confirmed</span>`;
    }

    return `
      <div class="digital-pass p-5 bg-white space-y-4 ${isCancelled ? 'opacity-70 bg-slate-50' : ''}">
        
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center space-x-2">
            <span class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">GH</span>
            <span class="font-bold text-slate-900">${b.venueName}</span>
          </div>
          ${statusBadgeHtml}
        </div>

        <div class="flex items-center justify-between gap-4">
          <div>
            <div class="text-[10px] uppercase font-bold text-slate-400">Booking ID</div>
            <div class="text-xl font-black ${isCancelled ? 'text-slate-400 line-through' : 'text-blue-600'}">${b.bookingId}</div>
            <div class="text-xs font-bold text-slate-800 mt-1">${b.playerName}</div>
            <div class="text-xs text-slate-500">${b.date} • ${b.timeSlot}</div>
            <div class="text-xs font-semibold text-indigo-700 mt-1">${reservedText}</div>
          </div>

          <!-- QR Thumbnail -->
          <div class="shrink-0 text-center">
            ${
              b.qrCodeData
                ? `<img src="${b.qrCodeData}" alt="QR" class="w-20 h-20 rounded-lg border border-slate-200 p-1 bg-white ${isCancelled ? 'grayscale' : ''}">`
                : `<div class="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-400">QR CODE</div>`
            }
          </div>
        </div>

        <div class="pt-3 border-t border-dashed border-slate-200 flex items-center justify-between text-xs">
          <span class="text-slate-500 font-medium">Total: <strong class="text-slate-900">₹${b.totalAmount}</strong> (${b.paymentMethod})</span>
          <div class="flex items-center space-x-2">
            <button onclick='openTicketModal(${JSON.stringify(b)})' class="px-3 py-1 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition">
              View Pass
            </button>
            ${
              !isCancelled && !isCheckedIn
                ? `<button onclick="cancelBooking('${b.bookingId}')" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center space-x-1" title="Cancel & Free Up Slot">
                    <i data-lucide="x" class="w-3 h-3"></i>
                    <span>Cancel</span>
                  </button>`
                : ''
            }
          </div>
        </div>

      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

async function cancelBooking(bookingId) {
  const confirmCancel = confirm(`Are you sure you want to cancel booking ${bookingId}?\nThis will immediately free up your reserved seat/spot in MongoDB.`);
  if (!confirmCancel) return;

  try {
    const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ Booking ${bookingId} has been cancelled successfully.\nReserved seats/slots are now freed in MongoDB!`);
      await fetchBookings();
      await fetchVenues();
      await fetchOwnerInsights();
    } else {
      alert(`Cancellation failed: ${data.error || 'Server error'}`);
    }
  } catch (err) {
    alert(`Cancellation error: ${err.message}`);
  }
}

function filterMyTickets() {
  const query = document.getElementById('ticketSearchInput').value.trim().toLowerCase();
  if (!query) {
    renderBookings(state.allBookings);
    return;
  }

  const filtered = state.allBookings.filter(b =>
    (b.phone && b.phone.toLowerCase().includes(query)) ||
    (b.bookingId && b.bookingId.toLowerCase().includes(query)) ||
    (b.playerName && b.playerName.toLowerCase().includes(query))
  );
  renderBookings(filtered);
}

function openTicketModal(booking) {
  document.getElementById('dtBookingId').innerText = booking.bookingId;
  document.getElementById('dtVenueName').innerText = booking.venueName;
  document.getElementById('dtPlayerName').innerText = booking.playerName;
  document.getElementById('dtPhone').innerText = booking.phone;
  document.getElementById('dtSlot').innerText = `${booking.date}, ${booking.timeSlot}`;
  document.getElementById('dtSeats').innerText = (booking.seats && booking.seats.length > 0)
    ? booking.seats.join(', ')
    : `${booking.spotsCount || 1} Spot(s)`;
  document.getElementById('dtPaymentMethod').innerText = booking.paymentMethod;
  document.getElementById('dtTotalAmount').innerText = `₹${booking.totalAmount}`;

  // Status Stamp
  const checkInStamp = document.getElementById('dtCheckInStamp');
  if (checkInStamp) {
    if (booking.checkInStatus === 'Checked-In') {
      checkInStamp.classList.remove('hidden');
    } else {
      checkInStamp.classList.add('hidden');
    }
  }

  // QR Code Image
  const qrImg = document.getElementById('dtQrImage');
  if (qrImg) {
    if (booking.qrCodeData) {
      qrImg.src = booking.qrCodeData;
      qrImg.classList.remove('hidden');
    } else {
      qrImg.classList.add('hidden');
    }
  }

  // Pre-ordered Snacks list
  const snacksSec = document.getElementById('dtSnacksSection');
  const snacksList = document.getElementById('dtSnacksList');
  if (snacksSec && snacksList) {
    if (Array.isArray(booking.snacks) && booking.snacks.length > 0) {
      snacksSec.classList.remove('hidden');
      snacksList.innerHTML = booking.snacks.map(s => `<div>• ${s.name} × ${s.qty} (₹${s.price * s.qty})</div>`).join('');
    } else {
      snacksSec.classList.add('hidden');
    }
  }

  document.getElementById('ticketModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeTicketModal() {
  document.getElementById('ticketModal').classList.add('hidden');
}

// ==========================================
// 7. RECEPTIONIST GATE PASS SCANNER
// ==========================================
function openScannerModal() {
  document.getElementById('manualBookingIdInput').value = '';
  document.getElementById('checkInResultBox').classList.add('hidden');
  document.getElementById('scannerModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeScannerModal() {
  document.getElementById('scannerModal').classList.add('hidden');
}

async function verifyCheckInFromInput() {
  const code = document.getElementById('manualBookingIdInput').value.trim();
  if (!code) {
    alert('Please enter a Booking ID or scan a QR code.');
    return;
  }

  const verifyBtn = document.getElementById('verifyBtn');
  verifyBtn.disabled = true;
  verifyBtn.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i><span>Checking...</span>`;

  try {
    const res = await fetch('/api/bookings/verify-checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: code })
    });

    const data = await res.json();
    const resultBox = document.getElementById('checkInResultBox');
    resultBox.classList.remove('hidden');

    if (data.success) {
      const b = data.booking;
      const isAlready = data.alreadyCheckedIn;

      resultBox.className = isAlready
        ? 'rounded-2xl p-4 border bg-amber-50 border-amber-300 text-amber-900 space-y-2'
        : 'rounded-2xl p-4 border bg-emerald-50 border-emerald-300 text-emerald-900 space-y-2';

      resultBox.innerHTML = `
        <div class="flex items-center space-x-2 font-bold text-sm">
          <i data-lucide="${isAlready ? 'alert-triangle' : 'shield-check'}" class="w-5 h-5 ${isAlready ? 'text-amber-600' : 'text-emerald-600'}"></i>
          <span>${data.message}</span>
        </div>
        <div class="text-xs space-y-1 pt-1 border-t ${isAlready ? 'border-amber-200' : 'border-emerald-200'}">
          <div>Player: <strong>${b.playerName}</strong> (${b.phone})</div>
          <div>Venue: <strong>${b.venueName}</strong></div>
          <div>Slot: <strong>${b.date} • ${b.timeSlot}</strong></div>
          <div>Reserved: <strong>${b.seats && b.seats.length > 0 ? b.seats.join(', ') : `${b.spotsCount || 1} spots`}</strong></div>
          <div>Payment: <strong>${b.paymentStatus} (₹${b.totalAmount})</strong></div>
        </div>
      `;

      await fetchBookings();
    } else {
      resultBox.className = 'rounded-2xl p-4 border bg-rose-50 border-rose-300 text-rose-900 space-y-1';
      resultBox.innerHTML = `
        <div class="flex items-center space-x-2 font-bold text-sm">
          <i data-lucide="x-circle" class="w-5 h-5 text-rose-600"></i>
          <span>Entry Denied: Invalid Pass</span>
        </div>
        <p class="text-xs">${data.error || 'No matching booking found in MongoDB.'}</p>
      `;
    }
  } catch (err) {
    alert(`Verification failed: ${err.message}`);
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = `<i data-lucide="shield-check" class="w-4 h-4"></i><span>Verify Entry</span>`;
    if (window.lucide) lucide.createIcons();
  }
}

// ==========================================
// 8. SQUAD FINDER & MATCHMAKING
// ==========================================
async function fetchSquads() {
  try {
    const res = await fetch('/api/squads');
    const data = await res.json();
    if (data.success) {
      state.squads = data.squads || [];
      renderSquads(state.squads);
    }
  } catch (e) {
    console.warn('Failed to fetch squads:', e);
  }
}

function renderSquads(squads) {
  const grid = document.getElementById('squadGrid');
  const countLabel = document.getElementById('squadCountLabel');
  if (!grid) return;

  let list = squads;
  if (state.squadCategoryFilter !== 'All') {
    list = list.filter(s => s.category === state.squadCategoryFilter);
  }

  if (countLabel) countLabel.innerText = list.length;

  if (list.length === 0) {
    grid.innerHTML = '<p class="col-span-full py-8 text-center text-xs text-slate-400 italic">No squad beacons in this category.</p>';
    return;
  }

  grid.innerHTML = list.map(s => {
    const isFull = s.spotsNeeded <= 0 || s.status === 'Full';
    const isOnline = s.category === 'Online Gaming';
    const waLink = `https://wa.me/${s.hostPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${s.hostName}, saw your GameHub beacon for ${s.game} at ${s.venueName}. Let's play!`)}`;

    return `
      <div class="gamehub-card p-5 space-y-4 flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isOnline ? 'tag-online' : 'tag-offline'}">
              ${s.category} • ${s.game}
            </span>
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${isFull ? 'badge-occupied' : 'badge-available'}">
              ${isFull ? 'Squad Full' : `Need ${s.spotsNeeded} Players`}
            </span>
          </div>

          <h3 class="text-base font-bold text-slate-900">${s.title}</h3>

          <div class="text-xs text-slate-600 space-y-1">
            <div class="flex items-center space-x-1.5"><i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i><span>${s.venueName}, ${s.city}</span></div>
            <div class="flex items-center space-x-1.5"><i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i><span>${s.date} • ${s.timeSlot}</span></div>
            <div class="flex items-center space-x-1.5"><i data-lucide="shield" class="w-3.5 h-3.5 text-slate-400"></i><span>Skill: ${s.skillLevel}</span></div>
          </div>

          <p class="text-xs text-slate-500">${s.description || 'Friendly competitive match.'}</p>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <a href="${waLink}" target="_blank" class="flex-1 py-2 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition text-center flex items-center justify-center space-x-1">
            <i data-lucide="message-circle" class="w-3.5 h-3.5 text-emerald-600"></i>
            <span>Chat</span>
          </a>
          ${
            !isFull
              ? `<button onclick='openJoinSquadModal(${JSON.stringify(s)})' class="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition text-center">
                  Join Squad
                </button>`
              : `<span class="text-xs font-bold text-slate-400 py-2">Full</span>`
          }
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function filterSquadCategory(cat) {
  state.squadCategoryFilter = cat;
  renderSquads(state.squads);
}

function openCreateSquadModal() {
  updateSquadVenuesDropdown();
  const d = document.getElementById('sqDate');
  if (d) d.value = getDateOffset(0);
  const modal = document.getElementById('createSquadModal');
  if (modal) modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeCreateSquadModal() {
  const modal = document.getElementById('createSquadModal');
  if (modal) modal.classList.add('hidden');
}

function updateSquadVenuesDropdown() {
  const select = document.getElementById('sqVenueSelect');
  if (!select) return;

  const cat = document.getElementById('sqCategory').value;
  const filtered = state.venues.filter(v => cat === 'All' || v.category === cat || v.category === 'Both');

  select.innerHTML = filtered.map(v => `<option value="${v._id}">${v.shopName} (${v.city})</option>`).join('');
}

async function handleCreateSquad(e) {
  e.preventDefault();

  const title = document.getElementById('sqTitle').value.trim();
  const category = document.getElementById('sqCategory').value;
  const game = document.getElementById('sqGame').value.trim();
  const venueId = document.getElementById('sqVenueSelect').value;
  const venue = state.venues.find(v => String(v._id) === String(venueId));
  const city = document.getElementById('sqCity').value.trim();
  const date = document.getElementById('sqDate').value;
  const timeSlot = document.getElementById('sqSlot').value;
  const spotsTotal = parseInt(document.getElementById('sqTotal').value, 10) || 5;
  const spotsNeeded = parseInt(document.getElementById('sqNeeded').value, 10) || 2;
  const hostName = document.getElementById('sqHostName').value.trim();
  const hostPhone = document.getElementById('sqHostPhone').value.trim();
  const skillLevel = document.getElementById('sqSkill').value.trim() || 'All Skill Levels';
  const description = document.getElementById('sqDesc').value.trim();

  const payload = {
    title,
    venueId,
    venueName: venue ? venue.shopName : 'GameHub Complex',
    city,
    category,
    game,
    date,
    timeSlot,
    spotsTotal,
    spotsNeeded,
    hostName,
    hostPhone,
    skillLevel,
    description
  };

  const res = await fetch('/api/squads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (data.success) {
    alert('🎉 Squad Matchmaking Beacon posted live!');
    closeCreateSquadModal();
    await fetchSquads();
    navigate('squads');
  } else {
    alert(data.error || 'Failed to post squad');
  }
}

function openJoinSquadModal(squad) {
  state.joiningSquad = squad;
  document.getElementById('jsTitle').innerText = squad.title;
  const pName = document.getElementById('jsPlayerName');
  const pPhone = document.getElementById('jsPlayerPhone');
  if (state.currentUser) {
    if (pName) pName.value = state.currentUser.name;
    if (pPhone) pPhone.value = state.currentUser.phone;
  } else {
    if (pName) pName.value = '';
    if (pPhone) pPhone.value = '';
  }
  document.getElementById('joinSquadModal').classList.remove('hidden');
}

function closeJoinSquadModal() {
  state.joiningSquad = null;
  document.getElementById('joinSquadModal').classList.add('hidden');
}

async function submitJoinSquad() {
  if (!state.joiningSquad) return;

  const name = document.getElementById('jsPlayerName').value.trim();
  const phone = document.getElementById('jsPlayerPhone').value.trim();

  if (!name || !phone) {
    alert('Please enter your name and phone number.');
    return;
  }

  const res = await fetch(`/api/squads/${state.joiningSquad._id}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone })
  });

  const data = await res.json();
  if (data.success) {
    alert(data.message);
    closeJoinSquadModal();
    await fetchSquads();
  } else {
    alert(data.error || 'Could not join squad');
  }
}

// ==========================================
// 9. AUDIT LOGS MODAL & MINI FEED
// ==========================================
async function fetchActivityLogsMini() {
  const container = document.getElementById('ownerMiniLogs');
  if (!container) return;

  try {
    const res = await fetch('/api/activity-logs');
    const data = await res.json();
    const logs = data.logs || [];

    container.innerHTML = logs.slice(0, 5).map(l => `
      <div class="p-2 rounded-xl border border-slate-100 bg-slate-50 flex items-start space-x-2">
        <i data-lucide="check-circle" class="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5"></i>
        <div>
          <div class="font-bold text-slate-800 text-[11px]">${l.action}</div>
          <div class="text-[10px] text-slate-500">${new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${l.details || ''}</div>
        </div>
      </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
  } catch (e) {}
}

async function openActivityLogsModal() {
  const modal = document.getElementById('activityLogsModal');
  const container = document.getElementById('auditLogsContainer');
  modal.classList.remove('hidden');

  container.innerHTML = '<p class="text-xs text-slate-400">Loading MongoDB audit trail...</p>';

  try {
    const res = await fetch('/api/activity-logs');
    const data = await res.json();
    const logs = data.logs || [];

    if (logs.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-400 italic">No activity logs recorded yet.</p>';
      return;
    }

    container.innerHTML = logs.map(l => {
      const isBooking = l.type === 'booking';
      const isSub = l.type === 'subscription';
      const isCourt = l.type === 'court_status';
      const isReview = l.type === 'review';
      const isUser = l.type === 'user';

      const badgeColor = isBooking ? 'bg-blue-100 text-blue-800' :
        (isSub ? 'bg-amber-100 text-amber-800' :
        (isCourt ? 'bg-emerald-100 text-emerald-800' :
        (isReview ? 'bg-purple-100 text-purple-800' :
        (isUser ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-700'))));

      return `
        <div class="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-start space-x-3 text-xs">
          <div class="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0">
            <i data-lucide="${isBooking ? 'ticket' : (isSub ? 'credit-card' : (isReview ? 'star' : (isUser ? 'user' : 'activity')))}" class="w-4 h-4 text-blue-600"></i>
          </div>
          <div class="flex-1 space-y-0.5">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-900">${l.action}</span>
              <span class="text-[10px] font-bold px-2 py-0.2 rounded-full ${badgeColor}">${l.type}</span>
            </div>
            <p class="text-slate-600 text-[11px]">${l.details}</p>
            <span class="text-[10px] text-slate-400">${new Date(l.timestamp).toLocaleString()}</span>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  } catch (e) {
    container.innerHTML = '<p class="text-xs text-rose-500">Failed to load audit trail.</p>';
  }
}

function closeActivityLogsModal() {
  document.getElementById('activityLogsModal').classList.add('hidden');
}
