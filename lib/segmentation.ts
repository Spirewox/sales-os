import { Customer, CustomerType } from '../types';

/**
 * Auto-segmentation engine.
 *
 * Segments are NOT hand-tagged ? they are derived from a customer's profile
 * (type, business category, B2C demographics) and behaviour (orders, spend).
 * `deriveSegments` is the single source of truth used across the app
 * (customer list, analytics, interactions).
 */

export interface SegmentGroup {
  group: string;
  segments: string[];
}

const B2B_CATEGORY_SEGMENTS: Record<string, string[]> = {
  'Roadside Business & Food Vendors': ['Street Food Vendor', 'HoReCa'],
  Hospitality: ['Hospitality', 'Bulk Buyer'],
  Schools: ['Institutional', 'Bulk Buyer'],
  'Religious Bodies': ['Faith Organisation', 'Bulk Buyer'],
  'NGOs & Associations': ['Non-Profit'],
  Retailers: ['Reseller', 'Bulk Buyer'],
  'Education Institutions': ['Institutional', 'Bulk Buyer'],
  'Event Planners': ['Events & Catering'],
  'Restaurants & Bars': ['HoReCa', 'Hospitality'],
  Hotels: ['Hospitality', 'Bulk Buyer'],
  'Catering Services': ['Events & Catering', 'Bulk Buyer'],
  Supermarkets: ['Reseller', 'Bulk Buyer'],
  'Corporate / Offices': ['Corporate'],
};

const AGE_SEGMENTS: Record<string, string> = {
  '18-25': 'Gen Z',
  '26-35': 'Young Professional',
  '36-45': 'Established Family',
  '46-60': 'Mature Household',
  '60+': 'Senior',
};

export const SEGMENT_TAXONOMY: SegmentGroup[] = [
  { group: 'Channel', segments: ['B2B Account', 'B2C Consumer'] },
  { group: 'Loyalty', segments: ['Prospect', 'First-Time Buyer', 'Repeat Buyer', 'Loyal'] },
  { group: 'Value', segments: ['VIP / Key Account', 'High Value', 'Mid Value', 'Low Value'] },
  {
    group: 'Business Type',
    segments: [
      'Street Food Vendor',
      'HoReCa',
      'Hospitality',
      'Institutional',
      'Faith Organisation',
      'Non-Profit',
      'Reseller',
      'Events & Catering',
      'Corporate',
      'Bulk Buyer',
    ],
  },
  { group: 'Household', segments: ['Large Household', 'Small Household'] },
  {
    group: 'Life Stage',
    segments: [
      'Family Shopper',
      'Single Shopper',
      'Independent Shopper',
      'Gen Z',
      'Young Professional',
      'Established Family',
      'Mature Household',
      'Senior',
    ],
  },
  { group: 'Lifestyle', segments: ['Health-Focused', 'Value Seeker', 'Convenience Buyer'] },
  { group: 'Occupation', segments: ['Entrepreneur', 'Salaried Professional', 'Student', 'Retiree'] },
  { group: 'Dietary', segments: ['Halal Preference'] },
];

export const ALL_SEGMENTS: string[] = SEGMENT_TAXONOMY.flatMap((g) => g.segments);

export const SEGMENT_GROUP_OF: Record<string, string> = SEGMENT_TAXONOMY.reduce(
  (acc, g) => {
    g.segments.forEach((s) => {
      acc[s] = g.group;
    });
    return acc;
  },
  {} as Record<string, string>,
);

export function deriveSegments(c: Customer): string[] {
  const set = new Set<string>();

  set.add(c.type === CustomerType.B2B ? 'B2B Account' : 'B2C Consumer');

  if (c.totalOrders <= 0) set.add('Prospect');
  else if (c.totalOrders === 1) set.add('First-Time Buyer');
  else if (c.totalOrders <= 4) set.add('Repeat Buyer');
  else set.add('Loyal');

  if (c.totalSpent >= 1_000_000) set.add('VIP / Key Account');
  else if (c.totalSpent >= 500_000) set.add('High Value');
  else if (c.totalSpent >= 100_000) set.add('Mid Value');
  else if (c.totalSpent > 0) set.add('Low Value');

  if (c.type === CustomerType.B2B && c.businessCategory) {
    (B2B_CATEGORY_SEGMENTS[c.businessCategory] || []).forEach((s) => set.add(s));
  }

  if (c.type === CustomerType.B2C) {
    if (c.familyType === 'Extended' || c.familyType === 'Polygamy') set.add('Large Household');
    else if (c.familyType === 'Nuclear' || c.familyType === 'Monogamy') set.add('Small Household');

    if (c.maritalStatus === 'Married') set.add('Family Shopper');
    else if (c.maritalStatus === 'Single') set.add('Single Shopper');
    else if (c.maritalStatus === 'Widowed' || c.maritalStatus === 'Divorced') {
      set.add('Independent Shopper');
    }

    if (c.ageGroup && AGE_SEGMENTS[c.ageGroup]) set.add(AGE_SEGMENTS[c.ageGroup]);

    if (
      ['Health-Conscious', 'Fitness-Oriented', 'Organic Preference', 'Diet-Restricted'].includes(
        c.lifestyle || '',
      )
    ) {
      set.add('Health-Focused');
    }
    if (c.lifestyle === 'Budget-Conscious') set.add('Value Seeker');
    if (c.lifestyle === 'Convenience-Seeker') set.add('Convenience Buyer');

    if (c.employmentStatus === 'Self-Employed' || c.employmentStatus === 'Business Owner') {
      set.add('Entrepreneur');
    } else if (
      c.employmentStatus === 'Privately Employed' ||
      c.employmentStatus === 'Civil Servant'
    ) {
      set.add('Salaried Professional');
    } else if (c.employmentStatus === 'Student') set.add('Student');
    else if (c.employmentStatus === 'Retired') set.add('Retiree');

    if (c.religion === 'Muslim') set.add('Halal Preference');
  }

  return ALL_SEGMENTS.filter((s) => set.has(s));
}
