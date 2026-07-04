export interface PracticeMenu {
  id: string;
  title: string;
  description?: string | null;
  duration?: number | null;
  category?: string | null;
  rules: string | null;
  points: string | null;
  tags: string[];
  created_at: string;
}

export interface PracticeMenuSeed {
  title: string;
  description: string;
  duration: number;
  category: string;
}

export interface Menu {
  title: string;
  description: string;
  duration: number;
  category: string;
}

export interface PracticeSession {
  id: string;
  date: string;
  overall_theme: string | null;
  weather: string | null;
  notes: string | null;
  event_type?: '練習' | 'トレーニングマッチ' | '公式戦' | null;
  opponent?: string | null;
  match_category?: string | null;
  competition?: string | null;
  venue?: string | null;
  kick_off?: string | null;
  created_at: string;
}

export interface GroundSlot {
  id: string;
  session_id: string;
  start_time: string;
  end_time: string;
  area: string;
  team: string;
  sort_order: number;
  created_at: string;
}

export interface SessionBlock {
  id: string;
  session_id: string;
  ground_slot_id: string | null;
  practice_menu_id: string | null;
  title: string;
  start_time: string;
  end_time: string;
  area: string;
  team: string;
  review: string | null;
  sort_order: number;
  created_at: string;
  practice_menu?: PracticeMenu;
}

export type Weather = '晴れ' | '曇り' | '雨' | '雪';

export const AREAS = ['全面', 'テニス側', '野球側', '綱端', 'センター'] as const;
export const TEAMS = ['Aチーム', 'Bチーム', 'Cチーム', '一年生', '全体'] as const;

export const WEATHER_OPTIONS: Weather[] = ['晴れ', '曇り', '雨', '雪'];

export const AREA_LEFT_BORDER: Record<string, string> = {
  '全面':    'border-l-violet-500',
  'テニス側': 'border-l-emerald-500',
  '野球側':  'border-l-sky-500',
  '綱端':    'border-l-amber-500',
  'センター': 'border-l-rose-500',
};

export const AREA_BADGE: Record<string, string> = {
  '全面':    'bg-violet-100 text-violet-700',
  'テニス側': 'bg-emerald-100 text-emerald-700',
  '野球側':  'bg-sky-100 text-sky-700',
  '綱端':    'bg-amber-100 text-amber-700',
  'センター': 'bg-rose-100 text-rose-700',
};

export const TEAM_BADGE: Record<string, string> = {
  'Aチーム': 'bg-[#0d2137] text-white',
  'Bチーム': 'bg-green-600 text-white',
  'Cチーム': 'bg-teal-600 text-white',
  '一年生':  'bg-amber-500 text-white',
  '全体':    'bg-slate-500 text-white',
};

export const TEAM_SECTION_COLOR: Record<string, string> = {
  'Aチーム': 'border-[#0d2137] bg-[#0d2137]/5',
  'Bチーム': 'border-green-500 bg-green-50',
  'Cチーム': 'border-teal-500 bg-teal-50',
  '一年生':  'border-amber-500 bg-amber-50',
  '全体':    'border-slate-400 bg-slate-50',
};

export const TAG_COLOR: Record<string, string> = {
  'W-UP':       'bg-yellow-100 text-yellow-700',
  'TR1':        'bg-blue-100 text-blue-700',
  'TR2':        'bg-indigo-100 text-indigo-700',
  'ゲーム':     'bg-green-100 text-green-700',
  'ミートスプリント': 'bg-orange-100 text-orange-700',
  'ビルドアップ': 'bg-teal-100 text-teal-700',
  'ポゼッション': 'bg-cyan-100 text-cyan-700',
  'トランジション': 'bg-rose-100 text-rose-700',
  '守備':       'bg-red-100 text-red-700',
  'フィニッシュ': 'bg-pink-100 text-pink-700',
  'セットプレー': 'bg-purple-100 text-purple-700',
  'ロンド':     'bg-cyan-100 text-cyan-700',
  'アジリティ': 'bg-orange-100 text-orange-700',
  'クロス':     'bg-pink-100 text-pink-700',
  'ライン':     'bg-red-100 text-red-700',
};

export function getTagColor(tag: string): string {
  return TAG_COLOR[tag] ?? 'bg-slate-100 text-slate-600';
}
