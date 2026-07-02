import { useMemo, useState } from 'react';
import { Search, X, Plus, BookOpen, Trash2, ChevronDown, Pencil, Check } from 'lucide-react';
import menusData from '../menus.json';
import { Menu, getTagColor } from '../types';

interface StockMenu extends Menu {
  categories: string[];
}

export default function MenuStockPage() {
  const [menus, setMenus] = useState<StockMenu[]>(() =>
    (menusData as Menu[]).map((m) => ({
      ...m,
      categories: m.category ? [m.category] : [],
    }))
  );
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editRule, setEditRule] = useState('');
  const [editPoint, setEditPoint] = useState('');
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [newEditCategory, setNewEditCategory] = useState('');
  const [customTabs, setCustomTabs] = useState<string[]>([]);
  const [newTabName, setNewTabName] = useState('');
  const [form, setForm] = useState({ title: '', description: '', duration: '15', categories: 'その他' });

  function submitForm() {
    if (!form.title.trim()) return;
    const duration = Number(form.duration);
    if (!Number.isFinite(duration) || duration <= 0) return;
    setMenus(prev => [
      {
        title: form.title.trim(),
        description: form.description.trim(),
        duration,
        category: splitCategories(form.categories)[0] ?? 'その他',
        categories: splitCategories(form.categories),
      },
      ...prev,
    ]);
    setForm({ title: '', description: '', duration: '15', categories: 'その他' });
    setShowForm(false);
  }

  function deleteMenu(index: number) {
    setMenus(prev => prev.filter((_, i) => i !== index));
  }

  function toggleExpanded(key: string) {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function startEdit(key: string, title: string, description: string, categories: string[]) {
    setEditTitle(title);
    const parsed = parseMenuDescription(description);
    setEditRule(parsed.rule);
    setEditPoint(parsed.point);
    setEditCategories(categories.length > 0 ? categories : ['その他']);
    setNewEditCategory('');
    setEditingKey(key);
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditTitle('');
    setEditRule('');
    setEditPoint('');
    setEditCategories([]);
    setNewEditCategory('');
  }

  function saveEdit(originalIndex: number) {
    const normalized = normalizeCategories(editCategories);
    setMenus(prev => prev.map((m, i) => (
      i === originalIndex
        ? {
            ...m,
            title: editTitle.trim() || m.title,
            description: buildDescription(editRule, editPoint),
            categories: normalized,
            category: normalized[0] ?? m.category,
          }
        : m
    )));
    cancelEdit();
  }

  function addTab() {
    const next = newTabName.trim();
    if (!next) return;
    setCustomTabs(prev => prev.includes(next) ? prev : [...prev, next]);
    setNewTabName('');
  }

  function deleteTab(tab: string) {
    setCustomTabs(prev => prev.filter(t => t !== tab));
    setMenus(prev => prev.map((m) => {
      if (!m.categories.includes(tab)) return m;
      const nextCats = normalizeCategories(m.categories.filter(c => c !== tab));
      return { ...m, categories: nextCats, category: nextCats[0] };
    }));
    setEditCategories(prev => normalizeCategories(prev.filter(c => c !== tab)));
    if (activeTag === tab) setActiveTag(null);
  }

  const allTags = useMemo(
    () => Array.from(new Set([...menus.flatMap(m => m.categories), ...customTabs])),
    [menus, customTabs]
  );

  const filtered = menus.filter(m => {
    const matchSearch = !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.description.includes(search) ||
      m.categories.some(c => c.includes(search));
    const matchTag = !activeTag || m.categories.includes(activeTag);
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
            placeholder="メニュー名・説明・カテゴリーで検索..."
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
        <div className="mt-3 space-y-2.5">
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="flex items-center gap-1.5 min-w-max">
              <button
                onClick={() => setActiveTag(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                  !activeTag ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                すべて ({menus.length})
              </button>
              {allTags.map(tag => (
                <div
                  key={tag}
                  className={`inline-flex items-center rounded-full overflow-hidden border transition-colors ${
                    activeTag === tag ? 'bg-green-600 border-green-600 text-white' : 'border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      activeTag === tag ? 'text-white' : `${getTagColor(tag)} hover:opacity-80`
                    }`}
                  >
                    {tag}
                  </button>
                  <button
                    onClick={() => deleteTab(tag)}
                    className={`px-2 py-1.5 ${
                      activeTag === tag
                        ? 'text-white/80 hover:bg-white/15'
                        : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'
                    }`}
                    title="タブを削除"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              placeholder="新しいタブ"
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
            <button
              onClick={addTab}
              className="px-3 py-2 text-sm font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 whitespace-nowrap"
            >
              追加
            </button>
          </div>
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
            <textarea placeholder="ルール・ポイント" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={1}
                placeholder="所要時間(分)"
                value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                placeholder="カテゴリー（カンマ区切り）"
                value={form.categories}
                onChange={e => setForm(f => ({ ...f, categories: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button onClick={submitForm}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors">
              保存
            </button>
          </div>
        </div>
      )}

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <BookOpen className="w-12 h-12 text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm font-semibold">メニューが見つかりません</p>
            <p className="text-xs text-slate-300 mt-1">`src/menus.json` か検索条件を確認してください</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((menu) => {
              const originalIndex = menus.indexOf(menu);
              const key = `menu-${originalIndex}-${menu.title}`;
              const isOpen = expandedKeys.has(key);
              const isEditing = editingKey === key;
              const parsed = parseMenuDescription(menu.description);
              return (
                <div
                  key={key}
                  className="bg-white border border-slate-200 rounded-xl hover:border-green-300 hover:shadow-sm transition-all group overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpanded(key)}
                    className="w-full p-4 text-left flex items-start justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm leading-snug">{menu.title}</div>
                      <p className="text-xs text-green-600 mt-1.5 font-medium">{menu.duration}分</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {menu.categories.map(cat => (
                          <span key={cat} className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${getTagColor(cat)}`}>{cat}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMenu(originalIndex); }}
                        className="p-1 rounded text-transparent group-hover:text-slate-300 hover:!text-rose-400 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-3">
                      <div className="flex justify-end">
                        {!isEditing ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); startEdit(key, menu.title, menu.description, menu.categories); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            編集
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); saveEdit(originalIndex); }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-green-600 text-white hover:bg-green-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                              保存
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                            >
                              キャンセル
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">タイトル</div>
                        {isEditing ? (
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          />
                        ) : (
                          <p className="text-sm text-slate-700 leading-relaxed">{menu.title}</p>
                        )}
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">ルール</div>
                        {isEditing ? (
                          <textarea
                            value={editRule}
                            onChange={(e) => setEditRule(e.target.value)}
                            rows={3}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-y bg-white"
                          />
                        ) : parsed.rule ? (
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{parsed.rule}</p>
                        ) : (
                          <p className="text-xs text-slate-400">未設定</p>
                        )}
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-green-500 tracking-widest mb-1">コーチングポイント</div>
                        {isEditing ? (
                          <textarea
                            value={editPoint}
                            onChange={(e) => setEditPoint(e.target.value)}
                            rows={3}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-y bg-white"
                          />
                        ) : parsed.point ? (
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{parsed.point}</p>
                        ) : (
                          <p className="text-xs text-slate-400">未設定</p>
                        )}
                      </div>

                      {isEditing && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">カテゴリー（タブ）</div>
                          <div className="flex flex-wrap gap-1.5">
                            {allTags.map((tag) => {
                              const selected = editCategories.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  onClick={() => setEditCategories(prev => selected ? prev.filter(t => t !== tag) : [...prev, tag])}
                                  className={`px-2 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                                    selected
                                      ? 'bg-green-600 border-green-600 text-white'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              value={newEditCategory}
                              onChange={(e) => setNewEditCategory(e.target.value)}
                              placeholder="新しいカテゴリを追加"
                              className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                            />
                            <button
                              onClick={() => {
                                const next = newEditCategory.trim();
                                if (!next) return;
                                setEditCategories(prev => prev.includes(next) ? prev : [...prev, next]);
                                setNewEditCategory('');
                              }}
                              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                            >
                              追加
                            </button>
                          </div>
                          <p className="mt-1 text-[10px] text-slate-400">複数選択できます</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function splitCategories(raw: string): string[] {
  const parsed = raw
    .split(/[,、]/)
    .map(v => v.trim())
    .filter(Boolean);
  return normalizeCategories(parsed);
}

function normalizeCategories(categories: string[]): string[] {
  const dedup = Array.from(new Set(categories.map(v => v.trim()).filter(Boolean)));
  return dedup.length > 0 ? dedup : ['その他'];
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

function buildDescription(rule: string, point: string): string {
  const r = rule.trim();
  const p = point.trim();
  if (!r && !p) return '';
  if (!p) return `【ルール】${r}`;
  if (!r) return `【ポイント】${p}`;
  return `【ルール】${r}\n【ポイント】${p}`;
}
