import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Card, CardBody, CardHeader, Button, Spinner, Badge } from '@/components/ui';
import { taskService } from '@/services/api';
import {
  ArrowLeft, Image, Video, FileText, Layout, Code,
  ExternalLink, Download, FileIcon, Link, CheckCircle,
  XCircle, Clock, Play, AlertCircle, Palette, Film
} from 'lucide-react';

const TASK_TYPE_CONFIG = {
  graphic_design: { label: 'Graphic Design', icon: Palette, color: 'bg-pink-100 text-pink-800' },
  video_editing: { label: 'Video Editing', icon: Film, color: 'bg-indigo-100 text-indigo-800' },
  content_creation: { label: 'Content Creation', icon: FileText, color: 'bg-blue-100 text-blue-800' },
  landing_page_design: { label: 'Landing Page Design', icon: Layout, color: 'bg-purple-100 text-purple-800' },
  landing_page_development: { label: 'Landing Page Development', icon: Code, color: 'bg-green-100 text-green-800' },
};

const STATUS_CONFIG = {
  // Pending statuses
  todo: { label: 'To Do', color: 'bg-gray-100 text-gray-800', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: Play },
  content_pending: { label: 'Content Pending', color: 'bg-orange-100 text-orange-800', icon: Clock },
  design_pending: { label: 'Design Pending', color: 'bg-orange-100 text-orange-800', icon: Clock },
  development_pending: { label: 'Dev Pending', color: 'bg-orange-100 text-orange-800', icon: Clock },
  // Submitted for review
  submitted: { label: 'Submitted', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  content_submitted: { label: 'Content Review', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  design_submitted: { label: 'Design Review', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  development_submitted: { label: 'Dev Review', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  // Approved by tester
  approved_by_tester: { label: 'Awaiting Approval', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  content_approved: { label: 'Awaiting Approval', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  design_approved: { label: 'Awaiting Approval', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  development_approved: { label: 'Awaiting Approval', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  // Final approved
  final_approved: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  content_final_approved: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  // Rejected
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
  content_rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
  design_rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const MARKETER_APPROVAL_STATUSES = [
  'approved_by_tester',
  'content_approved',
  'design_approved',
  'development_approved'
];

export default function ProjectAssetsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [groupedTasks, setGroupedTasks] = useState({
    creatives: [],
    landingPages: []
  });
  const [byStatus, setByStatus] = useState({
    pendingMarketerReview: [],
    approved: [],
    inProgress: [],
    rejected: []
  });
  const [activeTab, setActiveTab] = useState('all');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [processingTask, setProcessingTask] = useState(null);

  // Set active tab from URL parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['all', 'pending', 'creatives', 'landingPages', 'approved'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProjectTasks();
  }, [projectId]);

  const fetchProjectTasks = async () => {
    try {
      setLoading(true);
      const res = await taskService.getProjectAllTasks(projectId);
      setProject(res.data.project);
      setTasks(res.data.tasks);
      setGroupedTasks(res.data.groupedTasks);
      setByStatus(res.data.byStatus);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load project tasks');
      console.error('Error fetching project tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (task) => {
    try {
      setProcessingTask(task._id);
      await taskService.marketerReview(task._id, { approved: true });
      toast.success('Task approved successfully');
      fetchProjectTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve task');
    } finally {
      setProcessingTask(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionNote.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      setProcessingTask(selectedTask._id);
      await taskService.marketerReview(selectedTask._id, {
        approved: false,
        rejectionNote: rejectionNote.trim()
      });
      toast.success('Task rejected with feedback');
      setShowRejectModal(false);
      setSelectedTask(null);
      setRejectionNote('');
      fetchProjectTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject task');
    } finally {
      setProcessingTask(null);
    }
  };

  const getTaskTypeBadge = (taskType) => {
    const config = TASK_TYPE_CONFIG[taskType] || { label: taskType, icon: FileText, color: 'bg-gray-100 text-gray-800' };
    const Icon = config.icon;
    return (
      <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || { label: status.replace(/_/g, ' '), color: 'bg-gray-100 text-gray-800', icon: Clock };
    const Icon = config.icon;
    return (
      <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const renderAssetCard = (task, showApprovalButtons = false) => (
    <Card key={task._id} className="overflow-hidden">
      <CardBody className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getTaskTypeBadge(task.taskType)}
              {getStatusBadge(task.status)}
            </div>
            <h4 className="font-medium text-gray-900">{task.taskTitle}</h4>
            {task.assetType && (
              <p className="text-sm text-gray-500 mt-1">
                Asset: {task.assetType?.replace(/_/g, ' ')}
              </p>
            )}
          </div>
        </div>

        {/* Strategy Context */}
        {task.strategyContext && Object.keys(task.strategyContext).length > 0 && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg text-sm">
            {task.strategyContext.hook && (
              <p className="text-gray-600"><span className="font-medium">Hook:</span> {task.strategyContext.hook.substring(0, 60)}...</p>
            )}
            {task.strategyContext.platform && (
              <p className="text-gray-600"><span className="font-medium">Platform:</span> {task.strategyContext.platform}</p>
            )}
          </div>
        )}

        {/* Submitted Links and Files */}
        <div className="space-y-2">
          {/* Design Link */}
          {task.designLink && (
            <a
              href={task.designLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm text-blue-600 hover:bg-blue-100"
            >
              <Link className="w-4 h-4" />
              <span className="truncate">{task.designLink}</span>
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
            </a>
          )}

          {/* Design File */}
          {task.designFile?.path && (
            <a
              href={task.designFile.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm text-gray-700 hover:bg-gray-100"
            >
              <FileIcon className="w-4 h-4" />
              <span>{task.designFile.name || 'Download Design File'}</span>
              <Download className="w-4 h-4 ml-auto" />
            </a>
          )}

          {/* Creative Link */}
          {task.creativeLink && (
            <a
              href={task.creativeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm text-blue-600 hover:bg-blue-100"
            >
              <Link className="w-4 h-4" />
              <span className="truncate">{task.creativeLink}</span>
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
            </a>
          )}

          {/* Implementation URL */}
          {task.implementationUrl && (
            <a
              href={task.implementationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-green-50 rounded text-sm text-green-600 hover:bg-green-100"
            >
              <Link className="w-4 h-4" />
              <span className="truncate">{task.implementationUrl}</span>
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
            </a>
          )}

          {/* Output Files */}
          {task.outputFiles && task.outputFiles.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500">Uploaded Files:</p>
              {task.outputFiles.map((file, idx) => (
                <a
                  key={idx}
                  href={file.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm text-gray-700 hover:bg-gray-100"
                >
                  {file.path?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <Image className="w-4 h-4" />
                  ) : file.path?.match(/\.(mp4|mov|avi|webm)$/i) ? (
                    <Video className="w-4 h-4" />
                  ) : (
                    <FileIcon className="w-4 h-4" />
                  )}
                  <span className="truncate">{file.name}</span>
                  <Download className="w-4 h-4 ml-auto" />
                </a>
              ))}
            </div>
          )}

          {/* Content Output */}
          {task.contentOutput && (task.contentOutput.headline || task.contentOutput.bodyText) && (
            <div className="p-3 bg-blue-50 rounded text-sm">
              {task.contentOutput.headline && (
                <p className="font-medium text-gray-900">{task.contentOutput.headline}</p>
              )}
              {task.contentOutput.bodyText && (
                <p className="text-gray-600 mt-1">{task.contentOutput.bodyText.substring(0, 200)}...</p>
              )}
            </div>
          )}

          {/* Notes */}
          {(task.designNotes || task.reviewNotes || task.devNotes) && (
            <div className="p-2 bg-yellow-50 rounded text-sm text-gray-600">
              <p className="font-medium text-yellow-800 mb-1">Notes:</p>
              <p>{task.designNotes || task.reviewNotes || task.devNotes}</p>
            </div>
          )}
        </div>

        {/* Review Info */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            {task.assignedTo && (
              <span>Assigned to: {task.assignedTo.name}</span>
            )}
            {task.testerReviewedBy && (
              <span>Tested by: {task.testerReviewedBy.name}</span>
            )}
          </div>
          <span>{new Date(task.updatedAt).toLocaleDateString()}</span>
        </div>

        {/* Approval Buttons */}
        {showApprovalButtons && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
            <Button
              size="sm"
              variant="success"
              onClick={() => handleApprove(task)}
              loading={processingTask === task._id}
              className="flex-1"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setSelectedTask(task);
                setShowRejectModal(true);
              }}
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const tabs = [
    { key: 'all', label: 'All Tasks', count: tasks.length },
    { key: 'pending', label: 'Pending Review', count: byStatus.pendingMarketerReview.length, highlight: byStatus.pendingMarketerReview.length > 0 },
    { key: 'creatives', label: 'Creatives', count: groupedTasks.creatives.length },
    { key: 'landingPages', label: 'Landing Pages', count: groupedTasks.landingPages.length },
    { key: 'approved', label: 'Approved', count: byStatus.approved.length },
  ];

  const getFilteredTasks = () => {
    switch (activeTab) {
      case 'pending':
        return byStatus.pendingMarketerReview;
      case 'creatives':
        return groupedTasks.creatives;
      case 'landingPages':
        return groupedTasks.landingPages;
      case 'approved':
        return byStatus.approved;
      default:
        return tasks;
    }
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {project?.projectName || project?.businessName || 'Project Tasks'}
            </h1>
            <p className="text-gray-600">
              Track all creatives and landing pages
            </p>
          </div>
        </div>
        {byStatus.pendingMarketerReview.length > 0 && (
          <Badge variant="warning" className="text-sm">
            {byStatus.pendingMarketerReview.length} pending review
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className={byStatus.pendingMarketerReview.length > 0 ? 'ring-2 ring-yellow-400' : ''}>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{byStatus.pendingMarketerReview.length}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{byStatus.inProgress.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Play className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-green-600">{byStatus.approved.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500'
                : 'text-gray-500 hover:text-gray-700'
            } ${tab.highlight ? 'bg-yellow-50' : ''}`}
          >
            {tab.label}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              tab.highlight ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No tasks in this category</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map(task => renderAssetCard(
            task,
            MARKETER_APPROVAL_STATUSES.includes(task.status)
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Task</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this task. This feedback will be sent to the assigned team member.
            </p>
            <textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedTask(null);
                  setRejectionNote('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                loading={processingTask === selectedTask?._id}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject Task
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}