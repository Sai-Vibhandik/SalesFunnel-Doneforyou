import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader, Button, Input, Textarea, Spinner, Badge } from '@/components/ui';
import { StageProgressTracker } from '@/components/workflow';
import {
  ArrowLeft,
  Plus,
  X,
  CheckCircle,
  Palette,
  Video,
  LayoutGrid,
  Megaphone,
  Target,
  Users,
  Repeat,
  MessageSquare,
  TrendingUp,
  ShoppingBag,
  Mail,
  Zap,
  GripVertical,
  Eye,
  Heart,
  MousePointer,
  Share2
} from 'lucide-react';
import { creativeService, projectService } from '@/services/api';

// Predefined ad types with icons
const PREDEFINED_AD_TYPES = [
  { key: 'awareness', label: 'Awareness Ads', icon: Eye, description: 'Build brand awareness and reach new audiences' },
  { key: 'consideration', label: 'Consideration Ads', icon: Heart, description: 'Engage interested prospects' },
  { key: 'conversion', label: 'Conversion Ads', icon: MousePointer, description: 'Drive action and sales' },
  { key: 'retargeting', label: 'Retargeting Ads', icon: Repeat, description: 'Re-engage previous visitors' },
  { key: 'lead_generation', label: 'Lead Generation Ads', icon: Users, description: 'Capture leads and contact info' },
];

// Platform options
const PLATFORMS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'google', label: 'Google' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'twitter', label: 'Twitter' },
  { key: 'whatsapp', label: 'WhatsApp' },
];

// Available icons for custom ad types
const AD_TYPE_ICONS = [
  { key: 'Megaphone', icon: Megaphone },
  { key: 'Target', icon: Target },
  { key: 'Users', icon: Users },
  { key: 'TrendingUp', icon: TrendingUp },
  { key: 'ShoppingBag', icon: ShoppingBag },
  { key: 'Mail', icon: Mail },
  { key: 'Zap', icon: Zap },
  { key: 'Share2', icon: Share2 },
];

// Get icon component by name
const getIconComponent = (iconName) => {
  const iconMap = {
    Eye, Heart, MousePointer, Repeat, Users, Megaphone, Target, TrendingUp,
    ShoppingBag, Mail, Zap, Share2, Palette, Video, LayoutGrid
  };
  return iconMap[iconName] || Megaphone;
};

export default function CreativeStrategyPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Ad types state
  const [selectedAdTypes, setSelectedAdTypes] = useState([]);
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Custom ad type form
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTypeName, setCustomTypeName] = useState('');
  const [customTypeIcon, setCustomTypeIcon] = useState('Megaphone');

  // Add ad type modal
  const [showAdTypeModal, setShowAdTypeModal] = useState(false);

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
      const [projectRes, creativeRes] = await Promise.all([
        projectService.getProject(projectId),
        creativeService.get(projectId),
      ]);
      setProject(projectRes.data);

      if (creativeRes.data) {
        // Load ad types
        if (creativeRes.data.adTypes && creativeRes.data.adTypes.length > 0) {
          setSelectedAdTypes(creativeRes.data.adTypes.map(at => ({
            typeKey: at.typeKey,
            typeName: at.typeName,
            isCustom: at.isCustom,
            icon: at.icon || 'Megaphone',
            creatives: at.creatives || {
              imageCreatives: 0,
              videoCreatives: 0,
              carouselCreatives: 0,
              messagingAngle: '',
              hook: '',
              headline: '',
              cta: '',
              platforms: [],
              notes: ''
            },
            order: at.order || 0
          })));
        }
        setAdditionalNotes(creativeRes.data.additionalNotes || '');
        setIsCompleted(creativeRes.data.isCompleted);

        // Legacy: Also check stages for backward compatibility
        if (!creativeRes.data.adTypes?.length && creativeRes.data.stages) {
          // Convert legacy stages to ad types
          const legacyMapping = {
            awareness: { key: 'awareness', label: 'Awareness Ads' },
            consideration: { key: 'consideration', label: 'Consideration Ads' },
            conversion: { key: 'conversion', label: 'Conversion Ads' }
          };
          const convertedAdTypes = creativeRes.data.stages
            .filter(s => s.creatives && s.creatives.length > 0)
            .map(s => ({
              typeKey: legacyMapping[s.stage]?.key || s.stage,
              typeName: legacyMapping[s.stage]?.label || s.stage,
              isCustom: false,
              icon: s.stage === 'awareness' ? 'Eye' : s.stage === 'consideration' ? 'Heart' : 'MousePointer',
              creatives: {
                imageCreatives: s.creatives.filter(c => c.creativeType === 'static_creative').length || 0,
                videoCreatives: s.creatives.filter(c => c.creativeType === 'video_creative').length || 0,
                carouselCreatives: s.creatives.filter(c => c.creativeType === 'carousel').length || 0,
                messagingAngle: '',
                hook: '',
                headline: '',
                cta: '',
                platforms: [],
                notes: ''
              },
              order: 0
            }));
          setSelectedAdTypes(convertedAdTypes);
        }
      }
    } catch (error) {
      // Only show error for actual failures
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to load creative strategy';
      const statusCode = error?.response?.status || error?.status;

      console.error('Creative strategy fetch error:', error);

      if (statusCode === 403) {
        toast.error('Complete Landing Page Strategy first to access Creative Strategy');
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

  const handleAddPredefinedAdType = (adType) => {
    if (selectedAdTypes.find(at => at.typeKey === adType.key)) {
      toast.error('This ad type is already added');
      return;
    }
    setSelectedAdTypes([
      ...selectedAdTypes,
      {
        typeKey: adType.key,
        typeName: adType.label,
        isCustom: false,
        icon: adType.key === 'awareness' ? 'Eye' : adType.key === 'consideration' ? 'Heart' : adType.key === 'conversion' ? 'MousePointer' : adType.key === 'retargeting' ? 'Repeat' : 'Users',
        creatives: {
          imageCreatives: 0,
          videoCreatives: 0,
          carouselCreatives: 0,
          messagingAngle: '',
          hook: '',
          headline: '',
          cta: '',
          platforms: [],
          notes: ''
        },
        order: selectedAdTypes.length
      }
    ]);
    setShowAdTypeModal(false);
    toast.success(`Added ${adType.label}`);
  };

  const handleAddCustomAdType = () => {
    if (!customTypeName.trim()) {
      toast.error('Please enter an ad type name');
      return;
    }

    const typeKey = customTypeName.toLowerCase().replace(/\s+/g, '_') + '_custom';
    if (selectedAdTypes.find(at => at.typeKey === typeKey)) {
      toast.error('This ad type name is already used');
      return;
    }

    setSelectedAdTypes([
      ...selectedAdTypes,
      {
        typeKey,
        typeName: customTypeName.trim(),
        isCustom: true,
        icon: customTypeIcon,
        creatives: {
          imageCreatives: 0,
          videoCreatives: 0,
          carouselCreatives: 0,
          messagingAngle: '',
          hook: '',
          headline: '',
          cta: '',
          platforms: [],
          notes: ''
        },
        order: selectedAdTypes.length
      }
    ]);
    setCustomTypeName('');
    setCustomTypeIcon('Megaphone');
    setShowCustomForm(false);
    setShowAdTypeModal(false);
    toast.success(`Added custom ad type: ${customTypeName}`);
  };

  const handleRemoveAdType = (typeKey) => {
    setSelectedAdTypes(selectedAdTypes.filter(at => at.typeKey !== typeKey));
    toast.success('Ad type removed');
  };

  const handleUpdateAdType = (typeKey, field, value) => {
    setSelectedAdTypes(selectedAdTypes.map(at => {
      if (at.typeKey === typeKey) {
        return {
          ...at,
          creatives: {
            ...at.creatives,
            [field]: value
          }
        };
      }
      return at;
    }));
  };

  const handlePlatformToggle = (typeKey, platformKey) => {
    setSelectedAdTypes(selectedAdTypes.map(at => {
      if (at.typeKey === typeKey) {
        const platforms = at.creatives.platforms || [];
        const newPlatforms = platforms.includes(platformKey)
          ? platforms.filter(p => p !== platformKey)
          : [...platforms, platformKey];
        return {
          ...at,
          creatives: {
            ...at.creatives,
            platforms: newPlatforms
          }
        };
      }
      return at;
    }));
  };

  const onSubmit = async (markComplete = false) => {
    try {
      setSaving(true);

      // Prepare data for API
      const adTypesData = selectedAdTypes.map(at => ({
        typeKey: at.typeKey,
        typeName: at.typeName,
        isCustom: at.isCustom,
        icon: at.icon,
        creatives: at.creatives,
        order: at.order
      }));

      await creativeService.upsert(projectId, {
        adTypes: adTypesData,
        additionalNotes,
        isCompleted: markComplete,
      });

      toast.success(markComplete ? 'Creative strategy completed!' : 'Progress saved!');

      if (markComplete) {
        // Navigate to tasks page after completing strategy - execution phase
        navigate(`/tasks?projectId=${projectId}`);
      }
    } catch (error) {
      console.error('Creative strategy save error:', error);
      const errorMessage = error?.message || 'Failed to save creative strategy';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Calculate total creatives
  const totalCreatives = selectedAdTypes.reduce((sum, at) => {
    return sum + (at.creatives.imageCreatives || 0) + (at.creatives.videoCreatives || 0) + (at.creatives.carouselCreatives || 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // Get available predefined ad types (not yet selected)
  const availablePredefinedTypes = PREDEFINED_AD_TYPES.filter(
    pt => !selectedAdTypes.find(at => at.typeKey === pt.key)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(`/projects/${projectId}`)} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Creative Strategy</h1>
          <p className="text-gray-600 mt-1">{project?.businessName || project?.projectName}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Total Creatives</div>
          <div className="text-2xl font-bold text-primary-600">{totalCreatives}</div>
        </div>
      </div>

      {/* Completion Banner */}
      {isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <div>
            <h3 className="font-semibold text-green-800">Creative Strategy Completed!</h3>
            <p className="text-sm text-green-600">All creative strategy details have been saved.</p>
          </div>
        </div>
      )}

      {/* Progress */}
      <Card>
        <CardBody className="p-4">
          <StageProgressTracker stages={project?.stages} currentStage={project?.currentStage} />
        </CardBody>
      </Card>

      {/* Ad Types Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Ad Types</h2>
              <p className="text-sm text-gray-500">Select predefined ad types or add custom ones</p>
            </div>
            <Button onClick={() => setShowAdTypeModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Ad Type
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {selectedAdTypes.length === 0 ? (
            <div className="text-center py-12">
              <LayoutGrid className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Ad Types Selected</h3>
              <p className="text-gray-500 mb-4">Start by adding ad types for your creative strategy</p>
              <Button onClick={() => setShowAdTypeModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Ad Type
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedAdTypes.map((adType, index) => {
                const IconComponent = getIconComponent(adType.icon);
                return (
                  <div key={adType.typeKey} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-100 rounded-lg">
                          <IconComponent className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{adType.typeName}</h3>
                          {adType.isCustom && (
                            <Badge variant="info" className="text-xs">Custom</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAdType(adType.typeKey)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Creative Counts */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <Palette className="w-4 h-4 inline mr-1" />
                          Image Creatives
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={adType.creatives.imageCreatives || 0}
                          onChange={(e) => handleUpdateAdType(adType.typeKey, 'imageCreatives', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <Video className="w-4 h-4 inline mr-1" />
                          Video Creatives
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={adType.creatives.videoCreatives || 0}
                          onChange={(e) => handleUpdateAdType(adType.typeKey, 'videoCreatives', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <LayoutGrid className="w-4 h-4 inline mr-1" />
                          Carousel Creatives
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={adType.creatives.carouselCreatives || 0}
                          onChange={(e) => handleUpdateAdType(adType.typeKey, 'carouselCreatives', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    {/* Platforms */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Platforms</label>
                      <div className="flex flex-wrap gap-2">
                        {PLATFORMS.map(platform => (
                          <button
                            key={platform.key}
                            type="button"
                            onClick={() => handlePlatformToggle(adType.typeKey, platform.key)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              adType.creatives.platforms?.includes(platform.key)
                                ? 'bg-primary-100 text-primary-700 border-primary-300'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            } border`}
                          >
                            {platform.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Messaging Angle */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <MessageSquare className="w-4 h-4 inline mr-1" />
                        Messaging Angle
                      </label>
                      <Textarea
                        placeholder="Describe the key messaging angle for this ad type..."
                        rows={2}
                        value={adType.creatives.messagingAngle || ''}
                        onChange={(e) => handleUpdateAdType(adType.typeKey, 'messagingAngle', e.target.value)}
                      />
                    </div>

                    {/* Hook & CTA */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hook / Headline
                        </label>
                        <Input
                          placeholder="Attention-grabbing hook..."
                          value={adType.creatives.hook || ''}
                          onChange={(e) => handleUpdateAdType(adType.typeKey, 'hook', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CTA (Call to Action)
                        </label>
                        <Input
                          placeholder="e.g., Shop Now, Learn More..."
                          value={adType.creatives.cta || ''}
                          onChange={(e) => handleUpdateAdType(adType.typeKey, 'cta', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Notes
                      </label>
                      <Textarea
                        placeholder="Any specific instructions for this ad type..."
                        rows={2}
                        value={adType.creatives.notes || ''}
                        onChange={(e) => handleUpdateAdType(adType.typeKey, 'notes', e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Additional Notes Section */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Additional Creative Instructions</h2>
          <p className="text-sm text-gray-500">Describe overall creative direction and special instructions</p>
        </CardHeader>
        <CardBody>
          <Textarea
            placeholder="e.g., Use emotional storytelling for awareness ads and strong CTA for conversion ads. Maintain brand voice across all creatives..."
            rows={5}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
          />
        </CardBody>
      </Card>

      {/* Summary */}
      {selectedAdTypes.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Creative Summary</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-primary-600">{selectedAdTypes.length}</div>
                <div className="text-sm text-gray-600">Ad Types</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {selectedAdTypes.reduce((sum, at) => sum + (at.creatives.imageCreatives || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Image Creatives</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {selectedAdTypes.reduce((sum, at) => sum + (at.creatives.videoCreatives || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Video Creatives</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-3xl font-bold text-orange-600">
                  {selectedAdTypes.reduce((sum, at) => sum + (at.creatives.carouselCreatives || 0), 0)}
                </div>
                <div className="text-sm text-gray-600">Carousel Creatives</div>
              </div>
            </div>

            {/* Platform Distribution */}
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium text-gray-700 mb-2">Platforms Selected:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedAdTypes.flatMap(at => at.creatives.platforms || []).length > 0 ? (
                  [...new Set(selectedAdTypes.flatMap(at => at.creatives.platforms || []))].map(platform => (
                    <Badge key={platform} variant="secondary">
                      {PLATFORMS.find(p => p.key === platform)?.label || platform}
                    </Badge>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm">No platforms selected yet</span>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        {!isCompleted ? (
          <>
            <Button variant="secondary" onClick={() => onSubmit(false)} loading={saving}>
              Save Progress
            </Button>
            <Button onClick={() => onSubmit(true)} loading={saving} disabled={selectedAdTypes.length === 0}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete & Continue
            </Button>
          </>
        ) : (
          <Button onClick={() => navigate(`/projects/${projectId}`)}>
            View Project Details
            <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
          </Button>
        )}
      </div>

      {/* Ad Type Selection Modal */}
      {showAdTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Add Ad Type</h2>
                <Button variant="ghost" onClick={() => {
                  setShowAdTypeModal(false);
                  setShowCustomForm(false);
                }}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {!showCustomForm ? (
                <>
                  {/* Predefined Ad Types */}
                  {availablePredefinedTypes.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Predefined Ad Types</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availablePredefinedTypes.map(adType => {
                          const IconComponent = adType.icon;
                          return (
                            <button
                              key={adType.key}
                              onClick={() => handleAddPredefinedAdType(adType)}
                              className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                            >
                              <div className="p-2 bg-primary-100 rounded-lg">
                                <IconComponent className="w-5 h-5 text-primary-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{adType.label}</div>
                                <div className="text-sm text-gray-500">{adType.description}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or create custom</span>
                    </div>
                  </div>

                  {/* Custom Ad Type Form Toggle */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowCustomForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Custom Ad Type
                  </Button>
                </>
              ) : (
                <>
                  {/* Custom Ad Type Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ad Type Name
                      </label>
                      <Input
                        placeholder="e.g., Influencer Ads, WhatsApp Campaign..."
                        value={customTypeName}
                        onChange={(e) => setCustomTypeName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Icon
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {AD_TYPE_ICONS.map(iconOption => {
                          const IconComp = iconOption.icon;
                          return (
                            <button
                              key={iconOption.key}
                              type="button"
                              onClick={() => setCustomTypeIcon(iconOption.key)}
                              className={`p-3 rounded-lg border-2 transition-colors ${
                                customTypeIcon === iconOption.key
                                  ? 'border-primary-500 bg-primary-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <IconComp className="w-5 h-5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button variant="secondary" onClick={() => setShowCustomForm(false)}>
                        Back
                      </Button>
                      <Button onClick={handleAddCustomAdType}>
                        Add Custom Ad Type
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}