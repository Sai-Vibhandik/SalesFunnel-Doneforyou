import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { projectService, taskService } from '@/services/api';
import { Card, CardBody, Button, Badge, Spinner } from '@/components/ui';
import {
  Image,
  FolderKanban,
  AlertCircle,
  ChevronRight,
  Clock,
  CheckCircle,
  Play,
  Eye,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AssetsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectTaskCounts, setProjectTaskCounts] = useState({});
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await projectService.getProjects({ limit: 100 });
      const projectsData = response.data || [];
      setProjects(projectsData);

      // Fetch task counts for each project
      setLoadingTasks(true);
      const taskCounts = {};
      for (const project of projectsData) {
        try {
          const tasksRes = await taskService.getProjectAllTasks(project._id);
          const data = tasksRes.data;
          taskCounts[project._id] = {
            total: data.tasks?.length || 0,
            pending: data.byStatus?.pendingMarketerReview?.length || 0,
            inProgress: data.byStatus?.inProgress?.length || 0,
            approved: data.byStatus?.approved?.length || 0,
          };
        } catch (err) {
          console.error(`Failed to fetch tasks for project ${project._id}:`, err);
          taskCounts[project._id] = { total: 0, pending: 0, inProgress: 0, approved: 0 };
        }
      }
      setProjectTaskCounts(taskCounts);
      setLoadingTasks(false);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total pending approvals across all projects
  const totalPendingApprovals = Object.values(projectTaskCounts).reduce(
    (sum, counts) => sum + (counts.pending || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardBody className="py-12">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Assets</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchProjects}>
                Try Again
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-gray-600 mt-1">
            View all creatives and landing pages across your projects
          </p>
        </div>
        {totalPendingApprovals > 0 && (
          <Badge variant="warning" className="text-sm px-3 py-1">
            {totalPendingApprovals} pending approval{totalPendingApprovals !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FolderKanban className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className={totalPendingApprovals > 0 ? 'ring-2 ring-yellow-400' : ''}>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{totalPendingApprovals}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Eye className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Object.values(projectTaskCounts).reduce((sum, c) => sum + (c.inProgress || 0), 0)}
                </p>
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
                <p className="text-2xl font-bold text-green-600">
                  {Object.values(projectTaskCounts).reduce((sum, c) => sum + (c.approved || 0), 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <Card>
          <CardBody className="py-12">
            <div className="text-center">
              <Image className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
              <p className="text-gray-600 mb-4">
                You don't have any projects assigned yet. Contact your administrator to get started.
              </p>
              <Button variant="secondary" onClick={() => navigate('/projects')}>
                View Projects
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Select a Project</h2>

          {loadingTasks && (
            <div className="flex items-center gap-2 text-gray-500">
              <Spinner size="sm" />
              <span>Loading task statistics...</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => {
              const counts = projectTaskCounts[project._id] || { total: 0, pending: 0, inProgress: 0, approved: 0 };
              const hasPending = counts.pending > 0;

              return (
                <Card
                  key={project._id}
                  className={`hover:shadow-md transition-all cursor-pointer ${hasPending ? 'ring-2 ring-yellow-400' : ''}`}
                  onClick={() => navigate(`/projects/${project._id}/assets`)}
                >
                  <CardBody className="p-5">
                    {/* Project Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {project.projectName || project.businessName}
                          </h3>
                          {hasPending && (
                            <Badge variant="warning" className="text-xs">
                              {counts.pending} pending
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{project.customerName}</p>
                        {project.industry && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            {project.industry}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={project.status === 'active' ? 'success' : 'default'}>
                          {project.status || 'active'}
                        </Badge>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>

                    {/* Task Stats */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-gray-900">{counts.total}</p>
                        <p className="text-xs text-gray-500">Total</p>
                      </div>
                      <div className={`text-center p-2 rounded-lg ${hasPending ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                        <p className={`text-lg font-bold ${hasPending ? 'text-yellow-600' : 'text-gray-900'}`}>
                          {counts.pending}
                        </p>
                        <p className="text-xs text-gray-500">Pending</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-blue-600">{counts.inProgress}</p>
                        <p className="text-xs text-gray-500">In Progress</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-green-600">{counts.approved}</p>
                        <p className="text-xs text-gray-500">Approved</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${project._id}/assets`);
                        }}
                      >
                        <Image className="w-4 h-4 mr-1" />
                        View Assets
                      </Button>
                      {hasPending && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${project._id}/assets?tab=pending`);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      )}
                    </div>

                    {/* Last Updated */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <span>Updated: {formatDate(project.updatedAt)}</span>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Help Text */}
      <Card>
        <CardBody className="p-4">
          <div className="flex items-start gap-3">
            <Image className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 mb-1">About Assets</h4>
              <p className="text-sm text-gray-600">
                This section shows all creative assets (images, videos, carousels) and landing pages across your projects.
                Items pending your approval are highlighted in yellow. Click on a project to view details and approve or reject assets.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}