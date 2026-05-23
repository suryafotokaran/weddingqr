/**
 * Template Registry
 * To add a new template:
 * 1. Create src/pages/website/templates/TemplateN.jsx
 * 2. Add entry here with id, name, thumbnail emoji/description
 * 3. Import and map it in TemplateRenderer.jsx
 *
 * Data shape stays the same across all templates — only UI changes.
 */

export const TEMPLATES = [
  {
    id: 'template1',
    name: 'Classic Gold',
    description: 'Rich dark tones with gold accents. Mandala rings & falling petals.',
    thumbnail: '🏵️',
    colors: ['#1A0F0A', '#C9A96E', '#FAF6EF'],
  },
  {
    id: 'template2',
    name: 'Emerald & Gold',
    description: 'Deep emerald with gold Islamic geometric patterns, stars & lanterns.',
    thumbnail: '🪔',
    colors: ['#0D3020', '#C8A84B', '#FDFAF3'],
  },
  {
    id: 'template3',
    name: 'Sacred Temple Night',
    description: 'Midnight black with marigold flames, temple shikhara & Vedic aesthetics.',
    thumbnail: '🛕',
    colors: ['#0D0500', '#F4813A', '#FDC757'],
  },
];

/**
 * Default data scaffold — used when creating a brand-new website config.
 * Every section has an `enabled` boolean that the toggle controls.
 */
export const DEFAULT_DATA = {
  hero: {
    enabled: true,
    groomName: 'Groom',
    brideName: 'Bride',
    tagline: 'You are cordially invited to the wedding of',
    date: '',
    city: '',
  },
  countdown: {
    enabled: true,
  },
  schedule: {
    enabled: true,
    items: [
      { icon: '🌸', time: '08:00 AM', name: 'Mehendi Ceremony', desc: 'Traditional henna art and music to begin our celebration' },
      { icon: '🪔', time: '10:00 AM', name: 'Haldi Ritual', desc: 'Auspicious turmeric ceremony with family blessings' },
      { icon: '💍', time: '12:30 PM', name: 'Wedding Ceremony', desc: 'Sacred vows and rituals at the mandap' },
      { icon: '🍽️', time: '02:30 PM', name: 'Wedding Feast', desc: 'Grand lunch with traditional delicacies from both families' },
      { icon: '🎶', time: '07:00 PM', name: 'Sangeet Night', desc: 'Music, dance and celebration under the stars' },
      { icon: '🎉', time: '09:00 PM', name: 'Reception', desc: 'Grand reception and farewell with love & blessings' },
    ],
  },
  venue: {
    enabled: true,
    items: [
      {
        icon: '🏛️',
        name: 'Main Venue',
        address: 'Enter venue address here',
        tags: [],
      },
    ],
  },
  location: {
    enabled: true,
    mapUrl: 'https://maps.google.com/',
    embedUrl: '',
    transport: [
      { icon: '🚗', mode: 'By Car', desc: '' },
      { icon: '🚇', mode: 'By Metro', desc: '' },
      { icon: '✈️', mode: 'From Airport', desc: '' },
    ],
  },
  family: {
    enabled: true,
    groomSide: [
      { emoji: '👨‍👩‍👦', name: 'Father of Groom', role: 'Father of Groom' },
      { emoji: '👩', name: 'Mother of Groom', role: 'Mother of Groom' },
    ],
    brideSide: [
      { emoji: '👨', name: 'Father of Bride', role: 'Father of Bride' },
      { emoji: '👩‍🦱', name: 'Mother of Bride', role: 'Mother of Bride' },
    ],
  },
  gallery: {
    enabled: true,
    items: [
      { emoji: '📸', caption: 'Our First Meeting' },
      { emoji: '💑', caption: 'Engagement Day' },
      { emoji: '🌹', caption: 'The Proposal' },
      { emoji: '🏔️', caption: 'Himalaya Trip' },
      { emoji: '🎊', caption: 'Pre-Wedding Shoot' },
    ],
  },
  wishes: {
    enabled: true,
  },
  thankyou: {
    enabled: true,
    message: 'Your presence, blessings, and love make our wedding day the most beautiful chapter of our lives. From the bottom of our hearts — thank you.',
  },
};

export const SECTIONS = [
  { key: 'hero',      label: 'Hero',       icon: 'Sparkles',   required: true },
  { key: 'countdown', label: 'Countdown',  icon: 'Timer' },
  { key: 'schedule',  label: 'Schedule',   icon: 'CalendarDays' },
  { key: 'venue',     label: 'Venue',      icon: 'Building2' },
  { key: 'location',  label: 'Location',   icon: 'MapPin' },
  { key: 'family',    label: 'Family',     icon: 'Users' },
  { key: 'gallery',   label: 'Gallery',    icon: 'Images' },
  { key: 'wishes',    label: 'Wishes',     icon: 'MessageCircleHeart' },
  { key: 'thankyou',  label: 'Thank You',  icon: 'Heart' },
];
