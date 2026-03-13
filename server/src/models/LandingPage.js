const mongoose = require('mongoose');

const nurturingSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['email', 'whatsapp', 'sms'],
    default: 'email'
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'bi-weekly', 'monthly'],
    default: 'weekly'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const leadCaptureSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['form', 'calendly', 'whatsapp', 'free_audit'],
    default: 'form'
  },
  fields: [{
    type: String,
    enum: ['name', 'email', 'phone', 'company', 'message']
  }],
  calendlyLink: {
    type: String
  },
  whatsappNumber: {
    type: String
  }
}, { _id: false });

const landingPageSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['video_sales_letter', 'long_form', 'lead_magnet', 'ebook', 'webinar'],
    default: 'video_sales_letter'
  },
  leadCapture: {
    type: leadCaptureSchema,
    default: () => ({})
  },
  nurturing: [nurturingSchema],
  headline: {
    type: String,
    trim: true
  },
  subheadline: {
    type: String,
    trim: true
  },
  ctaText: {
    type: String,
    trim: true
  },
  designPreferences: {
    primaryColor: { type: String, default: '#3B82F6' },
    secondaryColor: { type: String, default: '#1E40AF' },
    fontFamily: { type: String, default: 'Inter' },
    style: { type: String, enum: ['modern', 'classic', 'minimal', 'bold'] }
  },
  seoSettings: {
    metaTitle: { type: String },
    metaDescription: { type: String },
    keywords: [{ type: String }]
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
landingPageSchema.methods.calculateCompletion = function() {
  let completedItems = 0;
  const totalItems = 5;

  if (this.type) completedItems++;
  if (this.leadCapture?.method) completedItems++;
  if (this.nurturing?.length > 0) completedItems++;
  if (this.headline) completedItems++;
  if (this.ctaText) completedItems++;

  return Math.round((completedItems / totalItems) * 100);
};

module.exports = mongoose.model('LandingPage', landingPageSchema);