import type { TopicId } from './types';

export const TOPICS: Record<TopicId, { name: string; short: string }> = {
  constitutional: { name: 'Constitutional law', short: 'Constitutional' },
  civil: { name: 'Civil law', short: 'Civil' },
  criminal: { name: 'Criminal law', short: 'Criminal' },
  administrative: { name: 'Administrative law', short: 'Administrative' },
  'human-rights': { name: 'Human rights', short: 'Human rights' },
  labor: { name: 'Labor law', short: 'Labor' },
  family: { name: 'Family law', short: 'Family' },
  theory: { name: 'Legal theory', short: 'Legal theory' }
};

/** Topics offered as catalog filters, in display order. */
export const CATALOG_TOPICS: TopicId[] = ['constitutional', 'civil', 'criminal', 'administrative', 'human-rights'];

export const topicName = (t: TopicId | 'all') => (t === 'all' ? 'all topics' : TOPICS[t].name);
