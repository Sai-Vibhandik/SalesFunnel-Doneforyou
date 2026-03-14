// Creative Categories
export const CREATIVE_CATEGORIES = [
  { key: 'IMAGE', label: 'Image Creatives', icon: 'Image' },
  { key: 'VIDEO', label: 'Video Creatives', icon: 'Video' },
  { key: 'CAROUSEL', label: 'Carousel Creatives', icon: 'Layout' },
  { key: 'UGC', label: 'UGC Creatives', icon: 'User' },
  { key: 'TESTIMONIAL', label: 'Testimonial Creatives', icon: 'Quote' },
  { key: 'DEMO_EXPLAINER', label: 'Demo / Explainer', icon: 'Play' },
  { key: 'OFFER_SALES', label: 'Offer / Sales', icon: 'Tag' }
];

// Creative Types per Category
export const CREATIVE_TYPES = {
  IMAGE: [
    'Problem Image',
    'Solution Image',
    'Offer Image',
    'Discount Image',
    'Limited Time Offer Image',
    'Before – After Image',
    'Comparison Image',
    'Feature Highlight Image',
    'Benefit Image',
    'Statistic / Data Image',
    'Question Hook Image',
    'Bold Statement Image',
    'Testimonial Screenshot Image',
    'Review Image',
    'Result Proof Image',
    'Authority Quote Image',
    'Meme Image',
    'Relatable Situation Image',
    'Urgency Image',
    'CTA Focus Image'
  ],
  VIDEO: [
    'Problem Hook Video',
    'Storytelling Video',
    'Product Demo Video',
    'Service Demo Video',
    'Explainer Video',
    'Educational Tip Video',
    'Myth vs Reality Video',
    'Offer Announcement Video',
    'Urgency Video',
    'Behind The Scenes Video',
    'Founder Message Video',
    'FAQ Video',
    'Case Study Video',
    'Testimonial Video',
    'Comparison Video',
    'How It Works Video',
    'Objection Handling Video',
    'Trend Reel Video',
    'Screen Recording Video',
    'Sales Pitch Video'
  ],
  CAROUSEL: [
    'Feature Carousel',
    'Benefit Carousel',
    'Step by Step Carousel',
    'Before After Carousel',
    'Testimonial Carousel',
    'Case Study Carousel',
    'Product Showcase Carousel',
    'Offer Breakdown Carousel'
  ],
  UGC: [
    'Selfie Review Video',
    'Customer Experience Video',
    'Reaction Video',
    'Unboxing Video',
    'Day in Life Video',
    'Real Life Story Video'
  ],
  TESTIMONIAL: [
    'Video Testimonial',
    'Screenshot Review',
    'Google Review Image',
    'Client Success Story',
    'Result Dashboard Proof'
  ],
  DEMO_EXPLAINER: [
    'Screen Recording Demo',
    'Product Usage Demo',
    'Service Process Demo',
    'Tutorial Video',
    'Walkthrough Video'
  ],
  OFFER_SALES: [
    'Launch Offer',
    'Limited Time Offer',
    'Discount Offer',
    'Festive Offer',
    'Bonus Offer',
    'Last Chance Offer',
    'Price Breakdown Creative',
    'Guarantee Creative'
  ]
};

// Assigned Roles for Creative Production
export const CREATIVE_ROLES = [
  { key: 'graphic_designer', label: 'Graphic Designer' },
  { key: 'video_editor', label: 'Video Editor' }
];

// Platforms
export const PLATFORMS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'google', label: 'Google' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'twitter', label: 'Twitter/X' },
  { key: 'whatsapp', label: 'WhatsApp' }
];

// Get label for category key
export const getCategoryLabel = (key) => {
  const category = CREATIVE_CATEGORIES.find(c => c.key === key);
  return category ? category.label : key;
};

// Get icon for category key
export const getCategoryIcon = (key) => {
  const category = CREATIVE_CATEGORIES.find(c => c.key === key);
  return category ? category.icon : 'File';
};

// Get types for category
export const getTypesForCategory = (categoryKey) => {
  return CREATIVE_TYPES[categoryKey] || [];
};

// Get role label
export const getRoleLabel = (key) => {
  const role = CREATIVE_ROLES.find(r => r.key === key);
  return role ? role.label : key;
};

// Default role for category
export const getDefaultRoleForCategory = (categoryKey) => {
  // Image and Carousel default to Graphic Designer
  // Video, UGC, Testimonial, Demo, Offer default to Video Editor
  const imageCategories = ['IMAGE', 'CAROUSEL'];
  return imageCategories.includes(categoryKey) ? 'graphic_designer' : 'video_editor';
};