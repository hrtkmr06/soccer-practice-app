import { useState, useEffect } from 'react';
import {
  DndContext, DragOverlay, DragStartEvent, DragEndEvent,
  PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { Sun, Cloud, CloudRain, CloudSnow, BookOpen, Settings2, LayoutGrid, ArrowLeft, Pointer, Grid3X3, X, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  PracticeMenu, PracticeSession, GroundSlot, SessionBlock,
  Menu, TEAMS, WEATHER_OPTIONS, Weather, TEAM_BADGE,
} from '../types';
import MenuStockSidebar, { MenuCardOverlay } from './MenuStockSidebar';
import GroundSlotCard, { BlockCardOverlay } from './GroundSlotCard';
import GroundAllocationModal from './GroundAllocationModal';
import FreeformBoard from './FreeformBoard';
import menusJson from '../menus.json';

function WeatherBtn({ w, current, onClick }: { w: Weather; current: string | null; onClick: () => void }) {
  const active = current === w;
  const icon =
    w === '曇り' ? <Cloud className="w-4 h-4" /> :
    w === '雨' ? <CloudRain className="w-4 h-4" /> :
    w === '雪' ? <CloudSnow className="w-4 h-4" /> :
    <Sun className="w-4 h-4" />;
  return (
    <button onClick={onClick} title={w}
      className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-white shadow text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}>
      {icon}
    </button>
  );
}

interface Props {
  initialDate?: string;
  onBack: () => void;
}

type MenuDragData = { type: 'menu'; menu: PracticeMenu };
type BlockDragData = { type: 'block'; blockId: string; fromSlotId: string };
type DragData = MenuDragData | BlockDragData;

export default function PracticeEditor({ initialDate, onBack }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [activeDate, setActiveDate] = useState(initialDate ?? today);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [groundSlots, setGroundSlots] = useState<GroundSlot[]>([]);
  const [slotBlocksMap, setSlotBlocksMap] = useState<Record<string, SessionBlock[]>>({});
  const [menus, setMenus] = useState<PracticeMenu[]>([]);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draggingMenu, setDraggingMenu] = useState<PracticeMenu | null>(null);
  const [draggingBlock, setDraggingBlock] = useState<SessionBlock | null>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [mobileMenuPickerSlotId, setMobileMenuPickerSlotId] = useState<string | null>(null);
  const [mobileMenuQuery, setMobileMenuQuery] = useState('');
  const [activeTeam, setActiveTeam] = useState<string>('Aチーム');
  const [subView, setSubView] = useState<'menu' | 'whiteboard'>('menu');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  useEffect(() => { fetchMenus(); }, []);
  useEffect(() => { fetchSession(); }, [activeDate, menus]);

  async function fetchMenus() {
    const seedMenus = (menusJson as Menu[]).map((m, index) => ({
      id: `json-menu-${index + 1}`,
      title: m.title,
      description: m.description,
      duration: m.duration,
      category: m.category,
      rules: m.description,
      points: `${m.duration}分`,
      tags: [m.category],
      created_at: new Date(0).toISOString(),
    }));
    setMenus(seedMenus);
  }

  async function fetchSession() {
    const { data: existing } = await supabase
      .from('practice_sessions').select('*').eq('date', activeDate).maybeSingle();

    const sess = existing ?? await (async () => {
      const { data } = await supabase
        .from('practice_sessions').insert({ date: activeDate, weather: '晴れ' }).select().single();
      return data;
    })();
    if (!sess) return;
    setSession(sess);

    const { data: slots } = await supabase
      .from('ground_slots').select('*').eq('session_id', sess.id).order('sort_order');
    const slotList: GroundSlot[] = slots ?? [];
    setGroundSlots(slotList);

    if (slotList.length > 0) {
      const teams = Array.from(new Set(slotList.map(s => s.team)));
      const preferred = TEAMS.find(t => teams.includes(t));
      if (preferred) setActiveTeam(preferred);
    }

    if (slotList.length > 0) {
      const { data: blocks } = await supabase
        .from('session_blocks')
        .select('*, practice_menu:practice_menus(*)')
        .eq('session_id', sess.id)
        .not('ground_slot_id', 'is', null)
        .order('sort_order');
      const map: Record<string, SessionBlock[]> = {};
      slotList.forEach(s => { map[s.id] = []; });
      const menuByTitle = new Map(menus.map(m => [m.title, m]));
      (blocks as SessionBlock[] ?? []).forEach((b: SessionBlock) => {
        if (!b.ground_slot_id) return;
        const enriched: SessionBlock = {
          ...b,
          practice_menu: b.practice_menu ?? menuByTitle.get(b.title),
        };
        (map[b.ground_slot_id] ??= []).push(enriched);
      });
      setSlotBlocksMap(map);
    } else {
      setSlotBlocksMap({});
    }
  }

  async function saveSession(updates: Partial<PracticeSession>) {
    if (!session) return;
    await supabase.from('practice_sessions').update(updates).eq('id', session.id);
    setSession(s => s ? { ...s, ...updates } : s);
  }

  async function handleAllocationConfirm(
    drafts: Omit<GroundSlot, 'id' | 'session_id' | 'created_at'>[],
  ) {
    if (!session) return;
    setShowAllocationModal(false);

    const existingSlots = groundSlots;
    const sigToId: Record<string, string> = {};
    existingSlots.forEach(s => {
      sigToId[`${s.start_time}|${s.end_time}|${s.area}|${s.team}`] = s.id;
    });

    const toDelete = existingSlots.filter(s => {
      const sig = `${s.start_time}|${s.end_time}|${s.area}|${s.team}`;
      return !drafts.some(d => `${d.start_time}|${d.end_time}|${d.area}|${d.team}` === sig);
    });
    const toKeep = existingSlots.filter(s => {
      const sig = `${s.start_time}|${s.end_time}|${s.area}|${s.team}`;
      return drafts.some(d => `${d.start_time}|${d.end_time}|${d.area}|${d.team}` === sig);
    });
    const toInsert = drafts.filter(d => {
      const sig = `${d.start_time}|${d.end_time}|${d.area}|${d.team}`;
      return !existingSlots.some(s => `${s.start_time}|${s.end_time}|${s.area}|${s.team}` === sig);
    });

    if (toDelete.length > 0) {
      const ids = toDelete.map(s => s.id);
      await supabase.from('session_blocks').delete().in('ground_slot_id', ids);
      await supabase.from('ground_slots').delete().in('id', ids);
    }

    let newSlots: GroundSlot[] = [];
    if (toInsert.length > 0) {
      const { data } = await supabase
        .from('ground_slots')
        .insert(toInsert.map(d => ({ ...d, session_id: session.id })))
        .select();
      newSlots = data ?? [];
    }

    for (const s of toKeep) {
      const idx = drafts.findIndex(d => `${d.start_time}|${d.end_time}|${d.area}|${d.team}` === `${s.start_time}|${s.end_time}|${s.area}|${s.team}`);
      if (idx !== -1 && s.sort_order !== idx) {
        await supabase.from('ground_slots').update({ sort_order: idx }).eq('id', s.id);
      }
    }

    const allSlots = [...toKeep.map((s, _) => {
      const idx = drafts.findIndex(d => `${d.start_time}|${d.end_time}|${d.area}|${d.team}` === `${s.start_time}|${s.end_time}|${s.area}|${s.team}`);
      return { ...s, sort_order: idx };
    }), ...newSlots].sort((a, b) => a.sort_order - b.sort_order);

    setGroundSlots(allSlots);

    const newMap: Record<string, SessionBlock[]> = {};
    toKeep.forEach(s => { newMap[s.id] = slotBlocksMap[s.id] ?? []; });
    newSlots.forEach(s => { newMap[s.id] = []; });
    setSlotBlocksMap(newMap);

    const teams = Array.from(new Set(allSlots.map(s => s.team)));
    const preferred = TEAMS.find(t => teams.includes(t));
    if (preferred) setActiveTeam(preferred);
  }

  async function deleteGroundSlot(slotId: string) {
    await supabase.from('session_blocks').delete().eq('ground_slot_id', slotId);
    await supabase.from('ground_slots').delete().eq('id', slotId);
    setGroundSlots(prev => prev.filter(s => s.id !== slotId));
    setSlotBlocksMap(prev => { const n = { ...prev }; delete n[slotId]; return n; });
  }

  async function updateGroundSlot(slotId: string, updates: Partial<GroundSlot>) {
    await supabase.from('ground_slots').update(updates).eq('id', slotId);
    setGroundSlots(prev => prev.map(s => s.id === slotId ? { ...s, ...updates } : s));
  }

  async function addMenuToSlot(menu: PracticeMenu, slotId: string) {
    if (!session) return;
    const slot = groundSlots.find(s => s.id === slotId);
    if (!slot) return;
    const existing = slotBlocksMap[slotId] ?? [];
    const { data } = await supabase
      .from('session_blocks')
      .insert({
        session_id: session.id,
        ground_slot_id: slotId,
        practice_menu_id: null,
        title: menu.title,
        start_time: slot.start_time,
        end_time: slot.end_time,
        area: slot.area,
        team: slot.team,
        sort_order: existing.length,
      })
      .select('*')
      .single();
    if (data) {
      setSlotBlocksMap(prev => ({
        ...prev,
        [slotId]: [...(prev[slotId] ?? []), { ...data, practice_menu: menu }],
      }));
    }
  }

  async function deleteBlock(blockId: string) {
    await supabase.from('session_blocks').delete().eq('id', blockId);
    setSlotBlocksMap(prev => {
      const n: Record<string, SessionBlock[]> = {};
      Object.entries(prev).forEach(([k, bs]) => { n[k] = bs.filter(b => b.id !== blockId); });
      return n;
    });
  }

  async function updateBlock(blockId: string, updates: Partial<SessionBlock>) {
    await supabase.from('session_blocks').update(updates).eq('id', blockId);
    setSlotBlocksMap(prev => {
      const n: Record<string, SessionBlock[]> = {};
      Object.entries(prev).forEach(([k, bs]) => { n[k] = bs.map(b => b.id === blockId ? { ...b, ...updates } : b); });
      return n;
    });
  }

  async function moveBlockToSlot(blockId: string, fromSlotId: string, toSlotId: string) {
    if (fromSlotId === toSlotId) return;
    const targetSlot = groundSlots.find(s => s.id === toSlotId);
    if (!targetSlot) return;

    const targetCount = (slotBlocksMap[toSlotId] ?? []).length;
    await supabase
      .from('session_blocks')
      .update({
        ground_slot_id: toSlotId,
        start_time: targetSlot.start_time,
        end_time: targetSlot.end_time,
        area: targetSlot.area,
        team: targetSlot.team,
        sort_order: targetCount,
      })
      .eq('id', blockId);

    setSlotBlocksMap(prev => {
      const fromBlocks = prev[fromSlotId] ?? [];
      const moving = fromBlocks.find(b => b.id === blockId);
      if (!moving) return prev;

      const nextFrom = fromBlocks.filter(b => b.id !== blockId);
      const movedBlock: SessionBlock = {
        ...moving,
        ground_slot_id: toSlotId,
        start_time: targetSlot.start_time,
        end_time: targetSlot.end_time,
        area: targetSlot.area,
        team: targetSlot.team,
        sort_order: targetCount,
      };

      return {
        ...prev,
        [fromSlotId]: nextFrom,
        [toSlotId]: [...(prev[toSlotId] ?? []), movedBlock],
      };
    });
  }

  async function addMenu(m: { title: string; description: string; duration: number; category: string }) {
    const next: PracticeMenu = {
      id: `local-menu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: m.title,
      description: m.description,
      duration: m.duration,
      category: m.category,
      rules: m.description,
      points: `${m.duration}分`,
      tags: [m.category],
      created_at: new Date().toISOString(),
    };
    setMenus(prev => [next, ...prev]);
  }

  async function deleteMenu(id: string) {
    setMenus(prev => prev.filter(m => m.id !== id));
  }

  function updateMenu(id: string, updates: Partial<PracticeMenu>) {
    setMenus(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current as DragData | undefined;
    if (!data) return;
    if (data.type === 'menu') {
      setDraggingMenu(data.menu);
      return;
    }
    const block = (slotBlocksMap[data.fromSlotId] ?? []).find(b => b.id === data.blockId) ?? null;
    setDraggingBlock(block);
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingMenu(null);
    setDraggingBlock(null);
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    let targetSlotId: string | null = null;

    if (groundSlots.some(s => s.id === overId)) {
      targetSlotId = overId;
    } else if (overId.startsWith('block-')) {
      const overBlockId = overId.replace(/^block-/, '');
      for (const [slotId, blocks] of Object.entries(slotBlocksMap)) {
        if (blocks.some(b => b.id === overBlockId)) {
          targetSlotId = slotId;
          break;
        }
      }
    }

    if (!targetSlotId) return;

    const data = active.data.current as DragData | undefined;
    if (!data) return;
    if (data.type === 'menu') {
      addMenuToSlot(data.menu, targetSlotId);
      return;
    }
    moveBlockToSlot(data.blockId, data.fromSlotId, targetSlotId);
  }

  const dateLabel = new Date(activeDate + 'T00:00:00').toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
  const dateLabelShort = new Date(activeDate + 'T00:00:00').toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  });

  const teamsWithSlots = TEAMS.filter(t => groundSlots.some(s => s.team === t));
  const tabs = teamsWithSlots.length > 0 ? teamsWithSlots : [];

  const slotsForActiveTeam = [...groundSlots]
    .filter(s => s.team === activeTeam)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const hasAnySlots = groundSlots.length > 0;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full overflow-hidden relative">

        {/* ── Left sidebar (only in menu view) ── */}
        {subView === 'menu' && (
          <MenuStockSidebar
            menus={menus}
            search={search}
            onSearchChange={setSearch}
            activeTag={activeTag}
            onTagChange={setActiveTag}
            onAddMenu={addMenu}
            onUpdateMenu={updateMenu}
            onDeleteMenu={deleteMenu}
            sidebarOpen={sidebarOpen}
            onSidebarClose={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Right main ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top bar: date, theme, weather ── */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="カレンダーに戻る"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          {subView === 'menu' && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors lg:hidden"
            >
              <BookOpen className="w-5 h-5 text-slate-600" />
            </button>
          )}

          <div className="flex-1 min-w-0 order-2 sm:order-none basis-full sm:basis-auto">
            <h2 className="font-black text-slate-800 text-sm leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
              <span className="hidden sm:inline">{dateLabel}</span>
              <span className="sm:hidden">{dateLabelShort}</span>
            </h2>
            <input
              type="text"
              placeholder="全体テーマを入力..."
              value={session?.overall_theme ?? ''}
              onChange={e => saveSession({ overall_theme: e.target.value })}
              className="mt-0.5 text-sm text-slate-500 bg-transparent border-none outline-none w-full placeholder-slate-300"
            />
          </div>

          <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-lg p-1 order-3 sm:order-none">
            {WEATHER_OPTIONS.map(w => (
              <WeatherBtn key={w} w={w} current={session?.weather ?? null} onClick={() => saveSession({ weather: w })} />
            ))}
          </div>

          <input
            type="date"
            value={activeDate}
            onChange={e => setActiveDate(e.target.value)}
            className="order-4 sm:order-none w-full sm:w-auto text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-600"
          />
        </div>

        {/* ── Sub tabs: メニュー作成 / ホワイトボード ── */}
        <div className="bg-white border-b border-slate-200 px-4 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSubView('menu')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                subView === 'menu'
                  ? 'border-green-600 text-green-700 bg-green-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Pointer className="w-3.5 h-3.5" />
              メニュー作成
            </button>
            <button
              onClick={() => setSubView('whiteboard')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                subView === 'whiteboard'
                  ? 'border-green-600 text-green-700 bg-green-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              カテゴリー割り当て
            </button>
          </div>
        </div>

        {/* ── Content area ── */}
        {subView === 'whiteboard' ? (
          <FreeformBoard date={activeDate} />
        ) : (
            <>
              {/* ── Ground allocation banner + team tabs ── */}
              <div className="bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">グラウンド割り</span>
                  {hasAnySlots ? (
                    <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                      {groundSlots.length} 枠設定済み
                    </span>
                  ) : (
                    <span className="text-xs text-amber-500 bg-amber-50 rounded-full px-2 py-0.5 font-semibold">
                      未設定
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowAllocationModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-lg transition-colors shadow-sm"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  {hasAnySlots ? '割り当てを変更' : '割り当てを設定'}
                </button>
              </div>

              {tabs.length > 0 && (
                <div className="flex items-end gap-0 px-4 overflow-x-auto">
                  {tabs.map(team => {
                    const slotCount = groundSlots.filter(s => s.team === team).length;
                    const isActive = activeTeam === team;
                    return (
                      <button
                        key={team}
                        onClick={() => setActiveTeam(team)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                          isActive
                            ? 'border-green-600 text-green-700 bg-green-50/50'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${TEAM_BADGE[team] ?? 'bg-slate-200 text-slate-700'}`}>
                          {team.charAt(0)}
                        </span>
                        {team}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {slotCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              </div>

              {/* ── Timeline for active team ── */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!hasAnySlots ? (
                <div className="flex flex-col items-center justify-center h-60 text-center px-8">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <LayoutGrid className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="font-black text-slate-500 text-base">グラウンド割りが未設定です</p>
                  <p className="text-sm text-slate-400 mt-1 mb-5">まずグラウンド割りを設定すると、チームごとの練習枠が自動生成されます</p>
                  <button
                    onClick={() => setShowAllocationModal(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-black rounded-xl transition-colors shadow-sm"
                  >
                    <Settings2 className="w-4 h-4" />
                    グラウンド割りを設定する
                  </button>
                </div>
              ) : tabs.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  チームが設定された枠がありません
                </div>
              ) : slotsForActiveTeam.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center px-8">
                  <p className="text-slate-400 text-sm font-semibold">{activeTeam} の枠はありません</p>
                  <p className="text-xs text-slate-300 mt-1">グラウンド割りの変更で追加できます</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700 font-medium">
                    <Pointer className="w-4 h-4 shrink-0" />
                    メニューストックや配置済みカードを、各枠にドラッグ＆ドロップしてください
                  </div>

                  {slotsForActiveTeam.map(slot => (
                    <GroundSlotCard
                      key={slot.id}
                      slot={slot}
                      blocks={slotBlocksMap[slot.id] ?? []}
                      onAddMenuTap={(slotId) => setMobileMenuPickerSlotId(slotId)}
                      onSlotDelete={deleteGroundSlot}
                      onSlotUpdate={updateGroundSlot}
                      onBlockDelete={deleteBlock}
                      onBlockUpdate={updateBlock}
                    />
                  ))}
                </>
              )}

              {hasAnySlots && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 mt-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">練習全体のメモ</label>
                  <textarea
                    placeholder="今日の全体的なポイントや気づきを記録..."
                    value={session?.notes ?? ''}
                    onChange={e => saveSession({ notes: e.target.value })}
                    rows={3}
                    className="w-full text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none placeholder-slate-300"
                  />
                </div>
              )}
              </div>
            </>
          )}
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {draggingMenu && <MenuCardOverlay menu={draggingMenu} />}
          {draggingBlock && <BlockCardOverlay block={draggingBlock} />}
        </DragOverlay>

        {/* Ground allocation modal */}
        {showAllocationModal && (
          <GroundAllocationModal
            existingSlots={groundSlots}
            onConfirm={handleAllocationConfirm}
            onClose={() => setShowAllocationModal(false)}
          />
        )}

        {mobileMenuPickerSlotId && (
          <div
            className="fixed inset-0 bg-black/40 z-[60] flex items-end lg:hidden"
            onClick={() => { setMobileMenuPickerSlotId(null); setMobileMenuQuery(''); }}
          >
            <div
              className="w-full max-h-[78vh] bg-white rounded-t-2xl border-t border-slate-200 flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">メニューを追加</p>
                <button
                  onClick={() => { setMobileMenuPickerSlotId(null); setMobileMenuQuery(''); }}
                  className="p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={mobileMenuQuery}
                    onChange={(e) => setMobileMenuQuery(e.target.value)}
                    placeholder="メニュー名で検索"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {menus
                  .filter(m => !mobileMenuQuery || m.title.includes(mobileMenuQuery))
                  .map(menu => (
                    <button
                      key={menu.id}
                      onClick={() => {
                        addMenuToSlot(menu, mobileMenuPickerSlotId);
                        setMobileMenuPickerSlotId(null);
                        setMobileMenuQuery('');
                      }}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100"
                    >
                      <p className="text-sm font-semibold text-slate-700">{menu.title}</p>
                      {menu.description && (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{menu.description}</p>
                      )}
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {menu.category && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-500">
                            {menu.category}
                          </span>
                        )}
                        {typeof menu.duration === 'number' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-500">
                            {menu.duration}分
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}
