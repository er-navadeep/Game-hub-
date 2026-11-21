const mongoose = require('mongoose');
const Venue = require('./models/Venue');
const Booking = require('./models/Booking');
const ActivityLog = require('./models/ActivityLog');

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
    gamesOffered: ['Valorant', 'PUBG PC', 'Free Fire MAX', 'PS5 Pro (FIFA 24)', 'Counter-Strike 2', 'Dota 2'],
    pricePerHour: 150,
    totalCapacity: 24, // 24 gaming stations (Seats A1-A12, B1-B12)
    courtStatus: 'Empty',
    subscriptionStatus: 'Active',
    subscriptionFee: 999,
    description: 'Premier RGB gaming lounge with RTX 4090 rigs, 360Hz monitors, secretlab chairs, and fiber-optic low-ping lines.',
    rating: 4.9
  },
  {
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
    totalCapacity: 2, // 2 dedicated championship wooden courts
    courtStatus: 'Empty',
    subscriptionStatus: 'Active',
    subscriptionFee: 999,
    description: 'Olympic maplewood indoor volleyball courts with professional net systems, LED broadcast lighting, and locker facilities.',
    rating: 4.8
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
    gamesOffered: ['Swimming', 'Lap Swimming', 'Water Polo', 'Aqua Aerobics'],
    pricePerHour: 250,
    totalCapacity: 10, // Max 10 swimmers per 1-hour batch
    courtStatus: 'Empty',
    subscriptionStatus: 'Active',
    subscriptionFee: 999,
    description: 'Temperature-controlled 50m Olympic size indoor pool with 8 lanes, certified lifeguards, and strict 10-swimmer capacity batches.',
    rating: 4.9
  },
  {
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
    rating: 4.7
  }
];

// Helper to get formatted today date YYYY-MM-DD
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function seedDatabase() {
  try {
    const existingCount = await Venue.countDocuments();
    if (existingCount > 0) {
      console.log(`[Seed] Database already contains ${existingCount} venues. Skipping auto-seed.`);
      return;
    }

    console.log('[Seed] Seeding 4 realistic demo venues into MongoDB...');
    const insertedVenues = await Venue.insertMany(demoVenues);
    console.log(`[Seed] Successfully inserted ${insertedVenues.length} demo venues.`);

    const todayStr = getTodayString();
    const nexusVenue = insertedVenues.find(v => v.shopName.includes('Nexus'));
    const swimmingVenue = insertedVenues.find(v => v.shopName.includes('BlueWave'));
    const volleyballVenue = insertedVenues.find(v => v.shopName.includes('Volleyball'));

    const demoBookings = [];

    if (nexusVenue) {
      demoBookings.push({
        bookingId: '#GH-84920',
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
        totalAmount: 300,
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
        totalAmount: 450,
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
      // 6 spots booked in swimming pool for 5:00 PM - 6:00 PM batch (exact requirement: "6/10 slots filled for the 5:00 PM - 6:00 PM batch (4 spots left)")
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

    // Seed activity logs
    const seedLogs = [
      {
        action: 'System Initialized',
        details: 'GameHub platform database initialized with 4 verified demo hubs.',
        type: 'system',
        timestamp: new Date(Date.now() - 3600000 * 5)
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
        action: 'Court Status Verified',
        details: 'Owner confirmed Volleyball Court 1 & 2 are Empty and ready for customer matches.',
        type: 'court_status',
        timestamp: new Date()
      }
    ];
    await ActivityLog.insertMany(seedLogs);
    console.log('[Seed] Initial activity audit log entries recorded.');

  } catch (err) {
    console.error('[Seed] Error seeding database:', err.message);
  }
}

module.exports = seedDatabase;

// Standalone execution support
if (require.main === module) {
  require('dotenv').config();
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gamehub';
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
