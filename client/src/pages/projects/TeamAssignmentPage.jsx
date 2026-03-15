import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authService, projectService } from '@/services/api';
import { Card, CardBody, CardHeader, Button, Badge, Spinner } from '@/components/ui';
import { ArrowLeft, Users, UserPlus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Role configuration - keys match the backend User role values (underscore)
// label is the display name
// assignedTeamField is the corresponding field name in Project.assignedTeam (camelCase)
const ROLE_CONFIG = {
  performance_marketer: {
    label: 'Performance Marketer',
    assignedTeamField: 'performanceMarketer',
    color: 'bg-blue-100 text-blue-700',
    borderColor: 'border-blue-200',
  },
  content_creator: {
    label: 'Content Creator',
    assignedTeamField: 'contentCreator',
    color: 'bg-indigo-100 text-indigo-700',
    borderColor: 'border-indigo-200',
  },
  ui_ux_designer: {
    label: 'UI/UX Designer',
    assignedTeamField: 'uiUxDesigner',
    color: 'bg-purple-100 text-purple-700',
    borderColor: 'border-purple-200',
  },
  graphic_designer: {
    label: 'Graphic Designer',
    assignedTeamField: 'graphicDesigner',
    color: 'bg-pink-100 text-pink-700',
    borderColor: 'border-pink-200',
  },
  developer: {
    label: 'Developer',
    assignedTeamField: 'developer',
    color: 'bg-green-100 text-green-700',
    borderColor: 'border-green-200',
  },
  tester: {
    label: 'Tester',
    assignedTeamField: 'tester',
    color: 'bg-orange-100 text-orange-700',
    borderColor: 'border-orange-200',
  },
};

export default function TeamAssignmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState(null);
  const [teamByRole, setTeamByRole] = useState({});
  const [selectedTeam, setSelectedTeam] = useState({});

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectRes, teamRes] = await Promise.all([
        projectService.getProject(id),
        authService.getTeamByRole()
      ]);

      setProject(projectRes.data);
      setTeamByRole(teamRes.data);

      // Set currently assigned team - map from assignedTeam fields to role keys
      if (projectRes.data.assignedTeam) {
        const assignedTeam = {};
        Object.entries(ROLE_CONFIG).forEach(([roleKey, config]) => {
          const assignedTeamField = config.assignedTeamField;
          if (projectRes.data.assignedTeam[assignedTeamField]) {
            assignedTeam[roleKey] = projectRes.data.assignedTeam[assignedTeamField]._id ||
                                    projectRes.data.assignedTeam[assignedTeamField];
          }
        });
        setSelectedTeam(assignedTeam);
      }

      console.log('Team by role:', teamRes.data);
      console.log('Assigned team:', projectRes.data.assignedTeam);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (role, memberId) => {
    setSelectedTeam(prev => ({
      ...prev,
      [role]: prev[role] === memberId ? null : memberId
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Convert selectedTeam (role keys) to assignedTeam fields
      const assignedTeamData = {};
      Object.entries(selectedTeam).forEach(([roleKey, memberId]) => {
        const config = ROLE_CONFIG[roleKey];
        if (config && memberId) {
          assignedTeamData[config.assignedTeamField] = memberId;
        }
      });

      // Set null for unassigned roles
      Object.values(ROLE_CONFIG).forEach(config => {
        if (!assignedTeamData[config.assignedTeamField]) {
          assignedTeamData[config.assignedTeamField] = null;
        }
      });

      await projectService.assignTeam(id, assignedTeamData);
      toast.success('Team assigned successfully!');
      navigate('/projects');
    } catch (error) {
      toast.error(error.message || 'Failed to assign team');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    try {
      await projectService.toggleActivation(id, true);
      toast.success('Project activated successfully!');
      navigate('/projects');
    } catch (error) {
      toast.error(error.message || 'Failed to activate project');
    }
  };

  const hasPerformanceMarketer = Object.entries(ROLE_CONFIG).some(([roleKey, config]) => {
    return config.assignedTeamField === 'performanceMarketer' && selectedTeam[roleKey];
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/projects')}
          className="p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Assign Team</h1>
          <p className="text-gray-600 mt-1">
            Assign team members to work on this project.
          </p>
        </div>
      </div>

      {/* Project Info */}
      <Card>
        <CardBody className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {project.projectName || project.businessName}
              </h2>
              <p className="text-gray-500 mt-1">{project.customerName} • {project.email}</p>
              {project.industry && (
                <Badge className="mt-2">{project.industry}</Badge>
              )}
            </div>
            <Badge variant={project.isActive ? 'success' : 'default'}>
              {project.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {project.description && (
            <p className="text-gray-600 mt-4">{project.description}</p>
          )}
        </CardBody>
      </Card>

      {/* Team Assignment */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Team Assignment</h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Select team members for each role. You can assign one person per role.
          </p>
        </CardHeader>
        <CardBody className="p-6">
          <div className="space-y-6">
            {Object.entries(ROLE_CONFIG).map(([roleKey, config]) => (
              <div key={roleKey}>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  {config.label}
                </h4>
                {teamByRole[roleKey]?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {teamByRole[roleKey].map((member) => (
                      <button
                        key={member._id}
                        onClick={() => handleSelect(roleKey, member._id)}
                        className={cn(
                          'flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left',
                          selectedTeam[roleKey] === member._id
                            ? `${config.borderColor} bg-opacity-10`
                            : 'border-gray-100 hover:border-gray-200'
                        )}
                        style={{
                          backgroundColor: selectedTeam[roleKey] === member._id
                            ? config.color.replace('bg-', '').replace('text-', '').split(' ')[0].includes('blue') ? 'rgba(59, 130, 246, 0.1)'
                            : config.color.includes('purple') ? 'rgba(139, 92, 246, 0.1)'
                            : config.color.includes('pink') ? 'rgba(236, 72, 153, 0.1)'
                            : config.color.includes('green') ? 'rgba(34, 197, 94, 0.1)'
                            : config.color.includes('orange') ? 'rgba(249, 115, 22, 0.1)'
                            : 'rgba(107, 114, 128, 0.1)'
                            : 'white'
                        }}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                          {member.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {member.name}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {member.email}
                          </p>
                          {member.specialization && (
                            <p className="text-xs text-gray-400 truncate">
                              {member.specialization}
                            </p>
                          )}
                        </div>
                        {selectedTeam[roleKey] === member._id && (
                          <div className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center',
                            config.color.split(' ')[0]
                          )}>
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    No team members available for this role. Add team members in Team Management.
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/projects')}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          loading={saving}
        >
          <Users className="w-4 h-4 mr-2" />
          Save Team Assignment
        </Button>
        {/* {hasPerformanceMarketer && !project.isActive && (
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleActivate}
          >
            Activate Project
          </Button>
        )} */}
      </div>
    </div>
  );
}