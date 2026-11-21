const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema({
  shopName: {
    type: String,
    required: [true, 'Shop name is required'],
    trim: true
  },
  ownerName: {
    type: String,
    required: [true, 'Owner name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Contact phone number is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Full address is required'],
    trim: true
  },
  mapUrl: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80'
  },
  category: {
    type: String,
    enum: ['Online Gaming', 'Offline Sports', 'Both'],
    required: [true, 'Category is required']
  },
  gamesOffered: {
    type: [String],
    default: []
  },
  pricePerHour: {
    type: Number,
    required: true,
    default: 150
  },
  totalCapacity: {
    type: Number,
    required: true,
    default: 20 // Represents seats for gaming cafes or hourly capacity limit for sports
  },
  courtStatus: {
    type: String,
    enum: ['Empty', 'Occupied'],
    default: 'Empty'
  },
  subscriptionStatus: {
    type: String,
    enum: ['Active', 'Pending'],
    default: 'Active'
  },
  subscriptionFee: {
    type: Number,
    default: 999
  },
  subscriptionPaidAt: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    default: 4.8
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Venue || mongoose.model('Venue', venueSchema);
