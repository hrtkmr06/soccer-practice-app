import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Edit2,
  Sun, Cloud, CloudRain, CloudSnow, ChevronDown, MessageSquare, Trophy, MapPin, Clock3,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  Menu, PracticeMenu, PracticeSession, SessionBlock,
  TEAM_BADGE, TEAM_SECTION_COLOR, AREA_BADGE, getTagColor,
} from '../types';
import menusData from '../menus.json';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function WeatherIcon({ w }: { w: string | null }) {
  const cls = 'w-3.5 h-3.5 shrink-0';
  if (w === '曇り') return <Cloud className={cls} />;
  if (w === '雨') return <CloudRain className={cls} />;
  if (w === '雪') return <CloudSnow className={cls} />;
  return <Sun className={cls} />;
}

interface Props {
  onEditSession: (date: string) => void;
}

export default function CalendarView({ onEditSession }: Props) {
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [blocksMap, setBlocksMap] = useState<Record<string, SessionBlock[]>>({});
  const [selected, setSelected] = useState<PracticeSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSessions(); }, [current]);

  async function fetchSessions() {
    setLoading(true);
    const startDate = new Date(current.year, current.month, 1).toISOString().slice(0, 10);
    const endDate = new Date(current.year, current.month + 1, 0).toISOString().slice(0, 10);

    const { data: sessionData } = await supabase
      .from('practice_sessions')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (sessionData) {
      const typedSessions = sessionData as PracticeSession[];
      setSessions(typedSessions);
      const ids = typedSessions.map((s: PracticeSession) => s.id);
      if (ids.length > 0) {
        const { data: blockData } = await supabase
          .from('session_blocks')
          .select('*, practice_menu:practice_menus(*)')
          .in('session_id', ids)
          .order('start_time');
        if (blockData) {
          const map: Record<string, SessionBlock[]> = {};
          const seededMenus = (menusData as Menu[]).map(toPracticeMenu);
          const menuByTitle = new Map(seededMenus.map(m => [m.title, m]));
          (blockData as SessionBlock[]).forEach((b: SessionBlock) => {
            const enriched: SessionBlock = {
              ...b,
              practice_menu: b.practice_menu ?? menuByTitle.get(b.title),
            };
            (map[b.session_id] ??= []).push(enriched);
          });
          setBlocksMap(map);
        }
      } else {
        setBlocksMap({});
      }
    }
    setLoading(false);
  }

  async function createSession(dateStr: string) {
    const { data } = await supabase
      .from('practice_sessions')
      .insert({ date: dateStr, weather: '晴れ' })
      .select()
      .single();
    if (data) onEditSession(dateStr);
  }

  async function deleteSession(id: string) {
    await supabase.from('practice_sessions').delete().eq('id', id);
    setSelected(null);
    fetchSessions();
  }

  const sessionByDate: Record<string, PracticeSession> = {};
  sessions.forEach(s => { sessionByDate[s.date] = s; });

  const firstDay = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
  const prevMonthDays = new Date(current.year, current.month, 0).getDate();

  const cells: { day: number; current: boolean; dateStr: string }[] = [];
  for (let i = 0; i < firstDay; i++) {
    const day = prevMonthDays - firstDay + 1 + i;
    cells.push({ day, current: false, dateStr: formatLocalDate(new Date(current.year, current.month - 1, day)) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, dateStr: formatLocalDate(new Date(current.year, current.month, d)) });
  }
  while (cells.length < 42) {
    const d = cells.length - firstDay - daysInMonth + 1;
    cells.push({ day: d, current: false, dateStr: formatLocalDate(new Date(current.year, current.month + 1, d)) });
  }

  const todayStr = formatLocalDate(today);
  const selectedBlocks = selected ? blocksMap[selected.id] ?? [] : [];

  return (
    <div className="flex flex-col h-full">
      {/* Month nav */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
        <button onClick={() => setCurrent(c => {
          const m = c.month === 0 ? 11 : c.month - 1;
          const y = c.month === 0 ? c.year - 1 : c.year;
          return { year: y, month: m };
        })} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h2 className="text-xl font-black text-slate-800">{current.year}年 {current.month + 1}月</h2>
        <button onClick={() => setCurrent(c => {
          const m = c.month === 11 ? 0 : c.month + 1;
          const y = c.month === 11 ? c.year + 1 : c.year;
          return { year: y, month: m };
        })} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-auto bg-slate-50 p-2 sm:p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-7">
              {WEEKDAYS.map((wd, i) => (
                <div key={wd} className={`py-2.5 text-center text-xs sm:text-sm font-bold border-b border-slate-200 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-400'}`}>
                  {wd}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {cells.map((cell, idx) => {
                const session = cell.current ? sessionByDate[cell.dateStr] : undefined;
                const blocks = session ? blocksMap[session.id] ?? [] : [];
                const isToday = cell.dateStr === todayStr;
                const dow = new Date(`${cell.dateStr}T00:00:00`).getDay();

                return (
                  <div
                    key={idx}
                    onClick={() => { if (cell.current && session) setSelected(session); }}
                    className={`min-h-[84px] sm:min-h-[110px] p-1.5 relative group transition-colors ${cell.current ? (session ? 'cursor-pointer hover:bg-green-50' : 'hover:bg-slate-50') : 'bg-slate-50 opacity-40 pointer-events-none'} ${isToday ? 'bg-green-50/70' : ''}`}
                  >
                    <div className={`text-xs sm:text-sm font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-green-600 text-white' : dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-slate-700'}`}>
                      {cell.day}
                    </div>

                    {session && (
                      <div className="space-y-0.5">
                        <div className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold truncate ${getEventBadgeClass(session)}`}>
                          <WeatherIcon w={session.weather} />
                          <span className="truncate ml-0.5">{session.event_type ?? '練習'}</span>
                          {session.opponent && <span className="truncate ml-1">vs {session.opponent}</span>}
                        </div>
                        {(session.venue || session.kick_off) && (
                          <div className="px-1 text-[10px] text-slate-400 truncate hidden sm:block">
                            {session.kick_off ? `${session.kick_off} ` : ''}{session.venue ?? ''}
                          </div>
                        )}
                        {blocks.slice(0, 2).map(b => (
                          <div key={b.id} className="px-1 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600 truncate hidden sm:block">
                            <span className="font-bold text-slate-400">{b.start_time}</span> {b.title}
                          </div>
                        ))}
                        {blocks.length > 2 && (
                          <div className="text-[10px] text-slate-400 hidden sm:block pl-1">+{blocks.length - 2} 件</div>
                        )}
                        {blocks.length === 0 && (
                          <div className="flex gap-0.5 pl-0.5"><div className="w-1.5 h-1.5 rounded-full bg-green-400" /></div>
                        )}
                      </div>
                    )}

                    {cell.current && !session && (
                      <button
                        onClick={e => { e.stopPropagation(); createSession(cell.dateStr); }}
                        className="absolute bottom-1 right-1 p-1 rounded-lg text-slate-300 hover:text-green-500 hover:bg-green-50 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <SessionDetailModal
          session={selected}
          blocks={selectedBlocks}
          onClose={() => setSelected(null)}
          onEdit={() => { setSelected(null); onEditSession(selected.date); }}
          onDelete={() => deleteSession(selected.id)}
          onUpdateBlockReview={async (blockId, review) => {
            await supabase.from('session_blocks').update({ review }).eq('id', blockId);
            setBlocksMap(prev => {
              const next: Record<string, SessionBlock[]> = {};
              Object.entries(prev).forEach(([sessionId, list]) => {
                next[sessionId] = list.map(b => b.id === blockId ? { ...b, review } : b);
              });
              return next;
            });
          }}
        />
      )}
    </div>
  );
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* ── Session Detail Modal ── */

function SessionDetailModal({
  session, blocks, onClose, onEdit, onDelete, onUpdateBlockReview,
}: {
  session: PracticeSession;
  blocks: SessionBlock[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateBlockReview: (blockId: string, review: string) => Promise<void>;
}) {
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [activeTeam, setActiveTeam] = useState<string>('');
  const [teamThemes, setTeamThemes] = useState<Record<string, string>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, string>>({});

  function toggleBlock(id: string) {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const dateLabel = new Date(session.date + 'T00:00:00').toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
  const isMatchDay = session.event_type === 'トレーニングマッチ' || session.event_type === '公式戦';
  const matchCategoryLabel = session.match_category ?? (session.event_type === '公式戦' ? '公式戦' : '練習試合');

  // Group blocks by team, preserving order within teams by start_time
  const TEAM_ORDER = ['Aチーム', 'Bチーム', 'Cチーム', '一年生', '全体'];
  const blocksByTeam: Record<string, SessionBlock[]> = {};
  blocks.forEach(b => { (blocksByTeam[b.team] ??= []).push(b); });
  const teams = TEAM_ORDER.filter(t => blocksByTeam[t]?.length);
  // Add any teams not in TEAM_ORDER
  Object.keys(blocksByTeam).forEach(t => { if (!TEAM_ORDER.includes(t)) teams.push(t); });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`practice-team-themes:${session.date}`);
      setTeamThemes(raw ? JSON.parse(raw) as Record<string, string> : {});
    } catch {
      setTeamThemes({});
    }
  }, [session.date]);

  useEffect(() => {
    if (teams.length === 0) {
      setActiveTeam('');
      return;
    }
    if (!activeTeam || !teams.includes(activeTeam)) {
      setActiveTeam(teams[0]);
    }
  }, [teams, activeTeam]);

  useEffect(() => {
    const next: Record<string, string> = {};
    blocks.forEach((b) => { next[b.id] = b.review ?? ''; });
    setReviewDrafts(next);
  }, [blocks]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              {session.weather === '曇り' ? <Cloud className="w-3.5 h-3.5" /> :
               session.weather === '雨' ? <CloudRain className="w-3.5 h-3.5" /> :
               session.weather === '雪' ? <CloudSnow className="w-3.5 h-3.5" /> :
               <Sun className="w-3.5 h-3.5" />}
              <span>{session.weather ?? '晴れ'}</span>
              <span>·</span>
              <span>{dateLabel}</span>
            </div>
            <h3 className="text-lg font-black text-slate-800 leading-tight">
              {session.event_type ?? '練習'}
              {session.opponent ? ` vs ${session.opponent}` : ''}
            </h3>
            {isMatchDay && (
              <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/70 p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-700 tracking-widest mb-2">
                  <Trophy className="w-3.5 h-3.5" />
                  試合詳細
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white border border-blue-100 px-2.5 py-2">
                    <div className="text-[10px] font-bold text-slate-400 mb-0.5">対戦相手</div>
                    <div className="text-sm font-semibold text-slate-700">{session.opponent || '未設定'}</div>
                  </div>
                  <div className="rounded-lg bg-white border border-blue-100 px-2.5 py-2">
                    <div className="text-[10px] font-bold text-slate-400 mb-0.5">カテゴリー</div>
                    <div className="text-sm font-semibold text-slate-700">{matchCategoryLabel}</div>
                  </div>
                  <div className="rounded-lg bg-white border border-blue-100 px-2.5 py-2">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mb-0.5">
                      <Clock3 className="w-3 h-3" />
                      時間
                    </div>
                    <div className="text-sm font-semibold text-slate-700">{session.kick_off || '未設定'}</div>
                  </div>
                  <div className="rounded-lg bg-white border border-blue-100 px-2.5 py-2">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mb-0.5">
                      <MapPin className="w-3 h-3" />
                      場所
                    </div>
                    <div className="text-sm font-semibold text-slate-700">{session.venue || '未設定'}</div>
                  </div>
                  {session.event_type === '公式戦' && (
                    <div className="sm:col-span-2 rounded-lg bg-white border border-blue-100 px-2.5 py-2">
                      <div className="text-[10px] font-bold text-slate-400 mb-0.5">大会名</div>
                      <div className="text-sm font-semibold text-slate-700">{session.competition || '未設定'}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {!isMatchDay && (session.match_category || session.competition || session.venue || session.kick_off) && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {session.match_category ? `${session.match_category} ` : ''}
                {session.competition ? `${session.competition} ` : ''}
                {session.kick_off ? `${session.kick_off} ` : ''}
                {session.venue ?? ''}
              </p>
            )}
            {session.notes && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{session.notes}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 shrink-0">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Team sections */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {blocks.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">練習ブロックが登録されていません</p>
          ) : (
            <>
              <div className="overflow-x-auto -mx-1 px-1">
                <div className="flex items-center gap-1 min-w-max">
                  {teams.map(team => {
                    const isActive = activeTeam === team;
                    return (
                      <button
                        key={team}
                        onClick={() => setActiveTeam(team)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                          isActive
                            ? 'bg-green-600 text-white'
                            : `${TEAM_BADGE[team] ?? 'bg-slate-100 text-slate-600'} hover:opacity-85`
                        }`}
                      >
                        {team} ({blocksByTeam[team].length})
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeTeam && (
                <div key={activeTeam}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TEAM_BADGE[activeTeam] ?? 'bg-slate-200 text-slate-700'}`}>
                      {activeTeam}
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400">{blocksByTeam[activeTeam].length} メニュー</span>
                  </div>

                  {teamThemes[activeTeam] && (
                    <div className="mb-2.5 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">{activeTeam} のテーマ</p>
                      <p className="text-sm text-green-800 leading-relaxed">{teamThemes[activeTeam]}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {blocksByTeam[activeTeam].map(block => {
                      const isOpen = expandedBlocks.has(block.id);
                      const menu = block.practice_menu;
                      const parsed = parseMenuDescription(menu?.description ?? menu?.rules ?? '');
                      const ruleText = parsed.rule || menu?.rules || '';
                      const pointText = parsed.point || (menu?.points && !/^\d+分$/.test(menu.points) ? menu.points : '');
                      const hasDetail = Boolean(ruleText || pointText || block.review);

                      return (
                        <div key={block.id} className={`rounded-xl border-l-4 border border-slate-200 bg-white overflow-hidden transition-shadow hover:shadow-sm ${TEAM_SECTION_COLOR[activeTeam] ? '' : ''}`}>
                          <button
                            onClick={() => hasDetail && toggleBlock(block.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            <div className="text-xs font-mono text-slate-400 w-20 shrink-0">
                              {block.start_time}–{block.end_time}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-800 text-sm">{block.title}</div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${AREA_BADGE[block.area] ?? 'bg-slate-100 text-slate-600'}`}>
                                  {block.area}
                                </span>
                                {menu?.category && (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getTagColor(menu.category)}`}>{menu.category}</span>
                                )}
                                {!menu?.category && menu?.tags?.slice(0, 2).map(tag => (
                                  <span key={tag} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getTagColor(tag)}`}>{tag}</span>
                                ))}
                              </div>
                            </div>
                            {hasDetail && (
                              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                            )}
                          </button>

                          {isOpen && hasDetail && (
                            <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3 bg-slate-50/50">
                              {ruleText && (
                                <div>
                                  <div className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">ルール</div>
                                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{ruleText}</p>
                                </div>
                              )}
                              {pointText && (
                                <div>
                                  <div className="text-[10px] font-bold text-green-500 tracking-widest mb-1">コーチングポイント</div>
                                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{pointText}</p>
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                  <MessageSquare className="w-3 h-3" /> 留意点
                                </div>
                                <textarea
                                  value={reviewDrafts[block.id] ?? ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setReviewDrafts(prev => ({ ...prev, [block.id]: value }));
                                  }}
                                  onBlur={() => {
                                    const draft = reviewDrafts[block.id] ?? '';
                                    if (draft === (block.review ?? '')) return;
                                    void onUpdateBlockReview(block.id, draft);
                                  }}
                                  rows={2}
                                  placeholder="この練習での留意点を記入..."
                                  className="w-full px-2.5 py-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none placeholder-slate-300"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            編集する
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl font-bold text-sm transition-colors"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

function getEventBadgeClass(session: PracticeSession): string {
  if (session.event_type === '公式戦') return 'bg-rose-100 text-rose-700';
  if (session.event_type === 'トレーニングマッチ') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-600';
}

function toPracticeMenu(menu: Menu, index: number): PracticeMenu {
  return {
    id: `json-menu-${index + 1}`,
    title: menu.title,
    description: menu.description,
    duration: menu.duration,
    category: menu.category,
    rules: menu.description,
    points: `${menu.duration}分`,
    tags: [menu.category],
    created_at: new Date(0).toISOString(),
  };
}

function parseMenuDescription(description: string): { rule: string; point: string } {
  const normalized = description.replace(/\r\n/g, '\n').trim();
  if (!normalized) return { rule: '', point: '' };

  const ruleMatch = normalized.match(/【ルール】([\s\S]*?)(?=\n?【(?:ポイント|コーチングポイント)】|$)/);
  const pointMatch = normalized.match(/【(?:ポイント|コーチングポイント)】([\s\S]*)$/);

  const rule = (ruleMatch?.[1] ?? '').trim();
  const point = (pointMatch?.[1] ?? '').trim();
  if (rule || point) return { rule, point };

  return { rule: normalized, point: '' };
}
