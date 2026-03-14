const mongoose = require('mongoose');

const avatarSchema = new mongoose.Schema({
  ageRange: {
    type: String
  },
  location: {
    type: String
  },
  income: {
    type: String
  },
  profession: {
    type: String
  },
  interests: [{
    type: String
  }]
}, { _id: false });

const marketResearchSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true
  },
  avatar: {
    type: avatarSchema,
    default: () => ({})
  },
  painPoints: [{
    type: String,
    trim: true
  }],
  desires: [{
    type: String,
    trim: true
  }],
  existingPurchases: [{
    type: String,
    trim: true
  }],
  // Competitors can be a simple text description or structured array
  competitors: {
    type: String,
    default: ''
  },
  visionBoard: {
    fileName: { type: String },
    filePath: { type: String },
    uploadedAt: { type: Date }
  },
  strategySheet: {
    fileName: { type: String },
    filePath: { type: String },
    uploadedAt: { type: Date }
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Calculate completion percentage
marketResearchSchema.methods.calculateCompletion = function() {
  const fields = [
    'avatar.ageRange',
    'avatar.location',
    'avatar.income',
    'avatar.profession',
    'painPoints',
    'desires',
    'existingPurchases',
    'competitors'
  ];

  let completedFields = 0;

  if (this.avatar?.ageRange) completedFields++;
  if (this.avatar?.location) completedFields++;
  if (this.avatar?.income) completedFields++;
  if (this.avatar?.profession) completedFields++;
  if (this.painPoints?.length > 0) completedFields++;
  if (this.desires?.length > 0) completedFields++;
  if (this.existingPurchases?.length > 0) completedFields++;
  if (this.competitors && this.competitors.trim().length > 0) completedFields++;

  return Math.round((completedFields / fields.length) * 100);
};

module.exports = mongoose.model('MarketResearch', marketResearchSchema);