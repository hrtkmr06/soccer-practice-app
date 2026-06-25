import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Edit2,
  Sun, Cloud, CloudRain, CloudSnow, ChevronDown, MessageSquare,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  PracticeSession, SessionBlock,
  TEAM_BADGE, TEAM_SECTION_COLOR, AREA_BADGE, getTagColor,
} from '../types';

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
          (blockData as SessionBlock[]).forEach((b: SessionBlock) => { (map[b.session_id] ??= []).push(b); });
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
    cells.push({ day, current: false, dateStr: new Date(current.year, current.month - 1, day).toISOString().slice(0, 10) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, dateStr: new Date(current.year, current.month, d).toISOString().slice(0, 10) });
  }
  while (cells.length < 42) {
    const d = cells.length - firstDay - daysInMonth + 1;
    cells.push({ day: d, current: false, dateStr: new Date(current.year, current.month + 1, d).toISOString().slice(0, 10) });
  }

  const todayStr = today.toISOString().slice(0, 10);
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
                <div key={wd} className={`py-2.5 text-center text-xs sm:text-sm font-bold border-b border-slate-200 ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-sky-500' : 'text-slate-400'}`}>
                  {wd}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {cells.map((cell, idx) => {
                const session = cell.current ? sessionByDate[cell.dateStr] : undefined;
                const blocks = session ? blocksMap[session.id] ?? [] : [];
                const isToday = cell.dateStr === todayStr;
                const dow = new Date(cell.dateStr).getDay();

                return (
                  <div
                    key={idx}
                    onClick={() => { if (cell.current && session) setSelected(session); }}
                    className={`min-h-[84px] sm:min-h-[110px] p-1.5 relative group transition-colors ${cell.current ? (session ? 'cursor-pointer hover:bg-green-50' : 'hover:bg-slate-50') : 'bg-slate-50 opacity-40 pointer-events-none'} ${isToday ? 'bg-green-50/70' : ''}`}
                  >
                    <div className={`text-xs sm:text-sm font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-green-600 text-white' : dow === 0 ? 'text-rose-500' : dow === 6 ? 'text-sky-500' : 'text-slate-700'}`}>
                      {cell.day}
                    </div>

                    {session && (
                      <div className="space-y-0.5">
                        {session.overall_theme && (
                          <div className="flex items-center gap-0.5 px-1 py-0.5 bg-green-100 text-green-800 rounded text-[10px] sm:text-[11px] font-semibold truncate">
                            <WeatherIcon w={session.weather} />
                            <span className="truncate ml-0.5">{session.overall_theme}</span>
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
                        {!session.overall_theme && blocks.length === 0 && (
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
        />
      )}
    </div>
  );
}

/* ── Session Detail Modal ── */

function SessionDetailModal({
  session, blocks, onClose, onEdit, onDelete,
}: {
  session: PracticeSession;
  blocks: SessionBlock[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

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

  // Group blocks by team, preserving order within teams by start_time
  const TEAM_ORDER = ['Aチーム', 'Bチーム', 'Cチーム', '一年生', '全体'];
  const blocksByTeam: Record<string, SessionBlock[]> = {};
  blocks.forEach(b => { (blocksByTeam[b.team] ??= []).push(b); });
  const teams = TEAM_ORDER.filter(t => blocksByTeam[t]?.length);
  // Add any teams not in TEAM_ORDER
  Object.keys(blocksByTeam).forEach(t => { if (!TEAM_ORDER.includes(t)) teams.push(t); });

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
              {session.overall_theme ?? '（テーマ未設定）'}
            </h3>
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
            teams.map(team => (
              <div key={team}>
                {/* Team header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TEAM_BADGE[team] ?? 'bg-slate-200 text-slate-700'}`}>
                    {team}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400">{blocksByTeam[team].length} メニュー</span>
                </div>

                {/* Blocks for this team */}
                <div className="space-y-2">
                  {blocksByTeam[team].map(block => {
                    const isOpen = expandedBlocks.has(block.id);
                    const menu = block.practice_menu;
                    const hasDetail = (menu?.rules || menu?.points || block.review);

                    return (
                      <div key={block.id} className={`rounded-xl border-l-4 border border-slate-200 bg-white overflow-hidden transition-shadow hover:shadow-sm ${TEAM_SECTION_COLOR[team] ? '' : ''}`}>
                        {/* Block row */}
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
                              {menu?.tags?.slice(0, 2).map(tag => (
                                <span key={tag} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getTagColor(tag)}`}>{tag}</span>
                              ))}
                            </div>
                          </div>
                          {hasDetail && (
                            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          )}
                        </button>

                        {/* Accordion content */}
                        {isOpen && hasDetail && (
                          <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3 bg-slate-50/50">
                            {menu?.rules && (
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ルール</div>
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{menu.rules}</p>
                              </div>
                            )}
                            {menu?.points && (
                              <div>
                                <div className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1">コーチングポイント</div>
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{menu.points}</p>
                              </div>
                            )}
                            {block.review && (
                              <div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                  <MessageSquare className="w-3 h-3" /> 総評
                                </div>
                                <p className="text-sm text-slate-600 italic leading-relaxed">「{block.review}」</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
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
