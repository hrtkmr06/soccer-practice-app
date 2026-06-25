import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Check, Pencil, Plus, RotateCcw, Search, Trash2, Users, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RawPlayer {
  id: string;
  name: string;
  number: number;
  team: string;
  original_team?: string;
  originalTeam?: string;
}

interface Player {
  id: string;
  name: string;
  number: number;
  defaultTeam: string;
}

interface Props {
  date: string;
}

const CATEGORIES = ['Aチーム', 'Bチーム', 'Cチーム', '一年生', '欠席'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_BADGE: Record<Category, string> = {
  'Aチーム': 'bg-slate-900 text-white',
  'Bチーム': 'bg-green-600 text-white',
  'Cチーム': 'bg-teal-600 text-white',
  '一年生': 'bg-amber-500 text-white',
  '欠席': 'bg-slate-400 text-white',
};

function storageKey(date: string) {
  return `practice-category-assignment:${date}`;
}

function DroppableCategory({
  category,
  count,
  onClear,
  children,
}: {
  category: Category;
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `category-${category}` });

  return (
    <section
      ref={setNodeRef}
      className={`bg-white border rounded-xl overflow-hidden transition-colors w-full md:w-[280px] md:shrink-0 ${
        isOver ? 'border-green-400 bg-green-50/40' : 'border-slate-200'
      }`}
    >
      <header className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
        <span className={`px-2 py-1 rounded-md text-xs font-bold ${CATEGORY_BADGE[category]}`}>{category}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{count}名</span>
          <button
            onClick={onClear}
            className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            クリア
          </button>
        </div>
      </header>
      <div className="p-2.5 space-y-2.5 min-h-24">{children}</div>
    </section>
  );
}

function DraggablePlayerCard({
  player,
  category,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  player: Player;
  category: Category;
  selected: boolean;
  onToggleSelect: (playerId: string) => void;
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `player-${player.id}`,
    data: { playerId: player.id, from: category },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`border rounded-xl p-3 bg-slate-50 cursor-grab active:cursor-grabbing select-none touch-none transition-shadow ${
        isDragging ? 'opacity-0' : selected ? 'border-green-500 ring-2 ring-green-100' : 'border-slate-200 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span className={`w-6 h-6 rounded-full shrink-0 ${CATEGORY_BADGE[category]}`} />
        <span className="text-sm font-semibold text-slate-700 leading-tight break-words">{player.name}</span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleSelect(player.id); }}
            aria-label={selected ? '選択解除' : '選択'}
            className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
              selected
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-slate-400 border-slate-300 hover:text-slate-600 hover:border-slate-400'
            }`}
            title="選択"
          >
            {selected ? <Check className="w-3.5 h-3.5" /> : <span className="w-2 h-2 rounded-full bg-current" />}
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onEdit(player); }}
            className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="編集"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(player); }}
            className="p-1 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-500"
            title="削除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerCardOverlay({ player }: { player: Player }) {
  return (
    <div className="border border-green-400 ring-2 ring-green-200 rounded-xl p-3 bg-white shadow-lg select-none w-[260px] md:w-[280px]">
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-full shrink-0 bg-green-600" />
        <span className="text-sm font-semibold text-slate-700 break-words">{player.name}</span>
      </div>
    </div>
  );
}

export default function FreeformBoard({ date }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', category: 'Aチーム' as Category });
  const [bulkCategory, setBulkCategory] = useState<Category>('Aチーム');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { void fetchPlayers(); }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(date));
      setAssignments(raw ? JSON.parse(raw) : {});
    } catch {
      setAssignments({});
    }
  }, [date]);

  async function fetchPlayers() {
    setLoading(true);
    const { data } = await supabase.from('players').select('*').order('number');
    if (data) {
      const rows = data as RawPlayer[];
      setPlayers(rows.map((r) => ({
        id: r.id,
        name: r.name,
        number: r.number,
        defaultTeam: r.originalTeam ?? r.original_team ?? r.team,
      })));
    }
    setLoading(false);
  }

  function assignedCategory(player: Player): Category {
    const c = assignments[player.id];
    return (CATEGORIES.includes(c as Category) ? c : player.defaultTeam) as Category;
  }

  function saveAssignments(next: Record<string, string>) {
    setAssignments(next);
    localStorage.setItem(storageKey(date), JSON.stringify(next));
  }

  function normalizeName(name: string) {
    return name.trim().toLowerCase();
  }

  function validateName(name: string, currentId?: string): string | null {
    const trimmed = name.trim();
    if (!trimmed) return '選手名を入力してください';
    if (trimmed.length > 24) return '選手名は24文字以内にしてください';
    const dup = players.some(p => p.id !== currentId && normalizeName(p.name) === normalizeName(trimmed));
    if (dup) return '同じ選手名がすでに登録されています';
    return null;
  }

  function assign(playerId: string, category: Category) {
    const next = { ...assignments, [playerId]: category };
    saveAssignments(next);
  }

  function resetToday() {
    setAssignments({});
    localStorage.removeItem(storageKey(date));
  }

  async function addPlayer() {
    const name = addForm.name.trim();
    const error = validateName(name);
    if (error) {
      setFormError(error);
      return;
    }
    const nextNumber = players.reduce((max, p) => Math.max(max, p.number ?? 0), 0) + 1;

    const { data } = await supabase
      .from('players')
      .insert({
        name,
        number: nextNumber,
        team: addForm.category,
        original_team: addForm.category,
      })
      .select()
      .single();

    if (!data) return;
    const r = data as RawPlayer;
    setPlayers((prev) => [...prev, {
      id: r.id,
      name: r.name,
      number: r.number,
      defaultTeam: r.originalTeam ?? r.original_team ?? r.team,
    }].sort((a, b) => a.number - b.number));

    setAddForm({ name: '', category: 'Aチーム' });
    setShowAddForm(false);
    setFormError('');
  }

  function startEditPlayer(player: Player) {
    setEditingPlayer(player);
    setEditName(player.name);
    setFormError('');
  }

  async function saveEditPlayer() {
    if (!editingPlayer) return;
    const error = validateName(editName, editingPlayer.id);
    if (error) {
      setFormError(error);
      return;
    }
    await supabase.from('players').update({ name: editName.trim() }).eq('id', editingPlayer.id);
    setPlayers(prev => prev.map(p => p.id === editingPlayer.id ? { ...p, name: editName.trim() } : p));
    setEditingPlayer(null);
    setEditName('');
    setFormError('');
  }

  async function deletePlayer(player: Player) {
    await supabase.from('players').delete().eq('id', player.id);
    setPlayers(prev => prev.filter(p => p.id !== player.id));
    setSelectedPlayerIds(prev => prev.filter(id => id !== player.id));
    const next = { ...assignments };
    delete next[player.id];
    saveAssignments(next);
  }

  function toggleSelectPlayer(playerId: string) {
    setSelectedPlayerIds(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);
  }

  function clearSelection() {
    setSelectedPlayerIds([]);
  }

  function moveSelectedToCategory(category: Category) {
    if (selectedPlayerIds.length === 0) return;
    const next = { ...assignments };
    selectedPlayerIds.forEach(id => { next[id] = category; });
    saveAssignments(next);
    setSelectedPlayerIds([]);
  }

  function clearCategory(category: Category) {
    const next = { ...assignments };
    players.forEach((p) => {
      if (assignedCategory(p) === category) delete next[p.id];
    });
    saveAssignments(next);
  }

  function handleDragStart(event: DragStartEvent) {
    const playerId = event.active.data.current?.playerId as string | undefined;
    setActivePlayerId(playerId ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActivePlayerId(null);
    const { active, over } = event;
    if (!over) return;
    const playerId = active.data.current?.playerId as string | undefined;
    if (!playerId) return;
    const overId = String(over.id);
    if (!overId.startsWith('category-')) return;
    const next = overId.replace('category-', '') as Category;
    if (!CATEGORIES.includes(next)) return;
    assign(playerId, next);
  }

  const activePlayer = activePlayerId ? players.find((p) => p.id === activePlayerId) ?? null : null;

  const filtered = useMemo(
    () => players.filter((p) =>
      !search ||
      p.name.includes(search)
    ),
    [players, search]
  );

  const grouped = useMemo(() => {
    const g: Record<Category, Player[]> = { 'Aチーム': [], 'Bチーム': [], 'Cチーム': [], '一年生': [], '欠席': [] };
    filtered.forEach((p) => { g[assignedCategory(p)].push(p); });
    return g;
  }, [filtered, assignments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-sm font-bold text-slate-700">カテゴリー割り当て（D&D）</p>
              <p className="text-[11px] text-slate-500">{date} の所属をドラッグで変更</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700"
            >
              {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              選手追加
            </button>
            <button
              onClick={resetToday}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              今日の割り当てをリセット
            </button>
          </div>
        </div>

        <div className="mt-3 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="選手名で検索"
            className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value as Category)}
            className="flex-1 sm:flex-none px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => moveSelectedToCategory(bulkCategory)}
            disabled={selectedPlayerIds.length === 0}
            className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none"
          >
            選択中を一括で移動
          </button>
          <button
            onClick={clearSelection}
            disabled={selectedPlayerIds.length === 0}
            className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
          >
            選択解除
          </button>
          <span className="text-[11px] text-slate-400">選択: {selectedPlayerIds.length}名</span>
        </div>

        {showAddForm && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_140px_100px] gap-2">
            <input
              value={addForm.name}
              onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))}
              placeholder="選手名"
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <select
              value={addForm.category}
              onChange={(e) => setAddForm(f => ({ ...f, category: e.target.value as Category }))}
              className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={addPlayer}
              className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
            >
              追加
            </button>
          </div>
        )}
        {formError && (
          <p className="mt-2 text-xs text-rose-500 font-semibold">{formError}</p>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActivePlayerId(null)}>
          <div className="flex flex-col md:flex-row gap-3 md:min-w-max">
            {CATEGORIES.map((category) => (
              <DroppableCategory
                key={category}
                category={category}
                count={grouped[category].length}
                onClear={() => clearCategory(category)}
              >
                {grouped[category].length === 0 ? (
                  <p className="text-xs text-slate-300 px-2 py-4 text-center">ここにドロップ</p>
                ) : (
                  grouped[category].map((p) => (
                    <DraggablePlayerCard
                      key={p.id}
                      player={p}
                      category={category}
                      selected={selectedPlayerIds.includes(p.id)}
                      onToggleSelect={toggleSelectPlayer}
                      onEdit={startEditPlayer}
                      onDelete={deletePlayer}
                    />
                  ))
                )}
              </DroppableCategory>
            ))}
          </div>
          <DragOverlay>
            {activePlayer ? <PlayerCardOverlay player={activePlayer} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
      {editingPlayer && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setEditingPlayer(null)}>
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-sm p-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-slate-700">選手名を編集</h3>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-3 w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {formError && <p className="mt-2 text-xs text-rose-500 font-semibold">{formError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingPlayer(null)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={saveEditPlayer}
                className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
