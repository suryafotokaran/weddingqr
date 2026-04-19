/**
 * Invitation Template Registry
 *
 * To add a new template:
 *   1. Create MyTemplate.jsx inside this folder
 *   2. Import it below
 *   3. Push an entry to the TEMPLATES array
 *
 * That's it — the editor and public view pick it up automatically.
 */

import Template01 from './Template01_GoldenRoyal';
import Template02 from './Template02_RosePurple';

export const TEMPLATES = [
  {
    id: 'golden-royal',
    name: 'Golden Royal',
    description: 'Luxurious dark-gold Indian wedding invitation with petals & animations.',
    component: Template01,
    // Thumbnail colour used in the picker card (no actual image needed)
    accentColor: '#f5a623',
    bgColor: '#080200',
  },
  {
    id: 'rose-purple',
    name: 'Rose & Purple Royale',
    description: 'A modern, vibrant design with deep purple tones, rose accents, and interactive heart animations.',
    component: Template02,
    accentColor: '#E8627A',
    bgColor: '#0D0510',
  },
];

/** Returns the template object by id, or the first one as fallback */
export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
