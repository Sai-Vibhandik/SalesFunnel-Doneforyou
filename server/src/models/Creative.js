const mongoose = require('mongoose');

// Creative details for each ad type
const adCreativeDetailsSchema = new mongoose.Schema({
  // Number of creatives
  imageCreatives: {
    type: Number,
    default: 0,
    min: 0
  },
  videoCreatives: {
    type: Number,
    default: 0,
    min: 0
  },
  carouselCreatives: {
    type: Number,
    default: 0,
    min: 0
  },
  // Messaging and content
  messagingAngle: {
    type: String,
    trim: true
  },
  hook: {
    type: String,
    trim: true
  },
  headline: {
    type: String,
    trim: true
  },
  cta: {
    type: String,
    trim: true
  },
  // Platform selection
  platforms: [{
    type: String,
    enum: ['facebook', 'instagram', 'youtube', 'google', 'linkedin', 'tiktok', 'twitter', 'whatsapp']
  }],
  // Additional notes for this ad type
  notes: {
    type: String,
    trim: true
  }
}, { _id: false });

// Ad Type schema - supports both predefined and custom types
const adTypeSchema = new mongoose.Schema({
  // Type identifier (e.g., 'awareness', 'consideration', 'conversion', 'influencer_ads', etc.)
  typeKey: {
    type: String,
    required: true
  },
  // Display name
  typeName: {
    type: String,
    required: true
  },
  // Whether this is a predefined type or custom
  isCustom: {
    type: Boolean,
    default: false
  },
  // Icon name for UI display
  icon: {
    type: String,
    default: 'Megaphone'
  },
  // Creative details for this ad type
  creatives: adCreativeDetailsSchema,
  // Order for display purposes
  order: {
    type: Number,
    default: 0
  }
}, { _id: false });

// Individual creative item (for task workflow)
const creativeItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  creativeType: {
    type: String,
    enum: ['static_creative', 'video_creative', 'video_content', 'carousel'],
    required: true
  },
  platform: {
    type: String,
    enum: ['facebook', 'instagram', 'youtube', 'linkedin', 'tiktok', 'twitter', 'google', 'whatsapp'],
    required: true
  },
  dimensions: {
    width: { type: Number },
    height: { type: Number }
  },
  copy: {
    headline: { type: String },
    bodyText: { type: String },
    cta: { type: String }
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'review', 'approved', 'rejected'],
    default: 'pending'
  },
  assignedContentWriter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedDesigner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  contentStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'rejected'],
    default: 'pending'
  },
  designStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'rejected'],
    default: 'pending'
  },
  contentOutput: {
    headline: { type: String },
    bodyText: { type: String },
    cta: { type: String },
    script: { type: String },
    notes: { type: String }
  },
  contentAssignedAt: { type: Date },
  contentCompletedAt: { type: Date },
  designAssignedAt: { type: Date },
  designCompletedAt: { type: Date },
  dueDate: { type: Date },
  notes: { type: String },
  files: [{
    name: { type: String },
    path: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Legacy stage creative schema (for backward compatibility)
const stageCreativeSchema = new mongoose.Schema({
  stage: {
    type: String,
    enum: ['awareness', 'consideration', 'conversion'],
    required: true
  },
  creatives: [creativeItemSchema],
  totalCreatives: {
    type: Number,
    default: 0
  }
}, { _id: false });

const creativeStrategySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true
  },
  // New flexible ad types system
  adTypes: [adTypeSchema],
  // Additional notes from performance marketer
  additionalNotes: {
    type: String,
    trim: true
  },
  // Legacy stages (for backward compatibility)
  stages: [stageCreativeSchema],
  totalCreatives: {
    type: Number,
    default: 0
  },
  creativeBrief: {
    type: String,
    trim: true
  },
  brandGuidelines: {
    logo: { type: String },
    colors: [{ type: String }],
    fonts: [{ type: String }],
    toneOfVoice: { type: String }
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

// Calculate total creatives
creativeStrategySchema.methods.calculateTotal = function() {
  let total = 0;

  // From new adTypes system
  if (this.adTypes && this.adTypes.length > 0) {
    this.adTypes.forEach(adType => {
      if (adType.creatives) {
        total += (adType.creatives.imageCreatives || 0) +
                 (adType.creatives.videoCreatives || 0) +
                 (adType.creatives.carouselCreatives || 0);
      }
    });
  }

  // From legacy stages system
  if (this.stages && this.stages.length > 0) {
    this.stages.forEach(stage => {
      stage.totalCreatives = stage.creatives?.length || 0;
      total += stage.totalCreatives;
    });
  }

  this.totalCreatives = total;
  return total;
};

// Calculate completion percentage
creativeStrategySchema.methods.calculateCompletion = function() {
  let completedItems = 0;
  const totalItems = 3;

  // Check if at least one ad type exists
  if (this.adTypes && this.adTypes.length > 0) {
    completedItems++;
  } else if (this.stages && this.stages.some(s => s.creatives && s.creatives.length > 0)) {
    completedItems++;
  }

  // Check if creative brief or additional notes exist
  if (this.creativeBrief || this.additionalNotes) completedItems++;

  // Check if at least one creative has configuration
  const hasConfiguration = (this.adTypes && this.adTypes.some(at =>
    at.creatives && (
      (at.creatives.imageCreatives > 0) ||
      (at.creatives.videoCreatives > 0) ||
      (at.creatives.carouselCreatives > 0)
    )
  )) || (this.stages && this.stages.some(s => s.creatives && s.creatives.some(c => c.assignedDesigner)));

  if (hasConfiguration) completedItems++;

  return Math.round((completedItems / totalItems) * 100);
};

module.exports = mongoose.model('CreativeStrategy', creativeStrategySchema);