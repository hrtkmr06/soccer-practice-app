import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Search, X, Plus, BookOpen, GripVertical, Trash2 } from 'lucide-react';
import { PracticeMenu, getTagColor } from '../types';

interface Props {
  menus: PracticeMenu[];
  search: string;
  onSearchChange: (s: string) => void;
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
  onAddMenu: (m: { title: string; rules: string; points: string; tags: string[] }) => void;
  onDeleteMenu: (id: string) => void;
  sidebarOpen: boolean;
  onSidebarClose: () => void;
}

export default function MenuStockSidebar({
  menus, search, onSearchChange, activeTag, onTagChange,
  onAddMenu, onDeleteMenu, sidebarOpen, onSidebarClose,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', rules: '', points: '', tags: '' });

  const allTags = Array.from(new Set(menus.flatMap(m => m.tags)));

  const filtered = menus.filter(m => {
    const matchSearch = !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.rules ?? '').includes(search) ||
      m.tags.some(t => t.includes(search));
    const matchTag = !activeTag || m.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  function submitForm() {
    if (!form.title.trim()) return;
    const tags = form.tags.split(/[,、\s]+/).map(t => t.trim()).filter(Boolean);
    onAddMenu({ title: form.title, rules: form.rules, points: form.points, tags });
    setForm({ title: '', rules: '', points: '', tags: '' });
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
        w-80 flex flex-col bg-white border-r border-slate-200
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-green-600" />
            <span className="font-bold text-slate-800 text-sm">メニューストック</span>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{menus.length}</span>
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

        {/* Tags */}
        <div className="px-3 py-2 border-b border-slate-100 flex flex-wrap gap-1 shrink-0">
          <button
            onClick={() => onTagChange(null)}
            className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${!activeTag ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            すべて
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => onTagChange(activeTag === tag ? null : tag)}
              className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${activeTag === tag ? 'bg-green-600 text-white' : getTagColor(tag) + ' hover:opacity-80'}`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Menu cards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>メニューが見つかりません</p>
            </div>
          ) : (
            filtered.map(menu => (
              <DraggableMenuCard key={menu.id} menu={menu} onDelete={onDeleteMenu} />
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
            <textarea placeholder="ルール" value={form.rules} onChange={e => setForm(f => ({ ...f, rules: e.target.value }))}
              rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            <textarea placeholder="ポイント" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))}
              rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            <input placeholder="タグ（カンマ区切り）例: W-UP, TR1" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
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

/* ── Draggable menu card ── */
export function DraggableMenuCard({ menu, onDelete }: { menu: PracticeMenu; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `menu-${menu.id}`,
    data: menu,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-white border border-slate-200 rounded-xl p-3 transition-all group select-none
        ${isDragging ? 'opacity-30 shadow-lg scale-95' : 'hover:border-green-300 hover:shadow-sm cursor-grab active:cursor-grabbing'}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          {...listeners}
          {...attributes}
          className="flex items-start gap-2 flex-1 min-w-0"
        >
          <GripVertical className="w-4 h-4 text-slate-300 mt-0.5 shrink-0 group-hover:text-slate-400" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-800 text-sm leading-snug">{menu.title}</div>
            {menu.rules && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{menu.rules}</p>
            )}
            {menu.points && (
              <p className="text-xs text-green-600 mt-1 line-clamp-1 font-medium">▶ {menu.points}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(menu.id)}
          className="p-1 rounded text-transparent group-hover:text-slate-300 hover:!text-rose-400 hover:bg-rose-50 transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {menu.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {menu.tags.map(tag => (
            <span key={tag} className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${getTagColor(tag)}`}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Drag overlay card (shown while dragging) ── */
export function MenuCardOverlay({ menu }: { menu: PracticeMenu }) {
  return (
    <div className="bg-white border-2 border-green-400 rounded-xl p-3 shadow-2xl w-72 pointer-events-none rotate-2">
      <div className="font-bold text-slate-800 text-sm">{menu.title}</div>
      {menu.rules && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{menu.rules}</p>}
      {menu.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {menu.tags.map(tag => (
            <span key={tag} className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${getTagColor(tag)}`}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}
