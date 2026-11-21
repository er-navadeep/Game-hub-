/**
 * GameHub Pro — Unified Booking Platform Controller
 * 
 * Features:
 * 1. Receptionist QR Code Scanner & Check-in Verification
 * 2. Squad Finder & Matchmaking Beacon Board
 * 3. In-Venue F&B Cafe & Snack Bar Menu at Checkout
 * 4. Real-time Seat Locking Engine (5-minute auto-release)
 */

// Unique client session ID for seat locking
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

// Application State
const state = {
  currentView: 'explore',
  venues: [],
  filteredVenues: [],
  categoryFilter: 'All',
  cityFilter: 'All',
  searchQuery: '',
  allBookings: [],
  squads: [],
  squadCategoryFilter: 'All',
  currentBookingVenue: null,
  selectedDate: '',
  selectedSlot: '05:00 PM - 06:00 PM',
  selectedSeats: [],
  selectedSnacks: {}, // { snk_1: 2, snk_3: 1 }
  swimmingSpots: 1,
  currentAvailability: null,
  seatLockTimer: null,
  seatLockRemainingSeconds: 300,
  joiningSquad: null,
  dbStatus: { connected: false, message: 'Connecting...' }
};

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
  state.selectedDate = getDateOffset(0);
  const dateInput = document.getElementById('bookingCustomDate');
  if (dateInput) dateInput.value = state.selectedDate;

  // Initialize Lucide icons
  if (window.lucide) lucide.createIcons();

  // Initial fetches
  await checkDbStatus();
  await fetchVenues();
  await fetchBookings();
  await fetchSquads();
  await fetchActivityLogsMini();

  // Periodic refresh
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
      pill.className = 'flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-semibold text-emerald-800 shadow-sm';
      text.innerText = 'MongoDB: 127.0.0.1:27017';
      pill.title = `Connected to local MongoDB (${data.mongoUri})`;
    } else {
      pill.className = 'flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] font-semibold text-amber-800 shadow-sm';
      text.innerText = 'Local Persistence Active';
      pill.title = data.dbStatusMessage || 'Local storage active';
    }
  } catch (err) {
    console.warn('Status check failed:', err.message);
  }
}

// ==========================================
// NAVIGATION
// ==========================================
function navigate(viewName) {
  state.currentView = viewName;

  const views = ['explore', 'squads', 'tickets', 'owner'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    const navBtn = document.getElementById(`nav-${v}`);

    if (v === viewName) {
      if (el) el.classList.remove('hidden');
      if (navBtn) {
        navBtn.className = 'px-3 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all flex items-center space-x-1.5 text-blue-600 bg-blue-50';
      }
    } else {
      if (el) el.classList.add('hidden');
      if (navBtn) {
        navBtn.className = 'px-3 py-2 rounded-xl text-xs lg:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center space-x-1.5';
      }
    }
  });

  if (viewName === 'explore') fetchVenues();
  if (viewName === 'squads') fetchSquads();
  if (viewName === 'tickets') fetchBookings();
  if (viewName === 'owner') {
    fetchOwnerVenues();
    fetchActivityLogsMini();
  }

  if (window.lucide) lucide.createIcons();
}

function toggleMobileMenu() {
  const m = document.getElementById('mobileMenu');
  m.classList.toggle('hidden');
}

// ==========================================
// EXPLORE HUBS & FILTERS
// ==========================================
async function fetchVenues() {
  try {
    const params = new URLSearchParams();
    if (state.categoryFilter !== 'All') params.append('category', state.categoryFilter);
    if (state.cityFilter !== 'All') params.append('city', state.cityFilter);
    if (state.searchQuery.trim()) params.append('search', state.searchQuery.trim());

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

  countText.innerText = venues.length;

  if (venues.length === 0) {
    grid.innerHTML = '';
    noVenues.classList.remove('hidden');
    return;
  }
  noVenues.classList.add('hidden');

  grid.innerHTML = venues.map(venue => {
    const isOnline = venue.category === 'Online Gaming';
    const isBoth = venue.category === 'Both';
    const isOffline = venue.category === 'Offline Sports';

    const categoryBadgeClass = isOnline
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
      : (isOffline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-purple-50 text-purple-700 border-purple-200');

    let availabilityBadgeHtml = '';
    const isSwimming = venue.gamesOffered && venue.gamesOffered.some(g => g.toLowerCase().includes('swim'));
    const isVolleyball = venue.gamesOffered && venue.gamesOffered.some(g => g.toLowerCase().includes('volley'));

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
          <span>Max 10 / Batch (Slots Available)</span>
        </span>
      `;
    } else if (isVolleyball) {
      const isCourtEmpty = venue.courtStatus === 'Empty';
      availabilityBadgeHtml = isCourtEmpty
        ? `
          <span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold badge-available">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Volleyball: Empty (Ready)</span>
          </span>
        `
        : `
          <span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold badge-occupied">
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Volleyball: Occupied</span>
          </span>
        `;
    } else {
      availabilityBadgeHtml = `
        <span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold badge-available">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Open for Booking</span>
        </span>
      `;
    }

    const gamesTags = (venue.gamesOffered || []).slice(0, 4).map(g =>
      `<span class="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">${g}</span>`
    ).join(' ');

    const mapLink = venue.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(venue.shopName + ' ' + venue.city)}`;

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
              <span>${venue.rating || 4.9}</span>
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

            <!-- Games Tags -->
            <div class="flex flex-wrap gap-1.5 pt-1">
              ${gamesTags}
            </div>

            <!-- Live Status Badge -->
            <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>${availabilityBadgeHtml}</div>
              <div class="text-right">
                <span class="text-xs text-slate-400 block text-[10px] uppercase font-semibold">Price</span>
                <span class="text-sm font-black text-slate-900">₹${venue.pricePerHour}<span class="text-xs font-normal text-slate-500">/hr</span></span>
              </div>
            </div>

          </div>
        </div>

        <!-- Card Action CTA -->
        <div class="p-5 pt-0">
          <button onclick="openBookingModal('${venue._id}')" class="w-full py-2.5 px-4 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center space-x-2">
            <i data-lucide="calendar" class="w-4 h-4"></i>
            <span>Book Slot & Stations</span>
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

  btnAll.className = category === 'All' ? activeClasses : inactiveClasses;
  btnOnline.className = category === 'Online Gaming' ? activeClasses : inactiveClasses;
  btnOffline.className = category === 'Offline Sports' ? activeClasses : inactiveClasses;

  fetchVenues();
}

function applyFilters() {
  const citySelect = document.getElementById('cityFilter');
  const searchInput = document.getElementById('searchInput');

  state.cityFilter = citySelect.value;
  state.searchQuery = searchInput.value;

  fetchVenues();
}

function resetFilters() {
  document.getElementById('cityFilter').value = 'All';
  document.getElementById('searchInput').value = '';
  state.cityFilter = 'All';
  state.searchQuery = '';
  setCategoryFilter('All');
}

// ==========================================
// FEATURE 4: SEAT LOCKING & BOOKING FLOW
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

  document.getElementById('bmPlayerName').value = '';
  document.getElementById('bmPlayerPhone').value = '';
  stopSeatLockCountdown();

  document.getElementById('bookingModal').classList.remove('hidden');

  await loadSlotAvailability();

  if (window.lucide) lucide.createIcons();
}

function closeBookingModal() {
  // Release held seat locks
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
  document.getElementById('bookingModal').classList.add('hidden');
}

function selectBookingDate(offsetDays) {
  state.selectedDate = getDateOffset(offsetDays);
  document.getElementById('bookingCustomDate').value = state.selectedDate;

  [0, 1, 2].forEach(idx => {
    const btn = document.getElementById(`dateBtn-${idx}`);
    if (idx === offsetDays) {
      btn.className = 'date-tab px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white border border-blue-600';
    } else {
      btn.className = 'date-tab px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200';
    }
  });

  loadSlotAvailability();
}

function onCustomDateChange(dateValue) {
  if (!dateValue) return;
  state.selectedDate = dateValue;

  [0, 1, 2].forEach(idx => {
    const btn = document.getElementById(`dateBtn-${idx}`);
    btn.className = 'date-tab px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200';
  });

  loadSlotAvailability();
}

function renderHourlySlots() {
  const container = document.getElementById('slotsContainer');
  container.innerHTML = HOURLY_SLOTS.map(slot => {
    const isSelected = slot === state.selectedSlot;
    const btnClass = isSelected
      ? 'px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-sm border border-blue-600 transition'
      : 'px-3 py-2 text-xs font-medium bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition';

    return `
      <button type="button" onclick="selectSlot('${slot}')" class="${btnClass}">
        ${slot}
      </button>
    `;
  }).join('');
}

function selectSlot(slot) {
  state.selectedSlot = slot;
  state.selectedSeats = [];
  stopSeatLockCountdown();
  renderHourlySlots();
  loadSlotAvailability();
}

async function loadSlotAvailability() {
  if (!state.currentBookingVenue) return;

  const venueId = state.currentBookingVenue._id;
  const date = state.selectedDate;
  const slot = state.selectedSlot;

  try {
    const res = await fetch(`/api/venues/${venueId}/availability?date=${date}&timeSlot=${encodeURIComponent(slot)}&sessionId=${CLIENT_SESSION_ID}`);
    const data = await res.json();

    if (data.success) {
      state.currentAvailability = data;
      renderInteractiveArea(data);
      updateTotalPayable();
    }
  } catch (err) {
    console.error('Error fetching availability:', err);
  }
}

function renderInteractiveArea(avail) {
  const seatMapSection = document.getElementById('seatMapSection');
  const courtStatusSection = document.getElementById('courtStatusSection');
  const swimmingSection = document.getElementById('swimmingCapacitySection');

  seatMapSection.classList.add('hidden');
  courtStatusSection.classList.add('hidden');
  swimmingSection.classList.add('hidden');

  const venue = state.currentBookingVenue;
  const isSwimming = venue.gamesOffered && venue.gamesOffered.some(g => g.toLowerCase().includes('swim'));
  const isVolleyball = venue.gamesOffered && venue.gamesOffered.some(g => g.toLowerCase().includes('volley'));
  const isOnline = venue.category === 'Online Gaming' || (venue.category === 'Both' && !isSwimming && !isVolleyball);

  if (isOnline) {
    seatMapSection.classList.remove('hidden');
    renderSeatMap(avail);
  } else if (isSwimming) {
    swimmingSection.classList.remove('hidden');
    renderSwimmingCapacity(avail);
  } else {
    courtStatusSection.classList.remove('hidden');
    renderCourtStatus(avail);
  }
}

// Render Seat Map with Real-Time Locked Seats
function renderSeatMap(avail) {
  const grid = document.getElementById('seatGrid');
  const total = avail.totalSeats || 24;
  const booked = avail.bookedSeats || [];
  const locked = avail.lockedSeats || [];

  let html = '';
  const rows = ['A', 'B', 'C', 'D'];
  const seatsPerRow = Math.min(12, Math.ceil(total / 2));

  let seatIndex = 0;
  for (let r = 0; r < 2; r++) {
    const rowLetter = rows[r];
    html += `<div class="flex items-center space-x-2 my-1 w-full justify-center">`;
    html += `<span class="w-5 text-xs font-bold text-slate-400">${rowLetter}</span>`;

    for (let c = 1; c <= seatsPerRow; c++) {
      seatIndex++;
      if (seatIndex > total) break;

      const seatId = `${rowLetter}${c}`;
      const isBooked = booked.includes(seatId);
      const isSelected = state.selectedSeats.includes(seatId);
      const lockObj = locked.find(l => l.seatId === seatId);
      const isLockedByOther = lockObj && !lockObj.isMine;

      let seatClass = 'seat-btn seat-available';
      let title = `Station ${seatId} Available (Click to select)`;
      let disabledAttr = '';

      if (isBooked) {
        seatClass = 'seat-btn seat-booked';
        title = `Station ${seatId} Booked`;
        disabledAttr = 'disabled';
      } else if (isLockedByOther) {
        seatClass = 'seat-btn seat-locked';
        title = `Station ${seatId} is held by another player (${lockObj.expiresInSeconds}s left)`;
        disabledAttr = 'disabled';
      } else if (isSelected) {
        seatClass = 'seat-btn seat-selected';
        title = `Station ${seatId} Selected by you`;
      }

      html += `
        <button type="button" 
          onclick="${(isBooked || isLockedByOther) ? '' : `toggleSeat('${seatId}')`}"
          ${disabledAttr}
          class="${seatClass}" 
          title="${title}">
          ${seatId}
        </button>
      `;
    }
    html += `</div>`;
  }

  grid.innerHTML = html;
  document.getElementById('selectedSeatsLabel').innerText = state.selectedSeats.length > 0
    ? state.selectedSeats.join(', ')
    : 'None';
}

async function toggleSeat(seatId) {
  const venue = state.currentBookingVenue;
  if (!venue) return;

  const idx = state.selectedSeats.indexOf(seatId);

  if (idx > -1) {
    // Unselect seat and release lock
    state.selectedSeats.splice(idx, 1);
    fetch(`/api/venues/${venue._id}/unlock-seat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: state.selectedDate,
        timeSlot: state.selectedSlot,
        seatId,
        sessionId: CLIENT_SESSION_ID
      })
    }).catch(() => {});

    if (state.selectedSeats.length === 0) {
      stopSeatLockCountdown();
    }
  } else {
    // Select and lock seat on backend
    try {
      const res = await fetch(`/api/venues/${venue._id}/lock-seat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: state.selectedDate,
          timeSlot: state.selectedSlot,
          seatId,
          sessionId: CLIENT_SESSION_ID
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || 'Seat could not be locked');
        return;
      }

      state.selectedSeats.push(seatId);
      startSeatLockCountdown(300); // 5 minutes
    } catch (e) {
      state.selectedSeats.push(seatId);
    }
  }

  if (state.currentAvailability) {
    renderSeatMap(state.currentAvailability);
  }
  updateTotalPayable();
}

function startSeatLockCountdown(seconds) {
  stopSeatLockCountdown();
  state.seatLockRemainingSeconds = seconds;

  const banner = document.getElementById('seatLockTimerBanner');
  const timerText = document.getElementById('seatLockCountdown');
  banner.classList.remove('hidden');

  function updateTimer() {
    const mins = String(Math.floor(state.seatLockRemainingSeconds / 60)).padStart(2, '0');
    const secs = String(state.seatLockRemainingSeconds % 60).padStart(2, '0');
    timerText.innerText = `${mins}:${secs}`;

    if (state.seatLockRemainingSeconds <= 0) {
      stopSeatLockCountdown();
      alert('⚠️ Your 5-minute seat hold has expired. Please re-select your seats.');
      state.selectedSeats = [];
      loadSlotAvailability();
    } else {
      state.seatLockRemainingSeconds--;
    }
  }

  updateTimer();
  state.seatLockTimer = setInterval(updateTimer, 1000);
}

function stopSeatLockCountdown() {
  if (state.seatLockTimer) {
    clearInterval(state.seatLockTimer);
    state.seatLockTimer = null;
  }
  const banner = document.getElementById('seatLockTimerBanner');
  if (banner) banner.classList.add('hidden');
}

// Render Swimming pool capacity meter
function renderSwimmingCapacity(avail) {
  const title = document.getElementById('swimmingSlotBatchTitle');
  const spotsLeftBadge = document.getElementById('swimmingSpotsLeftBadge');
  const filledText = document.getElementById('swimmingFilledText');
  const bar = document.getElementById('swimmingCapacityBar');
  const countSpan = document.getElementById('swimmingSpotsCount');

  title.innerText = `${state.selectedSlot} Batch`;

  const max = avail.swimmingMaxBatch || 10;
  const filled = avail.swimmingFilledSpots || 0;
  const left = avail.swimmingSpotsLeft != null ? avail.swimmingSpotsLeft : Math.max(0, max - filled);

  spotsLeftBadge.innerText = `${left} spots left`;
  if (left <= 0) {
    spotsLeftBadge.className = 'px-3 py-1 bg-rose-100 border border-rose-300 text-rose-800 rounded-full text-xs font-bold';
    spotsLeftBadge.innerText = 'BATCH FULL';
  } else {
    spotsLeftBadge.className = 'px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-full text-xs font-bold';
  }

  filledText.innerText = `${filled}/${max} slots filled for ${state.selectedSlot}`;
  const pct = Math.min(100, Math.round((filled / max) * 100));
  bar.style.width = `${pct}%`;

  if (state.swimmingSpots > left && left > 0) state.swimmingSpots = left;
  if (left === 0) state.swimmingSpots = 0;
  countSpan.innerText = state.swimmingSpots;
}

function changeSwimmingSpots(delta) {
  if (!state.currentAvailability) return;
  const left = state.currentAvailability.swimmingSpotsLeft || 0;
  if (left <= 0) return;

  const next = state.swimmingSpots + delta;
  if (next >= 1 && next <= left) {
    state.swimmingSpots = next;
    document.getElementById('swimmingSpotsCount').innerText = state.swimmingSpots;
    updateTotalPayable();
  }
}

// Render Volleyball / Court Status
function renderCourtStatus(avail) {
  const alertBox = document.getElementById('courtStatusAlert');
  const isOccupied = avail.courtOccupiedForSlot;

  if (!isOccupied) {
    alertBox.className = 'p-5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-center space-x-4';
    alertBox.innerHTML = `
      <div class="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
        <i data-lucide="check-circle-2" class="w-6 h-6"></i>
      </div>
      <div>
        <h4 class="text-xs sm:text-sm font-bold text-emerald-900">Volleyball Court is EMPTY & Available!</h4>
        <p class="text-[11px] text-emerald-700 mt-0.5">The court is unoccupied for ${state.selectedSlot}. You can reserve the full court below.</p>
      </div>
    `;
  } else {
    alertBox.className = 'p-5 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 flex items-center space-x-4';
    alertBox.innerHTML = `
      <div class="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
        <i data-lucide="alert-octagon" class="w-6 h-6"></i>
      </div>
      <div>
        <h4 class="text-xs sm:text-sm font-bold text-rose-900">Court is Currently OCCUPIED</h4>
        <p class="text-[11px] text-rose-700 mt-0.5">This court is reserved or set to Occupied by the owner for ${state.selectedSlot}.</p>
      </div>
    `;
  }

  if (window.lucide) lucide.createIcons();
}

// ==========================================
// FEATURE 3: IN-VENUE F&B SNACK BAR
// ==========================================
function renderSnackBar() {
  const container = document.getElementById('snackBarList');
  container.innerHTML = SNACK_MENU.map(item => {
    const qty = state.selectedSnacks[item.id] || 0;
    return `
      <div class="snack-card flex items-center justify-between">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <i data-lucide="${item.icon}" class="w-4 h-4"></i>
          </div>
          <div>
            <div class="text-xs font-bold text-slate-800">${item.name}</div>
            <div class="text-[11px] font-semibold text-emerald-600">₹${item.price}</div>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button type="button" onclick="updateSnackQty('${item.id}', -1)" class="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs">-</button>
          <span class="w-4 text-center font-bold text-xs text-slate-900">${qty}</span>
          <button type="button" onclick="updateSnackQty('${item.id}', 1)" class="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs">+</button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function updateSnackQty(snackId, delta) {
  const current = state.selectedSnacks[snackId] || 0;
  const next = Math.max(0, current + delta);
  if (next === 0) {
    delete state.selectedSnacks[snackId];
  } else {
    state.selectedSnacks[snackId] = next;
  }
  renderSnackBar();
  updateTotalPayable();
}

function getSnacksTotal() {
  let total = 0;
  for (const [id, qty] of Object.entries(state.selectedSnacks)) {
    const item = SNACK_MENU.find(m => m.id === id);
    if (item) total += item.price * qty;
  }
  return total;
}

function getSelectedSnacksList() {
  const list = [];
  for (const [id, qty] of Object.entries(state.selectedSnacks)) {
    const item = SNACK_MENU.find(m => m.id === id);
    if (item && qty > 0) {
      list.push({ id: item.id, name: item.name, price: item.price, qty });
    }
  }
  return list;
}

function updateTotalPayable() {
  if (!state.currentBookingVenue) return;

  const rate = state.currentBookingVenue.pricePerHour || 150;
  const isSwimming = state.currentBookingVenue.gamesOffered && state.currentBookingVenue.gamesOffered.some(g => g.toLowerCase().includes('swim'));
  const isVolleyball = state.currentBookingVenue.gamesOffered && state.currentBookingVenue.gamesOffered.some(g => g.toLowerCase().includes('volley'));

  let count = 1;
  if (isSwimming) {
    count = state.swimmingSpots;
  } else if (!isVolleyball) {
    count = state.selectedSeats.length > 0 ? state.selectedSeats.length : 1;
  }

  const seatCost = rate * count;
  const snacksCost = getSnacksTotal();
  const total = seatCost + snacksCost;

  document.getElementById('snacksTotalPill').innerText = `₹${snacksCost} in snacks`;
  document.getElementById('bmTotalAmountText').innerText = `₹${total}`;
}

// ==========================================
// SUBMIT BOOKING & DIGITAL QR PASS
// ==========================================
async function submitBooking() {
  const venue = state.currentBookingVenue;
  if (!venue) return;

  const playerName = document.getElementById('bmPlayerName').value.trim();
  const phone = document.getElementById('bmPlayerPhone').value.trim();
  const paymentMethod = document.querySelector('input[name="bmPaymentMethod"]:checked').value;

  if (!playerName || !phone) {
    alert('Please enter your full name and phone number.');
    return;
  }

  const isSwimming = venue.gamesOffered && venue.gamesOffered.some(g => g.toLowerCase().includes('swim'));
  const isVolleyball = venue.gamesOffered && venue.gamesOffered.some(g => g.toLowerCase().includes('volley'));
  const isOnline = venue.category === 'Online Gaming' || (!isSwimming && !isVolleyball);

  if (isOnline && state.selectedSeats.length === 0) {
    alert('Please select at least 1 gaming seat station from the visual seat map.');
    return;
  }

  if (isSwimming && state.swimmingSpots <= 0) {
    alert('No swimming slots available for this batch.');
    return;
  }

  if (isVolleyball && state.currentAvailability && state.currentAvailability.courtOccupiedForSlot) {
    alert('The court is already occupied for this time slot. Please pick another hourly slot.');
    return;
  }

  const confirmBtn = document.getElementById('bmConfirmBtn');
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = `<span>Reserving in MongoDB...</span>`;

  try {
    const snacksList = getSelectedSnacksList();
    const snacksTotal = getSnacksTotal();

    const payload = {
      venueId: venue._id,
      playerName,
      phone,
      date: state.selectedDate,
      timeSlot: state.selectedSlot,
      seats: isOnline ? state.selectedSeats : [],
      spotsCount: isSwimming ? state.swimmingSpots : 1,
      paymentMethod,
      snacks: snacksList,
      snacksTotal,
      sessionId: CLIENT_SESSION_ID
    };

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(`Booking Failed: ${data.error || 'Server error'}`);
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i><span>Confirm & Generate Pass</span>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    stopSeatLockCountdown();
    closeBookingModal();

    confirmBtn.disabled = false;
    confirmBtn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i><span>Confirm & Generate Pass</span>`;

    // Show Digital QR Ticket Pass Modal
    showDigitalTicket(data.booking);

    // Refresh tickets and explore list
    await fetchBookings();
    await fetchVenues();
    await fetchActivityLogsMini();

  } catch (err) {
    alert('Error connecting to backend API: ' + err.message);
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i><span>Confirm & Generate Pass</span>`;
  }
}

// Display Digital Entry Pass Receipt Modal
function showDigitalTicket(booking) {
  document.getElementById('dtBookingId').innerText = booking.bookingId;
  document.getElementById('dtVenueName').innerText = booking.venueName;
  document.getElementById('dtPlayerName').innerText = booking.playerName;
  document.getElementById('dtPhone').innerText = booking.phone;
  document.getElementById('dtSlot').innerText = `${booking.date} (${booking.timeSlot})`;
  document.getElementById('dtPaymentMethod').innerText = booking.paymentMethod;
  document.getElementById('dtTotalAmount').innerText = `₹${booking.totalAmount}`;

  // Reserved spots/seats text
  const seatsText = booking.seats && booking.seats.length > 0
    ? booking.seats.join(', ')
    : `${booking.spotsCount || 1} Spot(s) / Full Court`;
  document.getElementById('dtSeats').innerText = seatsText;

  // Status badge
  const isPaid = booking.paymentMethod === 'Pay Online';
  const badge = document.getElementById('dtStatusBadge');
  if (isPaid) {
    badge.className = 'text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300';
    badge.innerText = 'PAID ONLINE';
  } else {
    badge.className = 'text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300';
    badge.innerText = 'PAY AT VENUE (CASH)';
  }

  // Check-In Stamp
  const checkInStamp = document.getElementById('dtCheckInStamp');
  if (booking.checkInStatus === 'Checked-In') {
    checkInStamp.classList.remove('hidden');
  } else {
    checkInStamp.classList.add('hidden');
  }

  // Snacks section
  const snacksSection = document.getElementById('dtSnacksSection');
  const snacksListEl = document.getElementById('dtSnacksList');
  if (Array.isArray(booking.snacks) && booking.snacks.length > 0) {
    snacksSection.classList.remove('hidden');
    snacksListEl.innerHTML = booking.snacks.map(s => `<div>• ${s.qty}x ${s.name} (₹${s.price * s.qty})</div>`).join('');
  } else {
    snacksSection.classList.add('hidden');
  }

  // QR Code Image
  const qrImg = document.getElementById('dtQrImage');
  if (booking.qrCodeData && booking.qrCodeData.startsWith('data:image')) {
    qrImg.src = booking.qrCodeData;
  } else if (window.GameHubQR) {
    const qrPayload = JSON.stringify({
      ticket: booking.bookingId,
      venue: booking.venueName,
      player: booking.playerName,
      date: booking.date,
      slot: booking.timeSlot,
      seats: seatsText
    });
    qrImg.src = window.GameHubQR.generateUri(qrPayload, 180);
  }

  document.getElementById('ticketModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeTicketModal() {
  document.getElementById('ticketModal').classList.add('hidden');
}

// ==========================================
// FEATURE 1: RECEPTIONIST QR TICKET SCANNER
// ==========================================
function openScannerModal() {
  document.getElementById('scannerModal').classList.remove('hidden');
  document.getElementById('checkInResultBox').classList.add('hidden');
  document.getElementById('manualBookingIdInput').value = '';
  if (window.lucide) lucide.createIcons();
}

function closeScannerModal() {
  document.getElementById('scannerModal').classList.add('hidden');
}

async function verifyCheckInFromInput() {
  const code = document.getElementById('manualBookingIdInput').value.trim();
  if (!code) {
    alert('Please enter or scan a Booking ID (e.g. #GH-84920)');
    return;
  }

  const btn = document.getElementById('verifyBtn');
  btn.disabled = true;
  btn.innerHTML = `<span>Checking...</span>`;

  try {
    const res = await fetch('/api/bookings/verify-checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: code })
    });

    const data = await res.json();
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="shield-check" class="w-4 h-4"></i><span>Verify</span>`;

    const resultBox = document.getElementById('checkInResultBox');
    resultBox.classList.remove('hidden');

    if (!res.ok || !data.success) {
      resultBox.className = 'rounded-2xl p-4 border border-rose-200 bg-rose-50 text-rose-900 space-y-2';
      resultBox.innerHTML = `
        <div class="flex items-center space-x-2 font-bold text-rose-900 text-xs sm:text-sm">
          <i data-lucide="x-circle" class="w-5 h-5 text-rose-600 shrink-0"></i>
          <span>INVALID PASS / TICKET NOT FOUND</span>
        </div>
        <p class="text-xs text-rose-700">${data.error || 'No matching booking in MongoDB.'}</p>
      `;
    } else if (data.alreadyCheckedIn) {
      const b = data.booking;
      resultBox.className = 'rounded-2xl p-4 border border-amber-200 bg-amber-50 text-amber-900 space-y-2';
      resultBox.innerHTML = `
        <div class="flex items-center space-x-2 font-bold text-amber-900 text-xs sm:text-sm">
          <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-600 shrink-0"></i>
          <span>TICKET ALREADY SCANNED & CHECKED IN</span>
        </div>
        <p class="text-xs text-amber-800">${data.message}</p>
        <div class="text-xs text-slate-700 border-t border-amber-200/60 pt-2 grid grid-cols-2 gap-1.5">
          <div>Player: <strong>${b.playerName}</strong></div>
          <div>Venue: <strong>${b.venueName}</strong></div>
          <div>Time: <strong>${b.timeSlot}</strong></div>
          <div>Seats/Spots: <strong>${(b.seats && b.seats.length > 0) ? b.seats.join(', ') : b.spotsCount + ' spots'}</strong></div>
        </div>
      `;
    } else {
      const b = data.booking;
      const snacksNote = b.snacks && b.snacks.length > 0
        ? `<div class="mt-2 p-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs">
            <strong>F&B To Serve:</strong> ${b.snacks.map(s => `${s.qty}x ${s.name}`).join(', ')}
           </div>`
        : '';

      resultBox.className = 'rounded-2xl p-4 border border-emerald-200 bg-emerald-50 text-emerald-900 space-y-2';
      resultBox.innerHTML = `
        <div class="flex items-center space-x-2 font-bold text-emerald-900 text-xs sm:text-sm">
          <i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-600 shrink-0"></i>
          <span>ENTRY PERMITTED & CHECKED IN!</span>
        </div>
        <p class="text-xs text-emerald-800">${data.message}</p>
        <div class="text-xs text-slate-700 border-t border-emerald-200/60 pt-2 grid grid-cols-2 gap-1.5">
          <div>Booking ID: <strong class="text-blue-600">${b.bookingId}</strong></div>
          <div>Player: <strong>${b.playerName}</strong></div>
          <div>Phone: <strong>${b.phone}</strong></div>
          <div>Payment: <strong>${b.paymentStatus}</strong></div>
          <div>Slot: <strong>${b.date} (${b.timeSlot})</strong></div>
          <div>Seats: <strong class="text-blue-600">${(b.seats && b.seats.length > 0) ? b.seats.join(', ') : b.spotsCount + ' spots'}</strong></div>
        </div>
        ${snacksNote}
      `;
    }

    if (window.lucide) lucide.createIcons();

    // Refresh tickets list
    await fetchBookings();
    await fetchActivityLogsMini();

  } catch (err) {
    alert('Verification error: ' + err.message);
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="shield-check" class="w-4 h-4"></i><span>Verify</span>`;
  }
}

// ==========================================
// FEATURE 2: SQUAD FINDER & MATCHMAKING
// ==========================================
async function fetchSquads() {
  try {
    const params = new URLSearchParams();
    if (state.squadCategoryFilter !== 'All') {
      params.append('category', state.squadCategoryFilter);
    }

    const res = await fetch(`/api/squads?${params.toString()}`);
    const data = await res.json();

    if (data.success) {
      state.squads = data.squads || [];
      renderSquads(state.squads);

      const badge = document.getElementById('squadCountBadge');
      const badgeMobile = document.getElementById('squadCountBadgeMobile');
      const countLabel = document.getElementById('squadCountLabel');

      if (badge) badge.innerText = state.squads.length;
      if (badgeMobile) badgeMobile.innerText = state.squads.length;
      if (countLabel) countLabel.innerText = state.squads.length;
    }
  } catch (err) {
    console.error('Error fetching squads:', err);
  }
}

function filterSquadCategory(cat) {
  state.squadCategoryFilter = cat;

  const btnAll = document.getElementById('sq-cat-all');
  const btnOnline = document.getElementById('sq-cat-online');
  const btnOffline = document.getElementById('sq-cat-offline');

  const active = 'px-3 py-1.5 rounded-lg font-bold bg-slate-900 text-white';
  const inactive = 'px-3 py-1.5 rounded-lg font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200';

  btnAll.className = cat === 'All' ? active : inactive;
  btnOnline.className = cat === 'Online Gaming' ? active : inactive;
  btnOffline.className = cat === 'Offline Sports' ? active : inactive;

  fetchSquads();
}

function renderSquads(squads) {
  const grid = document.getElementById('squadGrid');
  const noSquads = document.getElementById('noSquadsNotice');

  if (squads.length === 0) {
    grid.innerHTML = '';
    noSquads.classList.remove('hidden');
    return;
  }
  noSquads.classList.add('hidden');

  grid.innerHTML = squads.map(sq => {
    const isOnline = sq.category === 'Online Gaming';
    const tagClass = isOnline
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

    const membersHtml = (sq.members || []).map(m =>
      `<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">👤 ${m.name}</span>`
    ).join(' ');

    const isFull = sq.spotsNeeded <= 0 || sq.status === 'Full';
    const spotsBadge = isFull
      ? '<span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px]">SQUAD FULL</span>'
      : `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">${sq.spotsNeeded} Spot(s) Open</span>`;

    const whatsappLink = `https://api.whatsapp.com/send?phone=${sq.hostPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent('Hi ' + sq.hostName + ', I saw your GameHub squad beacon for ' + sq.game + ' at ' + sq.venueName + '!')}`;

    return `
      <div class="gamehub-card p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 hover:border-indigo-400 transition">
        
        <div class="space-y-3">
          <!-- Top Tags -->
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tagClass}">
              ${sq.game}
            </span>
            <div>${spotsBadge}</div>
          </div>

          <!-- Title & Venue -->
          <div>
            <h3 class="text-sm sm:text-base font-bold text-slate-900 leading-snug">${sq.title}</h3>
            <p class="text-xs text-slate-500 flex items-center space-x-1 mt-1">
              <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i>
              <span>${sq.venueName} • ${sq.city}</span>
            </p>
          </div>

          <!-- Slot & Skill Level -->
          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Match Time:</span>
              <strong class="text-slate-800">${sq.date} • ${sq.timeSlot}</strong>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Skill Level:</span>
              <strong class="text-indigo-600">${sq.skillLevel}</strong>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Host / Captain:</span>
              <strong class="text-slate-800">${sq.hostName}</strong>
            </div>
          </div>

          <!-- Description -->
          ${sq.description ? `<p class="text-xs text-slate-600 line-clamp-2 italic">"${sq.description}"</p>` : ''}

          <!-- Current Members -->
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Joined Players:</span>
            <div class="flex flex-wrap gap-1">
              ${membersHtml}
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="pt-2 border-t border-slate-100 flex items-center space-x-2">
          ${isFull
            ? `<button disabled class="flex-1 py-2 bg-slate-100 text-slate-400 font-bold rounded-xl text-xs cursor-not-allowed">Squad Full</button>`
            : `<button onclick="openJoinSquadModal('${sq._id}')" class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center space-x-1">
                 <i data-lucide="user-plus" class="w-3.5 h-3.5"></i>
                 <span>Join Squad</span>
               </button>`
          }
          <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer" class="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition border border-emerald-200 flex items-center justify-center space-x-1" title="Message Captain on WhatsApp">
            <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
            <span>Chat</span>
          </a>
        </div>

      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function openCreateSquadModal() {
  updateSquadVenuesDropdown();
  document.getElementById('sqDate').value = getDateOffset(0);
  document.getElementById('createSquadModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeCreateSquadModal() {
  document.getElementById('createSquadModal').classList.add('hidden');
}

function updateSquadVenuesDropdown() {
  const cat = document.getElementById('sqCategory').value;
  const select = document.getElementById('sqVenueSelect');
  const filtered = state.venues.filter(v => cat === 'Online Gaming' ? (v.category === 'Online Gaming' || v.category === 'Both') : (v.category === 'Offline Sports' || v.category === 'Both'));

  select.innerHTML = (filtered.length > 0 ? filtered : state.venues).map(v => `
    <option value="${v._id}" data-city="${v.city}">${v.shopName} (${v.city})</option>
  `).join('');

  if (select.options.length > 0) {
    const selectedCity = select.options[0].getAttribute('data-city');
    if (selectedCity) document.getElementById('sqCity').value = selectedCity;
  }
}

async function handleCreateSquad(e) {
  e.preventDefault();

  const title = document.getElementById('sqTitle').value.trim();
  const category = document.getElementById('sqCategory').value;
  const game = document.getElementById('sqGame').value.trim();
  const venueSelect = document.getElementById('sqVenueSelect');
  const venueId = venueSelect.value;
  const venueName = venueSelect.options[venueSelect.selectedIndex].text.split(' (')[0];
  const city = document.getElementById('sqCity').value.trim();
  const date = document.getElementById('sqDate').value;
  const timeSlot = document.getElementById('sqSlot').value;
  const spotsTotal = Number(document.getElementById('sqTotal').value) || 5;
  const spotsNeeded = Number(document.getElementById('sqNeeded').value) || 2;
  const hostName = document.getElementById('sqHostName').value.trim();
  const hostPhone = document.getElementById('sqHostPhone').value.trim();
  const skillLevel = document.getElementById('sqSkill').value.trim() || 'All Skill Levels';
  const description = document.getElementById('sqDesc').value.trim();

  try {
    const res = await fetch('/api/squads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        category,
        game,
        venueId,
        venueName,
        city,
        date,
        timeSlot,
        spotsTotal,
        spotsNeeded,
        hostName,
        hostPhone,
        skillLevel,
        description
      })
    });

    const data = await res.json();
    if (data.success) {
      alert('🎉 Match Beacon published live! Other players can now join your squad.');
      closeCreateSquadModal();
      await fetchSquads();
      await fetchActivityLogsMini();
    } else {
      alert(data.error || 'Failed to post squad beacon');
    }
  } catch (err) {
    alert('Error posting squad beacon: ' + err.message);
  }
}

function openJoinSquadModal(squadId) {
  const sq = state.squads.find(s => String(s._id) === String(squadId));
  if (!sq) return;

  state.joiningSquad = sq;
  document.getElementById('jsTitle').innerText = sq.title;
  document.getElementById('jsPlayerName').value = '';
  document.getElementById('jsPlayerPhone').value = '';

  document.getElementById('joinSquadModal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeJoinSquadModal() {
  document.getElementById('joinSquadModal').classList.add('hidden');
}

async function submitJoinSquad() {
  if (!state.joiningSquad) return;

  const name = document.getElementById('jsPlayerName').value.trim();
  const phone = document.getElementById('jsPlayerPhone').value.trim();

  if (!name || !phone) {
    alert('Please enter your full name and contact phone.');
    return;
  }

  try {
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
      await fetchActivityLogsMini();
    } else {
      alert(data.error || 'Failed to join squad');
    }
  } catch (err) {
    alert('Error joining squad: ' + err.message);
  }
}

// ==========================================
// MY TICKETS / BOOKINGS TAB
// ==========================================
async function fetchBookings() {
  try {
    const res = await fetch('/api/bookings');
    const data = await res.json();
    if (data.success) {
      state.allBookings = data.bookings || [];
      renderTickets(state.allBookings);

      const badge = document.getElementById('ticketCountBadge');
      const badgeMobile = document.getElementById('ticketCountBadgeMobile');
      if (badge) badge.innerText = state.allBookings.length;
      if (badgeMobile) badgeMobile.innerText = state.allBookings.length;
    }
  } catch (err) {
    console.error('Failed to fetch bookings:', err);
  }
}

function renderTickets(bookings) {
  const grid = document.getElementById('ticketsGrid');
  const empty = document.getElementById('noTicketsNotice');

  if (bookings.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = bookings.map(b => {
    const isPaid = b.paymentMethod === 'Pay Online';
    const statusBadge = isPaid
      ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">PAID ONLINE</span>'
      : '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">PAY AT VENUE</span>';

    const checkInBadge = b.checkInStatus === 'Checked-In'
      ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300">CHECKED-IN</span>'
      : '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">READY</span>';

    const seatsText = b.seats && b.seats.length > 0 ? b.seats.join(', ') : `${b.spotsCount || 1} spot(s)`;
    const qrSrc = (b.qrCodeData && b.qrCodeData.startsWith('data:image'))
      ? b.qrCodeData
      : (window.GameHubQR ? window.GameHubQR.generateUri(b.bookingId, 120) : '');

    const snacksTag = (b.snacks && b.snacks.length > 0)
      ? `<div class="text-[11px] text-amber-700 font-medium">🍿 ${b.snacks.length} snack item(s) included</div>`
      : '';

    return `
      <div class="gamehub-card p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4 hover:border-blue-400 transition">
        
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-xs font-black text-blue-600 tracking-wider">${b.bookingId}</span>
              ${checkInBadge}
            </div>
            <h3 class="text-base font-bold text-slate-900 mt-0.5">${b.venueName}</h3>
            <p class="text-xs text-slate-500">${b.date} • ${b.timeSlot}</p>
          </div>
          <div>${statusBadge}</div>
        </div>

        <div class="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div class="space-y-1 text-xs">
            <div><span class="text-slate-400">Player:</span> <strong class="text-slate-800">${b.playerName}</strong></div>
            <div><span class="text-slate-400">Seats/Spot:</span> <strong class="text-blue-600">${seatsText}</strong></div>
            <div><span class="text-slate-400">Total Amount:</span> <strong class="text-emerald-700">₹${b.totalAmount}</strong></div>
            ${snacksTag}
          </div>

          <div class="w-16 h-16 bg-white p-1 rounded-lg border border-slate-200 shrink-0">
            <img src="${qrSrc}" alt="QR" class="w-full h-full object-contain">
          </div>
        </div>

        <button onclick='showDigitalTicket(${JSON.stringify(b)})' class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5">
          <i data-lucide="qr-code" class="w-4 h-4"></i>
          <span>View Full Digital Pass & QR</span>
        </button>

      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function filterMyTickets() {
  const query = document.getElementById('ticketSearchInput').value.trim().toLowerCase();
  if (!query) {
    renderTickets(state.allBookings);
    return;
  }
  const filtered = state.allBookings.filter(b =>
    b.bookingId.toLowerCase().includes(query) ||
    b.phone.toLowerCase().includes(query) ||
    b.playerName.toLowerCase().includes(query) ||
    b.venueName.toLowerCase().includes(query)
  );
  renderTickets(filtered);
}

// ==========================================
// OWNER ONBOARDING & MONTHLY SUBSCRIPTION
// ==========================================
async function handleRegisterVenue(event) {
  event.preventDefault();

  const shopName = document.getElementById('regShopName').value.trim();
  const ownerName = document.getElementById('regOwnerName').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const city = document.getElementById('regCity').value;
  const address = document.getElementById('regAddress').value.trim();
  const mapUrl = document.getElementById('regMapUrl').value.trim();
  const image = document.getElementById('regImageUrl').value.trim();
  const category = document.querySelector('input[name="regCategory"]:checked').value;
  const gamesRaw = document.getElementById('regGames').value.trim();
  const totalCapacity = Number(document.getElementById('regCapacity').value) || 20;
  const pricePerHour = Number(document.getElementById('regPrice').value) || 150;

  const submitBtn = document.getElementById('regSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span>Activating Listing & Saving to MongoDB...</span>`;

  try {
    const payload = {
      shopName,
      ownerName,
      phone,
      city,
      address,
      mapUrl,
      image,
      category,
      gamesOffered: gamesRaw.split(',').map(s => s.trim()).filter(Boolean),
      totalCapacity,
      pricePerHour
    };

    const res = await fetch('/api/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(`Registration Failed: ${data.error || 'Server error'}`);
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i data-lucide="shield-check" class="w-5 h-5"></i><span>Activate Listing & Pay ₹999</span>`;
      return;
    }

    alert(`🎉 Success! "${shopName}" is now registered and published live with 30-Day Active Partner Status!`);
    document.getElementById('ownerRegisterForm').reset();
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i data-lucide="shield-check" class="w-5 h-5"></i><span>Activate Listing & Pay ₹999</span>`;

    await fetchVenues();
    navigate('explore');

  } catch (err) {
    alert('Failed to register venue: ' + err.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i data-lucide="shield-check" class="w-5 h-5"></i><span>Activate Listing & Pay ₹999</span>`;
  }
}

async function fetchOwnerVenues() {
  const container = document.getElementById('ownerVenuesList');
  if (!container) return;

  try {
    const res = await fetch('/api/venues');
    const data = await res.json();
    if (!data.success) return;

    const venues = data.venues || [];
    container.innerHTML = venues.map(v => {
      const isOccupied = v.courtStatus === 'Occupied';
      const statusBtnClass = isOccupied
        ? 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
        : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200';
      const statusIcon = isOccupied ? 'alert-circle' : 'check';
      const nextStatus = isOccupied ? 'Empty' : 'Occupied';

      return `
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
          <div class="truncate">
            <h4 class="text-xs font-bold text-slate-800 truncate">${v.shopName}</h4>
            <span class="text-[11px] text-slate-500">${v.city} • ${v.category}</span>
          </div>

          <button onclick="toggleCourtStatus('${v._id}', '${nextStatus}')" class="px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center space-x-1.5 ${statusBtnClass}" title="Click to change live court status in MongoDB">
            <i data-lucide="${statusIcon}" class="w-3.5 h-3.5"></i>
            <span>${v.courtStatus || 'Empty'}</span>
          </button>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();

  } catch (err) {
    console.error('Failed to load owner venues:', err);
  }
}

async function toggleCourtStatus(venueId, newStatus) {
  try {
    const res = await fetch(`/api/venues/${venueId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courtStatus: newStatus })
    });
    const data = await res.json();

    if (data.success) {
      await fetchOwnerVenues();
      await fetchVenues();
      await fetchActivityLogsMini();
    }
  } catch (err) {
    alert('Failed to update court status: ' + err.message);
  }
}

// ==========================================
// LIVE ACTIVITY AUDIT LOG
// ==========================================
async function fetchActivityLogsMini() {
  const container = document.getElementById('ownerMiniLogs');
  if (!container) return;

  try {
    const res = await fetch('/api/activity-logs');
    const data = await res.json();
    if (!data.success) return;

    const logs = (data.logs || []).slice(0, 4);
    container.innerHTML = logs.map(l => `
      <div class="pb-2 border-b border-slate-100 last:border-0">
        <div class="flex items-center justify-between">
          <span class="font-bold text-slate-800 text-[11px]">${l.action}</span>
          <span class="text-[10px] text-slate-400">${formatTimeAgo(l.timestamp)}</span>
        </div>
        <p class="text-[11px] text-slate-500 line-clamp-1 mt-0.5">${l.details}</p>
      </div>
    `).join('');
  } catch (err) {
    console.warn('Mini logs error:', err.message);
  }
}

async function openActivityLogsModal() {
  const container = document.getElementById('auditLogsContainer');
  container.innerHTML = `<div class="text-center py-6 text-xs text-slate-400">Loading MongoDB audit trail...</div>`;
  document.getElementById('activityLogsModal').classList.remove('hidden');

  try {
    const res = await fetch('/api/activity-logs');
    const data = await res.json();

    if (!data.success || data.logs.length === 0) {
      container.innerHTML = `<div class="text-center py-8 text-xs text-slate-500">No activity logs recorded yet.</div>`;
      return;
    }

    container.innerHTML = data.logs.map(log => {
      let icon = 'activity';
      let iconColor = 'text-blue-500 bg-blue-50';

      if (log.type === 'booking') {
        icon = 'ticket';
        iconColor = 'text-emerald-600 bg-emerald-50';
      } else if (log.type === 'court_status') {
        icon = 'sliders';
        iconColor = 'text-amber-600 bg-amber-50';
      } else if (log.type === 'subscription') {
        icon = 'credit-card';
        iconColor = 'text-indigo-600 bg-indigo-50';
      } else if (log.type === 'venue') {
        icon = 'store';
        iconColor = 'text-purple-600 bg-purple-50';
      }

      return `
        <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start space-x-3 text-xs">
          <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconColor}">
            <i data-lucide="${icon}" class="w-4 h-4"></i>
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-900">${log.action}</span>
              <span class="text-[10px] text-slate-400">${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <p class="text-slate-600 mt-1">${log.details}</p>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();

  } catch (err) {
    container.innerHTML = `<div class="text-center text-xs text-rose-500 py-4">Error loading activity logs: ${err.message}</div>`;
  }
}

function closeActivityLogsModal() {
  document.getElementById('activityLogsModal').classList.add('hidden');
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
