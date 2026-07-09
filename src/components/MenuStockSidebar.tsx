import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Search, X, Plus, BookOpen, GripVertical, Trash2, ChevronDown, Pencil, Check } from 'lucide-react';
import menusData from '../menus.json';
import { Menu, PracticeMenu, getTagColor } from '../types';

interface Props {
  menus: PracticeMenu[];
  search: string;
  onSearchChange: (s: string) => void;
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
  onAddMenu: (m: { title: string; description: string; duration: number; category: string }) => void;
  onUpdateMenu: (id: string, updates: Partial<PracticeMenu>) => void;
  onDeleteMenu: (id: string) => void;
  sidebarOpen: boolean;
  onSidebarClose: () => void;
}

export default function MenuStockSidebar({
  menus, search, onSearchChange, activeTag, onTagChange,
  onAddMenu, onUpdateMenu, onDeleteMenu, sidebarOpen, onSidebarClose,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', duration: '15', category: 'その他' });
  const jsonMenus = (menusData as Menu[]).map((m, index) => ({
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
  const sourceMenus = menus.length > 0 ? menus : jsonMenus;

  const allCategories = Array.from(new Set(sourceMenus.map(m => menuCategory(m))));

  const filtered = sourceMenus.filter(m => {
    const description = menuDescription(m);
    const category = menuCategory(m);
    const matchSearch = !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      description.includes(search) ||
      category.includes(search);
    const matchCategory = !activeTag || category === activeTag;
    return matchSearch && matchCategory;
  });

  function submitForm() {
    if (!form.title.trim()) return;
    const duration = Number(form.duration);
    if (!Number.isFinite(duration) || duration <= 0) return;
    onAddMenu({
      title: form.title.trim(),
      description: form.description.trim(),
      duration,
      category: form.category.trim() || 'その他',
    });
    setForm({ title: '', description: '', duration: '15', category: 'その他' });
    setShowForm(false);
  }

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onSidebarClose} />
      )}

      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto
        w-80 h-full min-h-0 lg:h-[100dvh] lg:max-h-[100dvh] flex flex-col bg-white border-r border-slate-200 overflow-hidden
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-green-600" />
            <span className="font-bold text-slate-800 text-sm">メニューストック</span>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{sourceMenus.length}</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setShowForm(v => !v)}
              className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
              title="新しいメニューを追加"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={onSidebarClose} className="p-1.5 rounded-lg hover:bg-slate-100 lg:hidden">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="メニューを検索..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {search && (
              <button onClick={() => onSearchChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="px-3 py-2 border-b border-slate-100 flex flex-wrap gap-1 shrink-0">
          <button
            onClick={() => onTagChange(null)}
            className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${!activeTag ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            すべて
          </button>
          {allCategories.map(category => (
            <button
              key={category}
              onClick={() => onTagChange(activeTag === category ? null : category)}
              className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${activeTag === category ? 'bg-green-600 text-white' : getTagColor(category) + ' hover:opacity-80'}`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Menu cards */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-3 space-y-2" onWheelCapture={(e) => e.stopPropagation()}>
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>メニューが見つかりません</p>
            </div>
          ) : (
            filtered.map(menu => (
              <DraggableMenuCard key={menu.id} menu={menu} onDelete={onDeleteMenu} onUpdate={onUpdateMenu} />
            ))
          )}
        </div>

        {/* New menu form */}
        {showForm && (
          <div className="border-t border-slate-200 p-3 bg-slate-50 space-y-2 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-slate-700">新しいメニューを追加</span>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <input placeholder="テーマ *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            <textarea placeholder="ルール・ポイント" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={1}
                placeholder="時間(分)"
                value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                placeholder="カテゴリー"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <p className="text-[11px] text-slate-400">保存先はこの画面の一時ストックです（JSON編集で恒久化）。</p>
            <button onClick={submitForm}
              className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors">
              保存
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

function menuDescription(menu: PracticeMenu): string {
  return menu.description ?? menu.rules ?? menu.points ?? '';
}

function menuCategory(menu: PracticeMenu): string {
  return menu.category ?? menu.tags[0] ?? '未分類';
}

function menuDuration(menu: PracticeMenu): number | null {
  if (typeof menu.duration === 'number' && Number.isFinite(menu.duration)) return menu.duration;
  if (menu.points) {
    const hit = menu.points.match(/(\d+)/);
    if (hit) return Number(hit[1]);
  }
  return null;
}

function parseMenuDescription(description: string): { rule: string; point: string } {
  const normalized = description.replace(/\r\n/g, '\n').trim();
  if (!normalized) return { rule: '', point: '' };
  const ruleMatch = normalized.match(/【ルール】([\s\S]*?)(?=\n?【(?:ポイント|コーチングポイント)】|$)/);
  const pointMatch = normalized.match(/【(?:ポイント|コーチングポイント)】([\s\S]*)$/);
  return {
    rule: (ruleMatch?.[1] ?? '').trim(),
    point: (pointMatch?.[1] ?? '').trim(),
  };
}

function buildDescription(rule: string, point: string): string {
  const r = rule.trim();
  const p = point.trim();
  if (!r && !p) return '';
  if (!p) return `【ルール】${r}`;
  if (!r) return `【ポイント】${p}`;
  return `【ルール】${r}\n【ポイント】${p}`;
}

/* ── Draggable menu card ── */
export function DraggableMenuCard({
  menu,
  onDelete,
  onUpdate,
}: {
  menu: PracticeMenu;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<PracticeMenu>) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `menu-${menu.id}`,
    data: {
      type: 'menu',
      menu,
    },
  });
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const category = menuCategory(menu);
  const duration = menuDuration(menu);
  const description = menuDescription(menu);
  const parsed = parseMenuDescription(description);
  const [editTitle, setEditTitle] = useState(menu.title);
  const [editRule, setEditRule] = useState(parsed.rule);
  const [editPoint, setEditPoint] = useState(parsed.point);
  const [editDuration, setEditDuration] = useState(String(duration ?? 15));
  const [editCategory, setEditCategory] = useState(category);

  function startEdit() {
    const latest = parseMenuDescription(menuDescription(menu));
    setEditTitle(menu.title);
    setEditRule(latest.rule);
    setEditPoint(latest.point);
    setEditDuration(String(menuDuration(menu) ?? 15));
    setEditCategory(menuCategory(menu));
    setEditing(true);
    setExpanded(true);
  }

  function saveEdit() {
    const nextDuration = Number(editDuration);
    onUpdate(menu.id, {
      title: editTitle.trim() || menu.title,
      description: buildDescription(editRule, editPoint),
      rules: buildDescription(editRule, editPoint),
      points: Number.isFinite(nextDuration) ? `${nextDuration}分` : menu.points,
      duration: Number.isFinite(nextDuration) ? nextDuration : menu.duration,
      category: editCategory.trim() || '未分類',
      tags: [editCategory.trim() || '未分類'],
    });
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      className={`bg-white border border-slate-200 rounded-xl p-3 transition-all group select-none
        ${isDragging ? 'opacity-30 shadow-lg scale-95' : 'hover:border-green-300 hover:shadow-sm cursor-grab active:cursor-grabbing'}
      `}
    >
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left flex items-start justify-between gap-2"
      >
        <div className="flex items-start gap-2 flex-1 min-w-0 select-none">
          <span
            {...listeners}
            {...attributes}
            onClick={e => e.stopPropagation()}
            className="inline-flex mt-0.5"
          >
            <GripVertical className="w-4 h-4 text-slate-300 shrink-0 group-hover:text-slate-400 cursor-grab active:cursor-grabbing" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-800 text-sm leading-snug">{menu.title}</div>
            {description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{description}</p>
            )}
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${getTagColor(category)}`}>
                {category}
              </span>
              {duration !== null && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                  {duration}分
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 pl-1">
          <button
            onPointerDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); startEdit(); }}
            className="p-1 rounded text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
            title="編集"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onPointerDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(menu.id); }}
            className="p-1 rounded text-transparent group-hover:text-slate-300 hover:!text-rose-400 hover:bg-rose-50 transition-colors"
            title="削除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-slate-200 space-y-2.5">
          {editing ? (
            <>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <div>
                <div className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">ルール</div>
                <textarea
                  value={editRule}
                  onChange={(e) => setEditRule(e.target.value)}
                  rows={3}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
                />
              </div>
              <div>
                <div className="text-[10px] font-bold text-green-500 tracking-widest mb-1">コーチングポイント</div>
                <textarea
                  value={editPoint}
                  onChange={(e) => setEditPoint(e.target.value)}
                  rows={3}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="所要時間(分)"
                />
                <input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="カテゴリー"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  保存
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </>
          ) : (
            <>
              {parsed.rule && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">ルール</div>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{parsed.rule}</p>
                </div>
              )}
              {parsed.point && (
                <div>
                  <div className="text-[10px] font-bold text-green-500 tracking-widest mb-1">コーチングポイント</div>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{parsed.point}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Drag overlay card (shown while dragging) ── */
export function MenuCardOverlay({ menu }: { menu: PracticeMenu }) {
  const category = menuCategory(menu);
  const duration = menuDuration(menu);
  const description = menuDescription(menu);

  return (
    <div className="bg-white border-2 border-green-400 rounded-xl p-3 shadow-2xl w-72 pointer-events-none rotate-2">
      <div className="font-bold text-slate-800 text-sm">{menu.title}</div>
      {description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{description}</p>}
      <div className="flex items-center gap-1 mt-2">
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${getTagColor(category)}`}>{category}</span>
        {duration !== null && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">{duration}分</span>
        )}
      </div>
    </div>
  );
}
