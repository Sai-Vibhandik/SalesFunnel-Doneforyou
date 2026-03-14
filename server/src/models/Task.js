const mongoose = require('mongoose');

// Task types for different production workflows
const TASK_TYPES = [
  'content_writing',
  'graphic_design',
  'video_editing',
  'landing_page_design',
  'landing_page_development'
];

// Task statuses for production workflow
const TASK_STATUSES = [
  // Common statuses
  'todo',           // Task created, not started
  'in_progress',    // Assigned user is working on it
  'submitted',      // Work submitted for review
  'approved_by_tester', // Tester approved, awaiting marketer review
  'final_approved', // Fully approved by performance marketer
  'rejected',       // Rejected with notes

  // Landing page specific statuses
  'design_pending',        // Landing page: awaiting design
  'design_submitted',      // Landing page: design submitted for tester review
  'design_approved',       // Landing page: design approved by tester, awaiting dev
  'development_pending',    // Landing page: awaiting development
  'development_submitted',  // Landing page: development submitted for tester review
  'development_approved'   // Landing page: development approved, awaiting marketer
];

// Asset types that can be produced
const ASSET_TYPES = [
  'image_creative',
  'video_creative',
  'carousel_creative',
  'reel',
  'static_ad',
  'landing_page_design',
  'landing_page_page'
];

// Role assignment mapping
const ROLE_ASSIGNMENT = {
  graphic_design: 'graphic_designer',
  video_editing: 'graphic_designer', // Video editors can be graphic designers or a separate role
  landing_page_design: 'ui_ux_designer',
  landing_page_development: 'developer',
  content_writing: 'graphic_designer' // Content writers can be designers or a separate role
};

const taskSchema = new mongoose.Schema({
  // References
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  creativeStrategyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreativeStrategy'
  },
  creativeId: {
    type: mongoose.Schema.Types.ObjectId
  },
  adTypeKey: {
    type: String,
    description: 'Reference to ad type from creative strategy (awareness, consideration, etc.)'
  },

  // Task identification
  taskTitle: {
    type: String,
    required: true
  },
  taskType: {
    type: String,
    enum: TASK_TYPES,
    required: true
  },
  assetType: {
    type: String,
    enum: ASSET_TYPES
  },

  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedRole: {
    type: String,
    enum: ['graphic_designer', 'ui_ux_designer', 'developer', 'tester', 'performance_marketer'],
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Status pipeline
  status: {
    type: String,
    enum: TASK_STATUSES,
    default: 'todo'
  },

  // Task details
  description: { type: String },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // AI-generated content
  aiPrompt: {
    type: String,
    description: 'AI-generated prompt for the task based on strategy context'
  },
  sopReference: {
    type: String,
    description: 'Reference to standard operating procedure document'
  },

  // Strategy context (for designers - complete creative brief)
  strategyContext: {
    // Business context
    businessName: { type: String },
    industry: { type: String },

    // Creative identification
    funnelStage: {
      type: String,
      description: 'Which funnel stage this creative belongs to (awareness, consideration, conversion)'
    },
    creativeType: {
      type: String,
      description: 'Type of creative (image_creative, video_creative, carousel_creative, reel, static_ad)'
    },
    platform: {
      type: String,
      description: 'Target platform for this specific creative (facebook, instagram, etc.)'
    },
    platforms: [{
      type: String,
      description: 'All applicable platforms for reference'
    }],

    // Creative brief content
    hook: { type: String },
    creativeAngle: { type: String },
    messaging: { type: String },
    headline: { type: String },
    cta: { type: String },

    // Target audience
    targetAudience: { type: String },
    painPoints: [{ type: String }],
    desires: [{ type: String }],

    // Offer information
    offer: { type: String },

    // Additional context
    notes: { type: String },
    adTypeKey: { type: String },
    adTypeName: { type: String }
  },

  // Strategy Context Links (for team members)
  contextLink: {
    type: String,
    description: 'Link to the full strategy summary page'
  },
  contextPdfUrl: {
    type: String,
    description: 'URL to downloadable PDF strategy summary'
  },

  // Due date and timing
  dueDate: { type: Date },
  startedAt: { type: Date },
  submittedAt: { type: Date },
  completedAt: { type: Date },

  // Output/assets
  assetUrl: { type: String },
  outputFiles: [{
    name: { type: String },
    path: { type: String },
    publicId: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Content output (for content writing tasks)
  contentOutput: {
    headline: { type: String },
    bodyText: { type: String },
    cta: { type: String },
    script: { type: String },
    notes: { type: String }
  },

  // Submission fields (for designer submission)
  creativeLink: {
    type: String,
    description: 'Link to external creative (Figma, Canva, Google Drive, etc.)'
  },
  reviewNotes: {
    type: String,
    description: 'Notes from designer to reviewer'
  },

  // Landing Page Design submission fields (UI/UX Designer)
  designLink: {
    type: String,
    description: 'Link to design file (Figma, Drive, etc.) for landing page'
  },
  designFile: {
    name: { type: String },
    path: { type: String },
    publicId: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  },
  designNotes: {
    type: String,
    description: 'Notes from UI/UX designer to developer'
  },

  // Landing Page Development submission fields (Developer)
  implementationUrl: {
    type: String,
    description: 'URL to the implemented landing page'
  },
  repoLink: {
    type: String,
    description: 'Link to code repository (optional)'
  },
  devNotes: {
    type: String,
    description: 'Notes from developer to tester'
  },

  // Review workflow
  rejectionNote: { type: String },
  rejectionReason: { type: String },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: { type: Date },
  testerReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  testerReviewedAt: { type: Date },
  marketerApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  marketerApprovedAt: { type: Date },

  // Revision tracking
  revisionCount: {
    type: Number,
    default: 0
  },
  revisionHistory: [{
    status: { type: String },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    note: { type: String }
  }],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedRole: 1, status: 1 });
taskSchema.index({ taskType: 1, status: 1 });

// Static method to get role for task type
taskSchema.statics.getRoleForTaskType = function(taskType) {
  return ROLE_ASSIGNMENT[taskType] || 'graphic_designer';
};

// Static method to get initial status for task type
taskSchema.statics.getInitialStatus = function(taskType) {
  if (taskType === 'landing_page_design') {
    return 'design_pending';
  }
  if (taskType === 'landing_page_development') {
    return 'development_pending';
  }
  return 'todo';
};

// Method to check if task can be submitted
taskSchema.methods.canSubmit = function() {
  const submittableStatuses = ['todo', 'in_progress', 'rejected', 'design_pending', 'development_pending'];
  return submittableStatuses.includes(this.status);
};

// Method to check if task can be approved by tester
taskSchema.methods.canBeApprovedByTester = function() {
  const testerReviewableStatuses = ['submitted', 'design_submitted', 'development_submitted'];
  return testerReviewableStatuses.includes(this.status);
};

// Method to check if task can be approved by marketer
taskSchema.methods.canBeApprovedByMarketer = function() {
  return this.status === 'approved_by_tester' || this.status === 'development_approved';
};

// Method to get next status after approval
taskSchema.methods.getNextStatus = function(currentStatus, action, taskType) {
  // Landing page workflow
  if (taskType === 'landing_page_design') {
    if (currentStatus === 'design_pending' && action === 'submit') return 'design_submitted';
    if (currentStatus === 'design_submitted' && action === 'approve_tester') return 'design_approved';
    if (currentStatus === 'design_submitted' && action === 'reject') return 'design_pending';
  }

  if (taskType === 'landing_page_development') {
    if (currentStatus === 'development_pending' && action === 'submit') return 'development_submitted';
    if (currentStatus === 'development_submitted' && action === 'approve_tester') return 'development_approved';
    if (currentStatus === 'development_submitted' && action === 'reject') return 'development_pending';
  }

  // Standard creative workflow
  if (currentStatus === 'todo' && action === 'start') return 'in_progress';
  if (currentStatus === 'in_progress' && action === 'submit') return 'submitted';
  if (currentStatus === 'submitted' && action === 'approve_tester') return 'approved_by_tester';
  if (currentStatus === 'submitted' && action === 'reject') return 'rejected';
  if (currentStatus === 'approved_by_tester' && action === 'approve_marketer') return 'final_approved';
  if (currentStatus === 'approved_by_tester' && action === 'reject') return 'rejected';
  if (currentStatus === 'rejected' && action === 'resubmit') return 'submitted';

  return currentStatus;
};

// Add revision to history
taskSchema.methods.addRevision = function(userId, note, oldStatus, newStatus) {
  this.revisionHistory.push({
    status: newStatus,
    changedBy: userId,
    changedAt: new Date(),
    note: note
  });
  this.revisionCount = this.revisionHistory.length;
  return this;
};

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
module.exports.TASK_TYPES = TASK_TYPES;
module.exports.TASK_STATUSES = TASK_STATUSES;
module.exports.ASSET_TYPES = ASSET_TYPES;
module.exports.ROLE_ASSIGNMENT = ROLE_ASSIGNMENT;