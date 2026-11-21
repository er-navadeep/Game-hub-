const mongoose = require('mongoose');

const squadBeaconSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  venueId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  venueName: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Online Gaming', 'Offline Sports'],
    required: true
  },
  game: {
    type: String,
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  timeSlot: {
    type: String,
    required: true
  },
  spotsTotal: {
    type: Number,
    required: true,
    default: 5
  },
  spotsNeeded: {
    type: Number,
    required: true,
    default: 2
  },
  hostName: {
    type: String,
    required: true
  },
  hostPhone: {
    type: String,
    required: true
  },
  skillLevel: {
    type: String,
    default: 'All Skill Levels Welcome'
  },
  description: {
    type: String,
    default: ''
  },
  members: [
    {
      name: String,
      phone: String,
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  status: {
    type: String,
    enum: ['Open', 'Full', 'Completed'],
    default: 'Open'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.SquadBeacon || mongoose.model('SquadBeacon', squadBeaconSchema);
