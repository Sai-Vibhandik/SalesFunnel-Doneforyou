const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const CreativeStrategy = require('../models/Creative');
const { generateTasksFromStrategy } = require('../services/taskGenerationService');

// Helper to check project access
const checkProjectAccess = async (projectId, user) => {
  const project = await Project.findById(projectId)
    .populate('assignedTeam.performanceMarketer', '_id name')
    .populate('assignedTeam.uiUxDesigner', '_id name')
    .populate('assignedTeam.graphicDesigner', '_id name')
    .populate('assignedTeam.developer', '_id name')
    .populate('assignedTeam.tester', '_id name');

  if (!project) {
    return { project: null, error: { status: 404, message: 'Project not found' } };
  }

  const userId = user._id.toString();
  const isAdmin = user.role === 'admin';
  const isCreator = project.createdBy?.toString() === userId;
  const isAssigned = Object.values(project.assignedTeam || {}).some(
    member => member?._id?.toString() === userId
  );

  if (!isAdmin && !isCreator && !isAssigned) {
    return { project: null, error: { status: 403, message: 'Not authorized to access this project' } };
  }

  return { project, error: null };
};

// @desc    Get all tasks for a project
// @route   GET /api/tasks/project/:projectId
// @access  Private
exports.getProjectTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, taskType, assignedTo, assignedRole } = req.query;

    const { project, error } = await checkProjectAccess(projectId, req.user);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    const query = { projectId };
    if (status) query.status = status;
    if (taskType) query.taskType = taskType;
    if (assignedTo) query.assignedTo = assignedTo;
    if (assignedRole) query.assignedRole = assignedRole;

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('testerReviewedBy', 'name email')
      .populate('marketerApprovedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks assigned to current user
// @route   GET /api/tasks/my-tasks
// @access  Private
exports.getMyTasks = async (req, res, next) => {
  try {
    const { status, taskType, projectId } = req.query;

    const query = { assignedTo: req.user._id };
    if (status) query.status = status;
    if (taskType) query.taskType = taskType;
    if (projectId) query.projectId = projectId;

    const tasks = await Task.find(query)
      .populate('projectId', 'projectName businessName industry')
      .populate('assignedBy', 'name email')
      .sort({ priority: -1, dueDate: 1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single task
// @route   GET /api/tasks/:taskId
// @access  Private
exports.getTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate('projectId', 'projectName businessName industry')
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('testerReviewedBy', 'name email')
      .populate('marketerApprovedBy', 'name email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check access
    const { error } = await checkProjectAccess(task.projectId._id, req.user);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new task (manual)
// @route   POST /api/tasks
// @access  Private (Admin or Performance Marketer)
exports.createTask = async (req, res, next) => {
  try {
    const {
      projectId,
      taskType,
      assetType,
      taskTitle,
      assignedTo,
      assignedRole,
      description,
      priority,
      dueDate,
      aiPrompt,
      strategyContext
    } = req.body;

    const { project, error } = await checkProjectAccess(projectId, req.user);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    // Only admin or performance marketer can create tasks
    if (req.user.role !== 'admin' && req.user.role !== 'performance_marketer') {
      return res.status(403).json({
        success: false,
        message: 'Only admins or performance marketers can create tasks'
      });
    }

    // Determine assigned role if not provided
    const role = assignedRole || Task.getRoleForTaskType(taskType);

    const task = await Task.create({
      projectId,
      taskType,
      assetType,
      taskTitle,
      assignedTo: assignedTo || null,
      assignedRole: role,
      assignedBy: req.user._id,
      createdBy: req.user._id,
      description,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      aiPrompt,
      strategyContext,
      status: Task.getInitialStatus(taskType)
    });

    // Notify assigned user if any
    if (assignedTo) {
      const projectDisplay = project.projectName || project.businessName;
      await Notification.create({
        recipient: assignedTo,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned a new task: "${taskTitle}" for project "${projectDisplay}"`,
        projectId
      });
    }

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task (start, submit, upload files)
// @route   PUT /api/tasks/:taskId
// @access  Private (Assigned user only)
exports.updateTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const {
      status, assetUrl, outputFiles, contentOutput, notes,
      // Creative task fields
      creativeLink, reviewNotes,
      // Landing page design fields
      designLink, designFile, designNotes,
      // Landing page development fields
      implementationUrl, repoLink, devNotes
    } = req.body;

    const task = await Task.findById(taskId).populate('projectId', '_id projectName businessName');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user is assigned to this task or is admin
    const isAssigned = task.assignedTo?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAssigned && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned user or admin can update this task'
      });
    }

    const oldStatus = task.status;

    // Update fields
    if (status) {
      // Validate status transitions
      const validTransitions = getValidTransitions(task.status, task.taskType);
      if (!validTransitions.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot transition from ${task.status} to ${status}. Valid transitions: ${validTransitions.join(', ')}`
        });
      }
      task.status = status;

      // Update timestamps
      if (status === 'in_progress' && !task.startedAt) {
        task.startedAt = new Date();
      }
      if (['submitted', 'design_submitted', 'development_submitted'].includes(status)) {
        task.submittedAt = new Date();
      }
      if (status === 'final_approved') {
        task.completedAt = new Date();
      }

      task.addRevision(req.user._id, notes || '', oldStatus, status);
    }

    if (assetUrl) task.assetUrl = assetUrl;
    if (outputFiles && outputFiles.length > 0) {
      task.outputFiles = [...task.outputFiles, ...outputFiles.map(f => ({
        name: f.name,
        path: f.path,
        publicId: f.publicId,
        uploadedAt: new Date()
      }))];
    }
    if (contentOutput) {
      task.contentOutput = { ...task.contentOutput, ...contentOutput };
    }

    // Handle designer submission fields
    if (creativeLink !== undefined) {
      task.creativeLink = creativeLink;
    }
    if (reviewNotes !== undefined) {
      task.reviewNotes = reviewNotes;
    }

    // Handle landing page design submission fields
    if (designLink !== undefined) {
      task.designLink = designLink;
    }
    if (designFile !== undefined) {
      task.designFile = designFile;
    }
    if (designNotes !== undefined) {
      task.designNotes = designNotes;
    }

    // Handle landing page development submission fields
    if (implementationUrl !== undefined) {
      task.implementationUrl = implementationUrl;
    }
    if (repoLink !== undefined) {
      task.repoLink = repoLink;
    }
    if (devNotes !== undefined) {
      task.devNotes = devNotes;
    }

    await task.save();

    // Notify tester when task is submitted
    if (['submitted', 'design_submitted', 'development_submitted'].includes(status)) {
      await notifyTesterForReview(task);
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Tester review - approve or reject
// @route   PUT /api/tasks/:taskId/tester-review
// @access  Private (Tester only)
exports.testerReview = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { approved, rejectionNote, rejectionReason } = req.body;

    // Verify user is a tester or admin
    if (req.user.role !== 'tester' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only testers or admins can perform this action'
      });
    }

    const task = await Task.findById(taskId)
      .populate('projectId', 'projectName businessName')
      .populate('assignedTo', 'name email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if task can be reviewed by tester
    if (!task.canBeApprovedByTester()) {
      return res.status(400).json({
        success: false,
        message: 'This task cannot be reviewed by tester in its current status'
      });
    }

    let newStatus;
    let notificationType;
    let notificationMessage;

    if (approved) {
      // Determine next status based on task type
      if (task.taskType === 'landing_page_design') {
        newStatus = 'design_approved';
        // For landing page design, assign to developer for implementation
        task.assignedRole = 'developer';
        notificationMessage = `Your landing page design for "${task.projectId.projectName || task.projectId.businessName}" has been approved by the tester.`;
      } else if (task.taskType === 'landing_page_development') {
        newStatus = 'development_approved';
        // For landing page development, assign to performance_marketer for final review
        task.assignedRole = 'performance_marketer';
        notificationMessage = `Your landing page development for "${task.projectId.projectName || task.projectId.businessName}" has been approved by the tester and is now ready for marketer review.`;
      } else {
        newStatus = 'approved_by_tester';
        // For other tasks, assign to performance_marketer
        task.assignedRole = 'performance_marketer';
        notificationMessage = `Your task "${task.taskTitle}" has been approved by the tester and is now awaiting marketer review.`;
      }
      notificationType = 'task_approved_by_tester';
    } else {
      newStatus = task.taskType === 'landing_page_design' ? 'design_pending' :
                   task.taskType === 'landing_page_development' ? 'development_pending' :
                   'rejected';
      notificationType = 'task_rejected';
      notificationMessage = `Your task "${task.taskTitle}" has been rejected. Please review the feedback and resubmit.`;

      // Reset assignedRole back to the original role for the task type
      task.assignedRole = Task.getRoleForTaskType(task.taskType);
    }

    task.status = newStatus;
    task.testerReviewedBy = req.user._id;
    task.testerReviewedAt = new Date();

    if (!approved) {
      task.rejectionNote = rejectionNote;
      task.rejectionReason = rejectionReason;
    }

    task.addRevision(req.user._id, approved ? 'Approved by tester' : `Rejected: ${rejectionNote}`, task.status, newStatus);

    await task.save();

    // Notify assigned user
    if (task.assignedTo) {
      await Notification.create({
        recipient: task.assignedTo._id,
        type: notificationType,
        title: approved ? 'Task Approved by Tester' : 'Task Rejected',
        message: notificationMessage,
        projectId: task.projectId._id
      });
    }

    // If landing page design is approved, find/copy to development task and notify developer
    if (approved && task.taskType === 'landing_page_design') {
      const project = await Project.findById(task.projectId._id)
        .populate('assignedTeam.developer', '_id name');

      // Find the landing_page_development task for this project
      let developmentTask = await Task.findOne({
        projectId: task.projectId._id,
        taskType: 'landing_page_development'
      });

      if (developmentTask) {
        // Copy design fields to development task so developer can see the design reference
        developmentTask.designLink = task.designLink;
        developmentTask.designFile = task.designFile;
        developmentTask.designNotes = task.designNotes;
        await developmentTask.save();
        console.log(`Copied design reference to development task ${developmentTask._id}:`, {
          designLink: task.designLink,
          hasDesignFile: !!task.designFile
        });
      } else {
        console.warn(`No development task found for project ${task.projectId._id} when approving design`);
      }

      if (project.assignedTeam.developer) {
        await Notification.create({
          recipient: project.assignedTeam.developer._id,
          type: 'task_assigned',
          title: 'Landing Page Ready for Development',
          message: `The landing page design for "${project.projectName || project.businessName}" is approved and ready for development.`,
          projectId: task.projectId._id
        });
      }
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Performance Marketer review - approve or reject
// @route   PUT /api/tasks/:taskId/marketer-review
// @access  Private (Performance Marketer or Admin)
exports.marketerReview = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { approved, rejectionNote, rejectionReason } = req.body;

    // Verify user is a performance marketer or admin
    if (req.user.role !== 'performance_marketer' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only performance marketers or admins can perform this action'
      });
    }

    const task = await Task.findById(taskId)
      .populate('projectId', 'projectName businessName')
      .populate('assignedTo', 'name email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if task can be reviewed by marketer
    if (!task.canBeApprovedByMarketer()) {
      return res.status(400).json({
        success: false,
        message: 'This task must be approved by tester first before marketer review'
      });
    }

    let newStatus;
    let notificationType;
    let notificationMessage;

    if (approved) {
      newStatus = 'final_approved';
      notificationType = 'task_approved_by_marketer';
      notificationMessage = `Your task "${task.taskTitle}" has been fully approved and is ready for deployment.`;
    } else {
      newStatus = 'rejected';
      notificationType = 'task_rejected';
      notificationMessage = `Your task "${task.taskTitle}" has been rejected by the performance marketer. Please review the feedback and resubmit.`;

      // Reset assignedRole back to the original role for the task type
      task.assignedRole = Task.getRoleForTaskType(task.taskType);
    }

    task.status = newStatus;
    task.marketerApprovedBy = approved ? req.user._id : null;
    task.marketerApprovedAt = approved ? new Date() : null;

    if (!approved) {
      task.rejectionNote = rejectionNote;
      task.rejectionReason = rejectionReason;
    }

    task.addRevision(req.user._id, approved ? 'Approved by marketer' : `Rejected: ${rejectionNote}`, task.status, newStatus);

    await task.save();

    // Notify assigned user
    if (task.assignedTo) {
      await Notification.create({
        recipient: task.assignedTo._id,
        type: notificationType,
        title: approved ? 'Task Fully Approved' : 'Task Rejected',
        message: notificationMessage,
        projectId: task.projectId._id
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign task to a user
// @route   PUT /api/tasks/:taskId/assign
// @access  Private (Admin or Performance Marketer)
exports.assignTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { assignedTo, assignedRole } = req.body;

    // Only admin or performance marketer can assign tasks
    if (req.user.role !== 'admin' && req.user.role !== 'performance_marketer') {
      return res.status(403).json({
        success: false,
        message: 'Only admins or performance marketers can assign tasks'
      });
    }

    const task = await Task.findById(taskId).populate('projectId', '_id projectName businessName');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const oldAssignee = task.assignedTo;
    task.assignedTo = assignedTo || null;
    if (assignedRole) task.assignedRole = assignedRole;
    task.addRevision(req.user._id, 'Task reassigned', task.status, task.status);

    await task.save();

    // Notify new assignee
    if (assignedTo) {
      const projectDisplay = task.projectId.projectName || task.projectId.businessName;
      await Notification.create({
        recipient: assignedTo,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned to task: "${task.taskTitle}" for project "${projectDisplay}"`,
        projectId: task.projectId._id
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload files to task
// @route   POST /api/tasks/:taskId/files
// @access  Private (Assigned user only)
exports.uploadFiles = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user is assigned to this task
    if (task.assignedTo?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned user can upload files'
      });
    }

    // Process uploaded files
    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map(file => ({
        name: file.originalname,
        path: file.path,
        publicId: file.filename || file.publicId,
        uploadedAt: new Date()
      }));

      task.outputFiles = [...task.outputFiles, ...newFiles];
      await task.save();
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks pending review (for testers)
// @route   GET /api/tasks/pending-review
// @access  Private (Tester or Admin)
exports.getPendingReviewTasks = async (req, res, next) => {
  try {
    // Only testers and admins can access
    if (req.user.role !== 'tester' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only testers or admins can view pending reviews'
      });
    }

    const pendingStatuses = ['submitted', 'design_submitted', 'development_submitted'];

    const tasks = await Task.find({
      status: { $in: pendingStatuses }
    })
      .populate('projectId', 'projectName businessName industry')
      .populate('assignedTo', 'name email role')
      .sort({ submittedAt: 1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks pending marketer approval
// @route   GET /api/tasks/pending-marketer-approval
// @access  Private (Performance Marketer or Admin)
exports.getPendingMarketerApproval = async (req, res, next) => {
  try {
    // Only performance marketers and admins can access
    if (req.user.role !== 'performance_marketer' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only performance marketers or admins can view pending approvals'
      });
    }

    // Get projects where user is assigned as performance marketer
    const projects = await Project.find({
      'assignedTeam.performanceMarketer': req.user._id
    }).select('_id');

    const projectIds = projects.map(p => p._id);

    const pendingStatuses = ['approved_by_tester', 'development_approved'];

    const tasks = await Task.find({
      projectId: { $in: projectIds },
      status: { $in: pendingStatuses }
    })
      .populate('projectId', 'projectName businessName industry')
      .populate('assignedTo', 'name email role')
      .populate('testerReviewedBy', 'name email')
      .sort({ testerReviewedAt: 1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate tasks for a project (trigger manually)
// @route   POST /api/tasks/generate/:projectId
// @access  Private (Admin only)
exports.generateTasks = async (req, res, next) => {
  try {
    // Only admin can trigger manual task generation
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can manually generate tasks'
      });
    }

    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if creative strategy is completed
    if (!project.stages.creativeStrategy.isCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Creative strategy must be completed before generating tasks'
      });
    }

    // Get creative strategy
    const creativeStrategy = await CreativeStrategy.findOne({ projectId });

    if (!creativeStrategy) {
      return res.status(404).json({
        success: false,
        message: 'Creative strategy not found'
      });
    }

    // Generate tasks
    const tasks = await generateTasksFromStrategy(projectId, creativeStrategy, req.user._id);

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
      message: `Successfully generated ${tasks.length} tasks for the project`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tasks (for PM/admin)
// @route   GET /api/tasks
// @access  Private (admin, performance_marketer)
exports.getAllTasks = async (req, res, next) => {
  try {
    const { status, taskType, projectId } = req.query;

    const query = {};
    if (status) query.status = status;
    if (taskType) query.taskType = taskType;
    if (projectId) query.projectId = projectId;

    const tasks = await Task.find(query)
      .populate('projectId', 'projectName businessName industry')
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task content output
// @route   PUT /api/tasks/:taskId/content
// @access  Private (assigned user)
exports.updateTaskContent = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { headline, bodyText, cta, script, notes } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Verify ownership
    if (task.assignedTo?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }

    // Update content output
    task.contentOutput = {
      headline: headline || task.contentOutput?.headline,
      bodyText: bodyText || task.contentOutput?.bodyText,
      cta: cta || task.contentOutput?.cta,
      script: script || task.contentOutput?.script,
      notes: notes || task.contentOutput?.notes
    };

    await task.save();

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available team members for assignment
// @route   GET /api/tasks/team-members
// @access  Private
exports.getTeamMembers = async (req, res, next) => {
  try {
    const { role } = req.query;

    const query = { isActive: true };
    if (role) query.role = role;

    const users = await User.find(query)
      .select('name email role specialization availability');

    // Group by role
    const grouped = {
      graphicDesigners: users.filter(u => u.role === 'graphic_designer'),
      uiUxDesigners: users.filter(u => u.role === 'ui_ux_designer'),
      developers: users.filter(u => u.role === 'developer'),
      testers: users.filter(u => u.role === 'tester'),
      performanceMarketers: users.filter(u => u.role === 'performance_marketer')
    };

    res.status(200).json({
      success: true,
      data: grouped
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to get valid status transitions
function getValidTransitions(currentStatus, taskType) {
  const transitions = {
    // Standard creative workflow
    todo: ['in_progress'],
    in_progress: ['submitted'],
    submitted: ['approved_by_tester', 'rejected'],
    approved_by_tester: ['final_approved', 'rejected'],
    rejected: ['in_progress', 'submitted'],
    final_approved: [],

    // Landing page workflow
    design_pending: ['design_submitted'],
    design_submitted: ['design_approved', 'design_pending'],
    design_approved: [],
    development_pending: ['development_submitted'],
    development_submitted: ['development_approved', 'development_pending'],
    development_approved: ['final_approved', 'rejected']
  };

  return transitions[currentStatus] || [];
}

// Helper function to notify tester for review
async function notifyTesterForReview(task) {
  const project = await Project.findById(task.projectId)
    .populate('assignedTeam.tester', '_id name');

  if (project.assignedTeam.tester) {
    await Notification.create({
      recipient: project.assignedTeam.tester._id,
      type: 'task_submitted',
      title: 'Task Ready for Review',
      message: `A task "${task.taskTitle}" has been submitted and is ready for your review.`,
      projectId: task.projectId
    });
  }
}