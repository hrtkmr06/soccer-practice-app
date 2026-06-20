import { useState, useEffect } from 'react';
import { Search, X, Plus, BookOpen, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PracticeMenu, getTagColor } from '../types';

export default function MenuStockPage() {
  const [menus, setMenus] = useState<PracticeMenu[]>([]);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', rules: '', points: '', tags: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMenus(); }, []);

  async function fetchMenus() {
    setLoading(true);
    const { data } = await supabase.from('practice_menus').select('*').order('created_at', { ascending: false });
    if (data) setMenus(data);
    setLoading(false);
  }

  async function addMenu(m: { title: string; rules: string; points: string; tags: string[] }) {
    const { data } = await supabase.from('practice_menus').insert(m).select().single();
    if (data) setMenus(prev => [data, ...prev]);
  }

  async function deleteMenu(id: string) {
    await supabase.from('practice_menus').delete().eq('id', id);
    setMenus(prev => prev.filter(m => m.id !== id));
  }

  function submitForm() {
    if (!form.title.trim()) return;
    const tags = form.tags.split(/[,、\s]+/).map(t => t.trim()).filter(Boolean);
    addMenu({ title: form.title, rules: form.rules, points: form.points, tags });
    setForm({ title: '', rules: '', points: '', tags: '' });
    setShowForm(false);
  }

  const allTags = Array.from(new Set(menus.flatMap(m => m.tags)));

  const filtered = menus.filter(m => {
    const matchSearch = !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.rules ?? '').includes(search) ||
      m.tags.some(t => t.includes(search));
    const matchTag = !activeTag || m.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="font-black text-slate-800 text-lg">練習メニューストック</h1>
              <p className="text-xs text-slate-400">過去の練習メニューを一覧管理・検索・新規登録</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">新規メニュー</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="メニュー名・ルール・タグで検索..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <button
            onClick={() => setActiveTag(null)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${!activeTag ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            すべて ({menus.length})
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${activeTag === tag ? 'bg-green-600 text-white' : getTagColor(tag) + ' hover:opacity-80'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* New menu form */}
      {showForm && (
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shrink-0">
          <div className="max-w-lg mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">新しいメニューを追加</span>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <input placeholder="テーマ *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            <textarea placeholder="ルール" value={form.rules} onChange={e => setForm(f => ({ ...f, rules: e.target.value }))}
              rows={3} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            <textarea placeholder="コーチングポイント" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))}
              rows={2} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            <input placeholder="タグ（カンマ区切り）例: W-UP, TR1" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            <button onClick={submitForm}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors">
              保存
            </button>
          </div>
        </div>
      )}

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <BookOpen className="w-12 h-12 text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm font-semibold">メニューが見つかりません</p>
            <p className="text-xs text-slate-300 mt-1">検索条件を変えるか、新規メニューを追加してください</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(menu => (
              <div
                key={menu.id}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-green-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-sm leading-snug">{menu.title}</div>
                    {menu.rules && (
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-3 leading-relaxed">{menu.rules}</p>
                    )}
                    {menu.points && (
                      <p className="text-xs text-green-600 mt-1.5 line-clamp-2 font-medium">▶ {menu.points}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMenu(menu.id)}
                    className="p-1 rounded text-transparent group-hover:text-slate-300 hover:!text-rose-400 hover:bg-rose-50 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {menu.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {menu.tags.map(tag => (
                      <span key={tag} className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${getTagColor(tag)}`}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
