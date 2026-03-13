import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader, Button, Input, Textarea, Spinner } from '@/components/ui';
import { StageProgressTracker } from '@/components/workflow';
import { ArrowLeft, Plus, X, CheckCircle } from 'lucide-react';

// STATIC DATA MODE - Set to true for development, false for API calls
const USE_STATIC_DATA = false;

// Mock project data with traffic strategy completed
const STATIC_PROJECT = {
  _id: 'static-project-1',
  customerName: 'John Smith',
  businessName: 'Acme Corporation',
  email: 'john@acme.com',
  mobile: '+1-555-0123',
  currentStage: 5,
  overallProgress: 67,
  stages: {
    onboarding: { isCompleted: true, completedAt: new Date() },
    marketResearch: { isCompleted: true, completedAt: new Date() },
    offerEngineering: { isCompleted: true, completedAt: new Date() },
    trafficStrategy: { isCompleted: true, completedAt: new Date() },
    landingPage: { isCompleted: false, completedAt: null },
    creativeStrategy: { isCompleted: false, completedAt: null }
  },
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mock landing page data
const STATIC_LANDING_PAGE = {
  type: 'lead_magnet',
  leadCapture: {
    method: 'form',
    fields: ['name', 'email'],
    calendlyLink: '',
    whatsappNumber: '',
  },
  nurturing: [
    { method: 'email', frequency: 'weekly', isActive: true },
    { method: 'whatsapp', frequency: 'daily', isActive: true },
  ],
  headline: 'Transform Your Business with Proven Marketing Strategies',
  subheadline: 'Get your free guide and discover the secrets to 10x your conversions',
  ctaText: 'Get Your Free Guide Now',
  isCompleted: false
};

const LANDING_PAGE_TYPES = [
  { id: 'video_sales_letter', label: 'Video Sales Letter', icon: '🎥' },
  { id: 'long_form', label: 'Long-form Page', icon: '📄' },
  { id: 'lead_magnet', label: 'Lead Magnet', icon: '🧲' },
  { id: 'ebook', label: 'Ebook Page', icon: '📚' },
  { id: 'webinar', label: 'Webinar Page', icon: '🖥️' },
];

const LEAD_CAPTURE_METHODS = [
  { id: 'form', label: 'Form', icon: '📝' },
  { id: 'calendly', label: 'Calendly', icon: '📅' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'free_audit', label: 'Free Audit', icon: '🔍' },
];

const NURTURING_METHODS = [
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'sms', label: 'SMS', icon: '📱' },
];

const NURTURING_FREQUENCIES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'bi-weekly', label: 'Bi-weekly' },
  { id: 'monthly', label: 'Monthly' },
];

export default function LandingPageStrategyPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [landingPageType, setLandingPageType] = useState('');
  const [leadCapture, setLeadCapture] = useState({
    method: 'form',
    fields: ['name', 'email'],
    calendlyLink: '',
    whatsappNumber: '',
  });
  const [nurturing, setNurturing] = useState([]);
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [ctaText, setCtaText] = useState('');

  useEffect(() => {
    if (!projectId) {
      navigate('/projects');
      return;
    }
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (USE_STATIC_DATA) {
        // Use static data for development
        setProject(STATIC_PROJECT);
        setLandingPageType(STATIC_LANDING_PAGE.type);
        setLeadCapture(STATIC_LANDING_PAGE.leadCapture);
        setNurturing(STATIC_LANDING_PAGE.nurturing);
        setHeadline(STATIC_LANDING_PAGE.headline);
        setSubheadline(STATIC_LANDING_PAGE.subheadline);
        setCtaText(STATIC_LANDING_PAGE.ctaText);
        setIsCompleted(STATIC_LANDING_PAGE.isCompleted);
      } else {
        // Real API calls
        const { projectService, landingPageService } = await import('@/services/api');
        const [projectRes, lpRes] = await Promise.all([
          projectService.getProject(projectId),
          landingPageService.get(projectId),
        ]);
        setProject(projectRes.data);

        if (lpRes.data) {
          setLandingPageType(lpRes.data.type || '');
          setLeadCapture(lpRes.data.leadCapture || { method: 'form', fields: ['name', 'email'] });
          setNurturing(lpRes.data.nurturing || []);
          setHeadline(lpRes.data.headline || '');
          setSubheadline(lpRes.data.subheadline || '');
          setCtaText(lpRes.data.ctaText || '');
          setIsCompleted(lpRes.data.isCompleted);
        }
      }
    } catch (error) {
      // Only show error for actual failures
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to load landing page strategy';
      const statusCode = error?.response?.status || error?.status;

      console.error('Landing page fetch error:', error);

      if (statusCode === 403) {
        toast.error('Complete Traffic Strategy first to access Landing Page Strategy');
        navigate('/projects');
      } else if (statusCode === 404) {
        toast.error('Project not found');
        navigate('/projects');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleNurturingMethod = (method) => {
    const existingIndex = nurturing.findIndex(n => n.method === method);
    if (existingIndex > -1) {
      setNurturing(nurturing.filter((_, i) => i !== existingIndex));
    } else {
      setNurturing([...nurturing, { method, frequency: 'weekly', isActive: true }]);
    }
  };

  const updateNurturingFrequency = (method, frequency) => {
    setNurturing(nurturing.map(n =>
      n.method === method ? { ...n, frequency } : n
    ));
  };

  const onSubmit = async (markComplete = false) => {
    try {
      setSaving(true);

      if (USE_STATIC_DATA) {
        // Static mode - simulate save
        await new Promise(resolve => setTimeout(resolve, 500));
        if (markComplete) {
          setIsCompleted(true);
          setProject(prev => ({
            ...prev,
            stages: {
              ...prev.stages,
              landingPage: { isCompleted: true, completedAt: new Date() }
            },
            currentStage: 6,
            overallProgress: 83
          }));
          toast.success('Landing page strategy completed! Moving to Creative Strategy...');
          setTimeout(() => {
            navigate(`/creative-strategy?projectId=${projectId}`);
          }, 1500);
        } else {
          toast.success('Progress saved!');
        }
      } else {
        // Real API call
        const { landingPageService } = await import('@/services/api');
        await landingPageService.upsert(projectId, {
          type: landingPageType,
          leadCapture,
          nurturing,
          headline,
          subheadline,
          ctaText,
          isCompleted: markComplete,
        });
        toast.success(markComplete ? 'Landing page strategy completed!' : 'Progress saved!');
        if (markComplete) {
          navigate(`/creative-strategy?projectId=${projectId}`);
        }
      }
    } catch (error) {
      console.error('Landing page save error:', error);
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to save landing page strategy';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // Calculate progress
  const calculateProgress = () => {
    const fields = [
      landingPageType,
      leadCapture.method,
      headline,
      subheadline,
      ctaText,
    ];
    const filled = fields.filter(f => f).length;
    return Math.round((filled / fields.length) * 100);
  };

  const progress = calculateProgress();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(`/projects/${projectId}`)} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Landing Page & Lead Capture</h1>
          <p className="text-gray-600 mt-1">{project?.businessName}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Progress</div>
          <div className="text-2xl font-bold text-primary-600">
            {isCompleted ? '100%' : `${progress}%`}
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <div>
            <h3 className="font-semibold text-green-800">Stage Completed!</h3>
            <p className="text-sm text-green-600">You can now proceed to Creative Strategy.</p>
          </div>
        </div>
      )}

      {/* Progress */}
      <Card>
        <CardBody className="p-4">
          <StageProgressTracker stages={project?.stages} currentStage={project?.currentStage} />
        </CardBody>
      </Card>

      {/* Landing Page Type */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Landing Page Type</h2>
          <p className="text-sm text-gray-500">Choose the type of landing page</p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {LANDING_PAGE_TYPES.map((type) => (
              <div
                key={type.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  landingPageType === type.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setLandingPageType(type.id)}
              >
                <span className="text-2xl">{type.icon}</span>
                <p className="mt-2 font-medium">{type.label}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Lead Capture Method */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Lead Capture Method</h2>
          <p className="text-sm text-gray-500">How will you capture leads?</p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {LEAD_CAPTURE_METHODS.map((method) => (
              <div
                key={method.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  leadCapture.method === method.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setLeadCapture({ ...leadCapture, method: method.id })}
              >
                <span className="text-2xl">{method.icon}</span>
                <p className="mt-2 font-medium">{method.label}</p>
              </div>
            ))}
          </div>

          {leadCapture.method === 'calendly' && (
            <Input
              label="Calendly Link"
              placeholder="https://calendly.com/your-link"
              value={leadCapture.calendlyLink}
              onChange={(e) => setLeadCapture({ ...leadCapture, calendlyLink: e.target.value })}
            />
          )}

          {leadCapture.method === 'whatsapp' && (
            <Input
              label="WhatsApp Number"
              placeholder="+1 234 567 890"
              value={leadCapture.whatsappNumber}
              onChange={(e) => setLeadCapture({ ...leadCapture, whatsappNumber: e.target.value })}
            />
          )}
        </CardBody>
      </Card>

      {/* Lead Nurturing */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Lead Nurturing</h2>
          <p className="text-sm text-gray-500">How will you nurture your leads?</p>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {NURTURING_METHODS.map((method) => {
              const isSelected = nurturing.some(n => n.method === method.id);
              const selectedMethod = nurturing.find(n => n.method === method.id);

              return (
                <div
                  key={method.id}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{method.icon}</span>
                      <span className="font-medium">{method.label}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleNurturingMethod(method.id)}
                      className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </div>
                  {isSelected && (
                    <div className="mt-3 flex items-center gap-4">
                      <label className="text-sm text-gray-600">Frequency:</label>
                      <select
                        value={selectedMethod?.frequency || 'weekly'}
                        onChange={(e) => updateNurturingFrequency(method.id, e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                      >
                        {NURTURING_FREQUENCIES.map((freq) => (
                          <option key={freq.id} value={freq.id}>{freq.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Page Content */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Page Content</h2>
          <p className="text-sm text-gray-500">Define your landing page content</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input
            label="Headline"
            placeholder="Your main headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />
          <Input
            label="Subheadline"
            placeholder="Supporting headline"
            value={subheadline}
            onChange={(e) => setSubheadline(e.target.value)}
          />
          <Input
            label="Call-to-Action Text"
            placeholder="e.g., Get Started Now"
            value={ctaText}
            onChange={(e) => setCtaText(e.target.value)}
          />
        </CardBody>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        {!isCompleted ? (
          <>
            <Button variant="secondary" onClick={() => onSubmit(false)} loading={saving}>
              Save Progress
            </Button>
            <Button onClick={() => onSubmit(true)} loading={saving}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete & Continue
            </Button>
          </>
        ) : (
          <Button onClick={() => navigate(`/creative-strategy?projectId=${projectId}`)}>
            Continue to Creative Strategy
            <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
          </Button>
        )}
      </div>
    </div>
  );
}