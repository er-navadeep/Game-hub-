const mongoose = require('mongoose');
const Venue = require('./models/Venue');
const Booking = require('./models/Booking');
const ActivityLog = require('./models/ActivityLog');
const SquadBeacon = require('./models/SquadBeacon');
const User = require('./models/User');

const demoUsers = [
  {
    name: 'Aman Sharma',
    email: 'aman@gamehub.demo',
    phone: '+91 98201 12345',
    city: 'Bangalore',
    password: 'password123',
    favoriteGames: ['Valorant', 'Counter-Strike 2', 'Volleyball']
  },
  {
    name: 'Priya Mehta',
    email: 'priya@gamehub.demo',
    phone: '+91 98450 67890',
    city: 'Mumbai',
    password: 'password123',
    favoriteGames: ['PS5', 'FIFA / EA FC', 'Badminton']
  },
  {
    name: 'Rohan Deshmukh',
    email: 'rohan@gamehub.demo',
    phone: '+91 97654 32109',
    city: 'Bangalore',
    password: 'password123',
    favoriteGames: ['Box Cricket', 'Swimming', 'Racing Simulator']
  }
];

const demoVenues = [
  {
    shopName: 'Nexus Arena Esports Hub',
    ownerName: 'Vikram Malhotra',
    phone: '+91 98765 43210',
    city: 'Bangalore',
    address: '4th Floor, Garuda Mall, Magrath Road, Ashok Nagar, Bangalore, Karnataka 560025',
    mapUrl: 'https://maps.google.com/?q=Garuda+Mall+Bangalore',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80',
    category: 'Online Gaming',
    gamesOffered: ['Valorant', 'Counter-Strike 2', 'PUBG / BGMI', 'PC Gaming', 'Racing Simulator'],
    pricePerHour: 150,
    totalCapacity: 24, // 24 gaming stations (Seats A1-A12, B1-B12)
    courtStatus: 'Empty',
    subscriptionStatus: 'Active',
    subscriptionFee: 999,
    subscriptionPaid: true,
    description: 'Premier RGB gaming lounge with RTX 4090 rigs, 360Hz monitors, direct-drive racing cockpits, and fiber-optic low-ping lines.',
    rating: 4.9,
    reviewCount: 2,
    reviews: [
      {
        userName: 'Aman Sharma',
        rating: 5,
        comment: 'Unbelievable 240Hz setups and 5ms ping to Mumbai servers. The Red Bull cafe is a huge plus!',
        createdAt: new Date(Date.now() - 86400000 * 2)
      },
      {
        userName: 'Tanmay Bhatt',
        rating: 5,
        comment: 'Best LAN center in Bangalore. Great Secretlab chairs and friendly staff.',
        createdAt: new Date(Date.now() - 86400000)
      }
    ]
  },
  {
    shopName: 'Apex Pro Gaming & PS5 Lounge',
    ownerName: 'Rohan Deshmukh',
    phone: '+91 98450 67890',
    city: 'Mumbai',
    address: '2nd Floor, Phoenix Marketcity, LBS Marg, Kurla West, Mumbai, Maharashtra 400070',
    mapUrl: 'https://maps.google.com/?q=Phoenix+Marketcity+Mumbai',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80',
    category: 'Online Gaming',
    gamesOffered: ['PS5', 'FIFA / EA FC', 'Free Fire', 'Call of Duty', 'PC Gaming'],
    pricePerHour: 180,
    totalCapacity: 20,
    courtStatus: 'Empty',
    subscriptionStatus: 'Active',
    subscriptionFee: 999,
    subscriptionPaid: true,
    description: 'Flagship console & PC battleground with 75-inch OLED 120Hz screens, DualSense Edge controllers, and pro team LAN booths.',
    rating: 4.8,
    reviewCount: 1,
    reviews: [
      {
        userName: 'Priya Mehta',
        rating: 5,
        comment: 'Crystal clear 4K OLED screens for FIFA 24. Clean venue and fast booking pass verification.',
        createdAt: new Date(Date.now() - 86400000)
      }
    ]
  },
  {
    shopName: 'Smash & Spike Volleyball & Badminton Complex',
    ownerName: 'Kavita Reddy',
    phone: '+91 91234 56789',
    city: 'Hyderabad',
    address: 'Plot 42, Gachibowli Stadium Road, Near Bio-Diversity Park, Hyderabad, Telangana 500032',
    mapUrl: 'https://maps.google.com/?q=Gachibowli+Stadium+Hyderabad',
    image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1000&q=80',
    category: 'Offline Sports',
    gamesOffered: ['Volleyball', 'Badminton', 'Table Tennis'],
    pricePerHour: 500,
    totalCapacity: 2, // 2 championship maplewood courts
    courtStatus: 'Empty',
    subscriptionStatus: 'Active',
    subscriptionFee: 999,
    subscriptionPaid: true,
    description: 'Olympic maplewood indoor volleyball & BWF-grade synthetic badminton courts with broadcast LED lighting and shower lockers.',
    rating: 4.8,
    reviewCount: 1,
    reviews: [
      {
        userName: 'Sanjay Varma',
        rating: 5,
        comment: 'High ceiling, perfect grip on wooden floor, and excellent lighting with zero glare.',
        createdAt: new Date(Date.now() - 86400000 * 3)
      }
    ]
  },
  {
    shopName: 'BlueWave Olympic Aquatics & Pool',
    ownerName: 'Arunmozhi Varman',
    phone: '+91 99887 76655',
    city: 'Chennai',
    address: '15/2 East Coast Road, Near Palavakkam Beach, Chennai, Tamil Nadu 600041',
    mapUrl: 'https://maps.google.com/?q=Palavakkam+Chennai',
    image: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1000&q=80',
    category: 'Offline Sports',
    gamesOffered: ['Swimming'],
    pricePerHour: 250,
    totalCapacity: 10, // Strict Max 10 swimmers per 1-hour batch
    courtStatus: 'Empty',
    subscriptionStatus: 'Active',
    subscriptionFee: 999,
    subscriptionPaid: true,
    description: 'Temperature-controlled 50m Olympic size indoor pool with 8 lanes, certified lifeguards, and strict 10-swimmer capacity batches.',
    rating: 4.9,
    reviewCount: 1,
    reviews: [
      {
        userName: 'Chennai Swim Club',
        rating: 5,
        comment: 'Strict 10 person limit makes lane swimming so peaceful. Water temperature is always dialed in.',
        createdAt: new Date(Date.now() - 86400000 * 4)
      }
    ]
  },
  {
    shopName: 'Titan Box Cricket, Futsal & Hoops Arena',
    ownerName: 'Sameer Sheikh',
    phone: '+91 97555 66778',
    city: 'Bangalore',
    address: 'Rooftop Sports Park, Outer Ring Road, Bellandur, Bangalore, Karnataka 560103',
    mapUrl: 'https://maps.google.com/?q=Bellandur+Bangalore',
    image: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1000&q=80',
    category: 'Offline Sports',
    gamesOffered: ['Box Cricket', 'Futsal', 'Basketball'],
    pricePerHour: 750,
    totalCapacity: 1,
    courtStatus: 'Empty',
    subscriptionStatus: 'Active',
    subscriptionFee: 999,
    subscriptionPaid: true,
    description: 'FIFA-certified astro-turf cage for box cricket and 5v5 futsal, plus FIBA-spec hardwood basketball shootout court.',
    rating: 4.7,
    reviewCount: 1,
    reviews: [
      {
        userName: 'Rohan Deshmukh',
        rating: 4,
        comment: 'Great netting height for power hitters in box cricket. Floodlights are bright.',
        createdAt: new Date(Date.now() - 86400000 * 2)
      }
    ]
  },
  {
    shopName: 'Velocity Club: Esports, Snooker & Sports Lounge',
    ownerName: 'Tanmay Joshi',
    phone: '+91 97654 32109',
    city: 'Mumbai',
    address: 'Crossover Mall Rooftop, Link Road, Andheri West, Mumbai, Maharashtra 400053',
    mapUrl: 'https://maps.google.com/?q=Andheri+West+Mumbai',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1000&q=80',
    category: 'Both',
    gamesOffered: ['Snooker / Pool', 'PS5', 'PC Gaming', 'FIFA / EA FC', 'Table Tennis'],
    pricePerHour: 200,
    totalCapacity: 16,
    courtStatus: 'Empty',
    subscriptionStatus: 'Active',
    subscriptionFee: 999,
    subscriptionPaid: true,
    description: 'Hybrid entertainment lounge with tournament-grade English snooker tables, PS5 Pro setups, and RTX gaming rigs.',
    rating: 4.8,
    reviewCount: 1,
    reviews: [
      {
        userName: 'Farhan Akhtar',
        rating: 5,
        comment: 'Pristine Strachan cloth on the snooker tables and top-tier cues. Great snack bar.',
        createdAt: new Date(Date.now() - 86400000)
      }
    ]
  }
];

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function seedDatabase() {
  try {
    // 1. Seed Users
    const insertedUsers = [];
    for (const uData of demoUsers) {
      let uDoc = await User.findOne({ email: uData.email });
      if (!uDoc) {
        uDoc = await User.create(uData);
        console.log(`[Seed] Added user: ${uDoc.name} (${uDoc.email})`);
      }
      insertedUsers.push(uDoc);
    }

    // 2. Seed / Upsert Venues
    const insertedVenues = [];
    for (const vData of demoVenues) {
      let doc = await Venue.findOne({ shopName: vData.shopName });
      if (!doc) {
        doc = await Venue.create(vData);
        console.log(`[Seed] Added venue: ${vData.shopName}`);
      } else {
        doc.gamesOffered = vData.gamesOffered;
        doc.subscriptionPaid = true;
        doc.subscriptionStatus = 'Active';
        if (Array.isArray(vData.reviews) && doc.reviews.length === 0) {
          doc.reviews = vData.reviews;
          doc.reviewCount = vData.reviews.length;
        }
        await doc.save();
      }
      insertedVenues.push(doc);
    }
    console.log(`[Seed] ${insertedVenues.length} verified hubs active in MongoDB.`);

    const todayStr = getTodayString();
    const nexusVenue = insertedVenues.find(v => v.shopName.includes('Nexus'));
    const swimmingVenue = insertedVenues.find(v => v.shopName.includes('BlueWave'));
    const amanUser = insertedUsers.find(u => u.email === 'aman@gamehub.demo');
    const priyaUser = insertedUsers.find(u => u.email === 'priya@gamehub.demo');

    // 3. Seed initial bookings if none exist
    const existingBookingsCount = await Booking.countDocuments();
    if (existingBookingsCount === 0) {
      const demoBookings = [];

      if (nexusVenue) {
        demoBookings.push({
          bookingId: '#GH-84920',
          userId: amanUser ? amanUser._id : null,
          venueId: nexusVenue._id,
          venueName: nexusVenue.shopName,
          playerName: 'Aman Sharma',
          phone: '+91 98201 12345',
          date: todayStr,
          timeSlot: '05:00 PM - 06:00 PM',
          category: 'Online Gaming',
          seats: ['A1', 'A2'],
          spotsCount: 2,
          paymentMethod: 'Pay Online',
          paymentStatus: 'Paid Online',
          status: 'Confirmed',
          checkInStatus: 'Checked-In',
          checkInTime: new Date(Date.now() - 3600000).toISOString(),
          snacks: [
            { id: 'snk_1', name: 'Red Bull Energy Drink (250ml)', price: 125, qty: 1 }
          ],
          snacksTotal: 125,
          totalAmount: 425,
          qrCodeData: JSON.stringify({
            ticket: '#GH-84920',
            venue: nexusVenue.shopName,
            player: 'Aman Sharma',
            seats: ['A1', 'A2'],
            date: todayStr,
            slot: '05:00 PM - 06:00 PM',
            status: 'PAID ONLINE'
          })
        });

        demoBookings.push({
          bookingId: '#GH-91024',
          userId: priyaUser ? priyaUser._id : null,
          venueId: nexusVenue._id,
          venueName: nexusVenue.shopName,
          playerName: 'Priya Mehta',
          phone: '+91 98450 67890',
          date: todayStr,
          timeSlot: '05:00 PM - 06:00 PM',
          category: 'Online Gaming',
          seats: ['A3', 'A4', 'B1'],
          spotsCount: 3,
          paymentMethod: 'Pay at Venue',
          paymentStatus: 'Pay at Venue (Pending)',
          status: 'Confirmed',
          checkInStatus: 'Booked',
          snacks: [
            { id: 'snk_3', name: 'Hot Peri-Peri Cheese Maggi', price: 75, qty: 2 }
          ],
          snacksTotal: 150,
          totalAmount: 600,
          qrCodeData: JSON.stringify({
            ticket: '#GH-91024',
            venue: nexusVenue.shopName,
            player: 'Priya Mehta',
            seats: ['A3', 'A4', 'B1'],
            date: todayStr,
            slot: '05:00 PM - 06:00 PM',
            status: 'PAY AT VENUE'
          })
        });
      }

      if (swimmingVenue) {
        demoBookings.push({
          bookingId: '#GH-33418',
          venueId: swimmingVenue._id,
          venueName: swimmingVenue.shopName,
          playerName: 'Chennai Swim Club (Batch of 6)',
          phone: '+91 94441 55667',
          date: todayStr,
          timeSlot: '05:00 PM - 06:00 PM',
          category: 'Offline Sports',
          seats: [],
          spotsCount: 6,
          paymentMethod: 'Pay Online',
          paymentStatus: 'Paid Online',
          status: 'Confirmed',
          checkInStatus: 'Booked',
          snacks: [],
          snacksTotal: 0,
          totalAmount: 1500,
          qrCodeData: JSON.stringify({
            ticket: '#GH-33418',
            venue: swimmingVenue.shopName,
            player: 'Chennai Swim Club',
            spots: 6,
            date: todayStr,
            slot: '05:00 PM - 06:00 PM',
            status: 'PAID ONLINE'
          })
        });
      }

      if (demoBookings.length > 0) {
        await Booking.insertMany(demoBookings);
        console.log(`[Seed] Seeded ${demoBookings.length} initial realistic bookings.`);
      }
    }

    // 4. Seed initial activity logs
    const existingLogsCount = await ActivityLog.countDocuments();
    if (existingLogsCount === 0) {
      const seedLogs = [
        {
          action: 'System Initialized',
          details: 'GameHub platform database initialized with verified hubs and registered demo users.',
          type: 'system',
          timestamp: new Date(Date.now() - 3600000 * 5)
        },
        {
          action: 'New user registered',
          details: 'Aman Sharma created an account with preferred city Bangalore.',
          type: 'user',
          timestamp: new Date(Date.now() - 3600000 * 4.5)
        },
        {
          action: 'Monthly ₹999 subscription paid',
          details: 'Nexus Arena Esports Hub renewed monthly listing pass.',
          type: 'subscription',
          timestamp: new Date(Date.now() - 3600000 * 4)
        },
        {
          action: 'Customer booked Seats A1, A2',
          details: 'Aman Sharma reserved 2 PC stations at Nexus Arena (#GH-84920).',
          type: 'booking',
          timestamp: new Date(Date.now() - 3600000 * 2)
        },
        {
          action: 'Customer booked 6 Swimming Slots',
          details: 'Chennai Swim Club booked 6/10 spots for 05:00 PM batch at BlueWave Aquatics (#GH-33418).',
          type: 'booking',
          timestamp: new Date(Date.now() - 3600000 * 1)
        },
        {
          action: 'Venue review posted',
          details: 'Aman Sharma gave 5★ rating to Nexus Arena Esports Hub.',
          type: 'review',
          timestamp: new Date(Date.now() - 1800000)
        }
      ];
      await ActivityLog.insertMany(seedLogs);
      console.log('[Seed] Initial activity audit log entries recorded.');
    }

  } catch (err) {
    console.error('[Seed] Error seeding database:', err.message);
  }
}

module.exports = { seedDatabase, demoVenues, demoUsers };

if (require.main === module) {
  require('dotenv').config();
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gamehub';
  mongoose.connect(uri)
    .then(async () => {
      console.log('[Seed Runner] Connected to MongoDB:', uri);
      await seedDatabase();
      await mongoose.disconnect();
      console.log('[Seed Runner] Done & disconnected.');
      process.exit(0);
    })
    .catch(err => {
      console.error('[Seed Runner] Connection failed:', err.message);
      process.exit(1);
    });
}
