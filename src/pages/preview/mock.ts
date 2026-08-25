// Standalone preview page — mock data mirroring lib/store shapes for easy integration later.
// Integration: swap these types for `import type { Project, Client } from '../../lib/store'`.

export type ProjectStatus = 'editing' | 'review' | 'changes' | 'approved';

export interface VersionRow {
  v: string;
  date: string;
  status: ProjectStatus;
  open: number;
  resolved: number;
}

export interface MockClient {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  description?: string;
}

export interface MockProject {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  status: ProjectStatus;
  currentVersion: string;
  due: string;
  progress: number;
  versions: VersionRow[];
}

export interface Deliverable {
  id: string;
  title: string;
  kind: 'key-visual' | 'social' | 'video-frame' | 'billboard';
  ratio: string;
  gradient: string;
}

export interface CommentItem {
  id: string;
  shotId: string;
  author: string;
  role: string;
  time: string;
  textEn: string;
  textAr: string;
  resolved: boolean;
  pin?: { x: number; y: number };
}

const GRADS = [
  'linear-gradient(135deg,#1b1206 0%,#d9a44133 45%,#0a0a0a 100%)',
  'linear-gradient(160deg,#0d1b2e 0%,#4fa3e033 50%,#0a0a0a 100%)',
  'linear-gradient(145deg,#22101f 0%,#e06aa033 55%,#0a0a0a 100%)',
  'linear-gradient(150deg,#101f14 0%,#7bc96a2e 60%,#0a0a0a 100%)'
];

export const MOCK_CLIENT: MockClient = {
  id: 'cl-vodafone',
  name: 'Vodafone',
  domain: 'vodafone.com',
  industry: 'Telecom',
  description: 'Global telecom operator — Egyptian market campaigns.'
};

export const MOCK_PROJECT: MockProject = {
  id: 'prj-red-sea',
  name: 'Summer Campaign 2026',
  clientId: MOCK_CLIENT.id,
  clientName: MOCK_CLIENT.name,
  status: 'review',
  currentVersion: 'v3',
  due: '2026-09-02',
  progress: 72,
  versions: [
    { v: 'v1', date: '2026-08-05', status: 'changes', open: 6, resolved: 9 },
    { v: 'v2', date: '2026-08-14', status: 'changes', open: 3, resolved: 12 },
    { v: 'v3', date: '2026-08-22', status: 'review', open: 2, resolved: 15 }
  ]
};

export const MOCK_DELIVERABLES: Deliverable[] = [
  { id: 'd1', title: 'Hero Key Visual', kind: 'key-visual', ratio: '16 / 9', gradient: GRADS[0] },
  { id: 'd2', title: 'Instagram Square ×6', kind: 'social', ratio: '1 / 1', gradient: GRADS[1] },
  { id: 'd3', title: 'TVC End Frame', kind: 'video-frame', ratio: '16 / 9', gradient: GRADS[2] },
  { id: 'd4', title: 'Billboard 48-Sheet', kind: 'billboard', ratio: '4 / 3', gradient: GRADS[3] }
];

export const MOCK_COMMENTS: CommentItem[] = [
  {
    id: 'c1',
    shotId: 'd1',
    author: 'Sara Hassan',
    role: 'Brand Manager',
    time: '10:24',
    textEn: 'Logo lockup feels small on the hero — can we scale it up ~15%?',
    textAr: 'اللوجو صغير على الهيرو — ممكن نكبره حوالي 15%؟',
    resolved: false,
    pin: { x: 32, y: 28 }
  },
  {
    id: 'c2',
    shotId: 'd1',
    author: 'Omar Khaled',
    role: 'Art Director',
    time: '11:02',
    textEn: 'Updated gradient depth in v3, much closer to the reference now.',
    textAr: 'عدّلت عمق التدرج في v3، أقرب بكتير للريفرنس.',
    resolved: true,
    pin: { x: 68, y: 55 }
  },
  {
    id: 'c3',
    shotId: 'd1',
    author: 'Sara Hassan',
    role: 'Brand Manager',
    time: '13:47',
    textEn: 'Arabic tagline kerning needs a pass before we sign off.',
    textAr: 'المسافات في السطر العربي محتاجة مراجعة قبل الموافقة النهائية.',
    resolved: false,
    pin: { x: 55, y: 72 }
  }
];
