const mongoose = require('mongoose');

const snackItemSchema = new mongoose.Schema({
  id: String,
  name: String,
  price: Number,
  qty: Number
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true
  },
  venueName: {
    type: String,
    required: true
  },
  playerName: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Player phone is required'],
    trim: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: [true, 'Date is required']
  },
  timeSlot: {
    type: String, // e.g. "05:00 PM - 06:00 PM"
    required: [true, 'Time slot is required']
  },
  category: {
    type: String,
    default: 'Online Gaming'
  },
  seats: {
    type: [String],
    default: [] // e.g. ['A1', 'A2']
  },
  spotsCount: {
    type: Number,
    default: 1 // for swimming pool slots or court reservation
  },
  courtStatusAtBooking: {
    type: String,
    default: 'Occupied'
  },
  snacks: {
    type: [snackItemSchema],
    default: []
  },
  snacksTotal: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Pay Online', 'Pay at Venue'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Paid Online', 'Pay at Venue (Pending)', 'Completed'],
    default: 'Paid Online'
  },
  checkInStatus: {
    type: String,
    enum: ['Booked', 'Checked-In'],
    default: 'Booked'
  },
  checkInTime: {
    type: Date
  },
  totalAmount: {
    type: Number,
    required: true
  },
  qrCodeData: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
