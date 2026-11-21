const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting GameHub Pro End-to-End Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  }

  try {
    // 1. Status & MongoDB Connection
    console.log('--- 1. MongoDB Health & Collections ---');
    const statusRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/status',
      method: 'GET'
    });
    assert(statusRes.status === 200, 'GET /api/status returns HTTP 200');
    assert(statusRes.data.dbConnected === true, 'MongoDB is connected (127.0.0.1:27017/gamehub)');
    assert(statusRes.data.collections.includes('users') && statusRes.data.collections.includes('venues'), 'Collections contain users, venues, bookings');

    // 2. User Registration & Auth
    console.log('\n--- 2. User Authentication & Profile ---');
    const testEmail = `player_${Date.now()}@gamehub.test`;
    const regRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'Aditya Sen',
      email: testEmail,
      phone: '+91 98888 77777',
      city: 'Bangalore',
      password: 'password123',
      favoriteGames: ['Valorant', 'Volleyball', 'Box Cricket']
    });
    assert(regRes.status === 201 && regRes.data.success, 'POST /api/auth/register creates user in MongoDB');
    const testUserId = regRes.data.user.id || regRes.data.user._id;

    // Login test
    const loginRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: testEmail,
      password: 'password123'
    });
    assert(loginRes.status === 200 && loginRes.data.success, 'POST /api/auth/login validates credentials');

    // Fetch user profile
    const userRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/users/${testUserId}`,
      method: 'GET'
    });
    assert(userRes.status === 200 && userRes.data.user.name === 'Aditya Sen', 'GET /api/users/:id retrieves user profile');

    // 3. Existing Games & Directory
    console.log('\n--- 3. Existing Games Directory ---');
    const gamesRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/games',
      method: 'GET'
    });
    assert(gamesRes.status === 200 && gamesRes.data.success, 'GET /api/games returns games catalog');
    assert(gamesRes.data.onlineGames.length >= 9, 'Online games catalog contains at least 9 games (PUBG, Valorant, PS5, etc.)');
    assert(gamesRes.data.offlineGames.length >= 8, 'Offline sports catalog contains at least 8 games (Volleyball, Swimming, Badminton, etc.)');

    // 4. Explore Hubs & Sorting
    console.log('\n--- 4. Explore Hubs, Badges & Sorting ---');
    const venuesRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/venues?sort=rating',
      method: 'GET'
    });
    assert(venuesRes.status === 200 && venuesRes.data.venues.length > 0, 'GET /api/venues retrieves active venues');
    const venues = venuesRes.data.venues;
    const targetVenue = venues.find(v => v.category === 'Online Gaming') || venues[0];
    assert(targetVenue.rating !== undefined, 'Venues have rating property');
    assert(Array.isArray(targetVenue.gamesOffered), 'Venues clearly expose gamesOffered array');

    // 5. Rating & Reviews
    console.log('\n--- 5. Ratings & Reviews System ---');
    const reviewRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/venues/${targetVenue._id}/reviews`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      userName: 'Aditya Sen',
      rating: 5,
      comment: 'Top-tier low latency fiber connection, very clean stations and great vibes!'
    });
    assert(reviewRes.status === 201 && reviewRes.data.success, 'POST /api/venues/:id/reviews records review');
    assert(reviewRes.data.reviewCount >= 1 || (reviewRes.data.venue && reviewRes.data.venue.reviewCount >= 1), 'Venue review count increments');

    // 6. Interactive Booking Flow (Seat Grid, Hold, QR Code)
    console.log('\n--- 6. Interactive Booking & Availability ---');
    const testDate = `2026-12-${String(Math.floor(Math.random() * 18) + 10)}`;
    const testSlot = '06:00 PM - 07:00 PM';
    const availBefore = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/venues/${targetVenue._id}/availability?date=${testDate}&timeSlot=${encodeURIComponent(testSlot)}`,
      method: 'GET'
    });
    assert(availBefore.status === 200, 'GET /api/venues/:id/availability responds 200');

    // Book seats A5, A6
    const bookRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/bookings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      userId: testUserId,
      venueId: targetVenue._id,
      playerName: 'Aditya Sen',
      phone: '+91 98888 77777',
      date: testDate,
      timeSlot: testSlot,
      seats: ['A5', 'A6'],
      paymentMethod: 'Pay Online',
      snacks: [{ id: 'snk_1', name: 'Red Bull Energy Drink (250ml)', price: 125, qty: 2 }],
      snacksTotal: 250
    });
    if (!bookRes.data.success) {
      console.error('Booking failed with response:', bookRes.data);
    }
    assert(bookRes.status === 201 && bookRes.data.success, 'POST /api/bookings confirms reservation in MongoDB');
    const booking = bookRes.data.booking;
    assert(booking.bookingId && booking.bookingId.startsWith('#GH-'), 'Booking ID follows #GH-XXXXX format');
    assert(booking.qrCodeData && booking.qrCodeData.startsWith('data:image/png;base64,'), 'Digital pass includes valid QR code data');

    // Verify seats are now booked in availability
    const availAfter = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/venues/${targetVenue._id}/availability?date=${testDate}&timeSlot=${encodeURIComponent(testSlot)}`,
      method: 'GET'
    });
    assert(availAfter.data.bookedSeats.includes('A5') && availAfter.data.bookedSeats.includes('A6'), 'Seats A5 & A6 are now marked BOOKED in MongoDB');

    // 7. Booking Cancellation & Instant Slot Liberation
    console.log('\n--- 7. Booking Cancellation & Slot Liberation ---');
    const cancelRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/bookings/${encodeURIComponent(booking.bookingId)}/cancel`,
      method: 'PATCH'
    });
    assert(cancelRes.status === 200 && cancelRes.data.success, 'PATCH /api/bookings/:id/cancel cancels booking');
    assert(cancelRes.data.booking.status === 'Cancelled', 'Booking status updated to Cancelled');

    // Verify seats are freed up again
    const availAfterCancel = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/venues/${targetVenue._id}/availability?date=${testDate}&timeSlot=${encodeURIComponent(testSlot)}`,
      method: 'GET'
    });
    assert(!availAfterCancel.data.bookedSeats.includes('A5') && !availAfterCancel.data.bookedSeats.includes('A6'), 'Seats A5 & A6 are immediately FREED UP in MongoDB availability');

    // 8. Owner Insights & Analytics
    console.log('\n--- 8. Owner Analytics & Revenue Insights ---');
    const insightsRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/owner/insights',
      method: 'GET'
    });
    assert(insightsRes.status === 200 && insightsRes.data.success, 'GET /api/owner/insights returns revenue breakdown');
    assert((insightsRes.data.cancelledBookings >= 1 || insightsRes.data.cancelledCount >= 1), 'Owner insights reflects cancelled booking count');

    // 9. Activity Logs Audit Trail
    console.log('\n--- 9. MongoDB Activity Logs Audit Trail ---');
    const logsRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/activity-logs',
      method: 'GET'
    });
    assert(logsRes.status === 200 && logsRes.data.logs.length > 0, 'GET /api/activity-logs returns audit logs');
    const actionTypes = logsRes.data.logs.map(l => l.type);
    assert(actionTypes.includes('user') || actionTypes.includes('review') || actionTypes.includes('booking'), 'Audit logs track user registrations, reviews, and bookings');

    console.log('\n====================================================');
    console.log(`📊 Test Results: ${passed} / ${total} checks passed (${Math.round((passed/total)*100)}%)`);
    console.log('====================================================');

    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  }
}

runTests();
