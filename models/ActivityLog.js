const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },
  details: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['user', 'venue', 'booking', 'court_status', 'subscription', 'review', 'system'],
    default: 'system'
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
