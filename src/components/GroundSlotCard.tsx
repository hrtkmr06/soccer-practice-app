import { useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ChevronDown, Trash2, MessageSquare, Edit3, Check } from 'lucide-react';
import { GroundSlot, SessionBlock, AREA_LEFT_BORDER, AREA_BADGE, TEAM_BADGE, TEAMS, AREAS, getTagColor } from '../types';

interface Props {
  slot: GroundSlot;
  blocks: SessionBlock[];
  onSlotDelete: (id: string) => void;
  onSlotUpdate: (id: string, updates: Partial<GroundSlot>) => void;
  onBlockDelete: (id: string) => void;
  onBlockUpdate: (id: string, updates: Partial<SessionBlock>) => void;
  onAddMenuTap?: (slotId: string) => void;
}

export default function GroundSlotCard({
  slot, blocks, onSlotDelete, onSlotUpdate, onBlockDelete, onBlockUpdate, onAddMenuTap,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: slot.id });
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [editingSlot, setEditingSlot] = useState(false);
  const [slotForm, setSlotForm] = useState({ start_time: slot.start_time, end_time: slot.end_time, area: slot.area, team: slot.team });

  function toggleBlock(id: string) {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function saveSlot() {
    onSlotUpdate(slot.id, slotForm);
    setEditingSlot(false);
  }

  const leftBorder = AREA_LEFT_BORDER[slot.area] ?? 'border-l-slate-300';

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-l-4 ${leftBorder} bg-white border border-slate-200 overflow-hidden transition-all duration-150
        ${isOver ? 'ring-2 ring-green-400 ring-offset-1 shadow-lg bg-green-50/30' : 'hover:shadow-sm'}
      `}
    >
      {/* Slot header */}
      {editingSlot ? (
        <div className="p-3 border-b border-slate-100 bg-slate-50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block mb-1">開始</label>
              <input type="time" value={slotForm.start_time} onChange={e => setSlotForm(f => ({ ...f, start_time: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block mb-1">終了</label>
              <input type="time" value={slotForm.end_time} onChange={e => setSlotForm(f => ({ ...f, end_time: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block mb-1">エリア</label>
              <select value={slotForm.area} onChange={e => setSlotForm(f => ({ ...f, area: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                {AREAS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block mb-1">チーム</label>
              <select value={slotForm.team} onChange={e => setSlotForm(f => ({ ...f, team: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                {TEAMS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveSlot}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors">
              <Check className="w-3.5 h-3.5" /> 保存
            </button>
            <button onClick={() => setEditingSlot(false)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors">
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 group/header">
          {/* Time */}
          <div className="text-sm font-black text-slate-700 font-mono tabular-nums">
            {slot.start_time}<span className="text-slate-400 font-normal">–</span>{slot.end_time}
          </div>
          {/* Area badge */}
          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${AREA_BADGE[slot.area] ?? 'bg-slate-100 text-slate-600'}`}>
            {slot.area}
          </span>
          {/* Team badge */}
          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${TEAM_BADGE[slot.team] ?? 'bg-slate-200 text-slate-700'}`}>
            {slot.team}
          </span>
          <div className="flex-1" />
          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
            <button onClick={() => setEditingSlot(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onSlotDelete(slot.id)}
              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Drop zone / blocks area */}
      <div className={`p-3 min-h-[72px] transition-colors ${isOver ? 'bg-green-50/50' : ''}`}>
        {blocks.length === 0 ? (
          <div className="space-y-2">
            <div className={`flex items-center justify-center h-14 rounded-lg border-2 border-dashed transition-colors text-xs font-medium
              ${isOver ? 'border-green-400 text-green-500 bg-green-50' : 'border-slate-200 text-slate-300'}`}>
              {isOver ? 'ここにドロップ' : '左のメニューをドラッグ＆ドロップ'}
            </div>
            {onAddMenuTap && (
              <button
                onClick={() => onAddMenuTap(slot.id)}
                className="w-full lg:hidden py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                タップしてメニュー追加
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {blocks.map(block => (
              <BlockInSlot
                key={block.id}
                block={block}
                slotId={slot.id}
                expanded={expandedBlocks.has(block.id)}
                onToggle={() => toggleBlock(block.id)}
                onUpdate={updates => onBlockUpdate(block.id, updates)}
                onDelete={() => onBlockDelete(block.id)}
              />
            ))}
            {/* Allow additional drops even when blocks exist */}
            {isOver && (
              <div className="flex items-center justify-center h-10 rounded-lg border-2 border-dashed border-green-400 text-green-500 text-xs font-medium bg-green-50">
                追加でドロップ
              </div>
            )}
            {onAddMenuTap && (
              <button
                onClick={() => onAddMenuTap(slot.id)}
                className="w-full lg:hidden py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                タップしてメニュー追加
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Block card inside a slot ── */
function BlockInSlot({
  block, slotId, expanded, onToggle, onUpdate, onDelete,
}: {
  block: SessionBlock;
  slotId: string;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<SessionBlock>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `block-${block.id}`,
    data: {
      type: 'block',
      blockId: block.id,
      fromSlotId: slotId,
    },
  });
  const menu = block.practice_menu;
  const parsed = parseMenuDescription(menu?.description ?? menu?.rules ?? '');
  const ruleText = parsed.rule || menu?.rules || '';
  const pointText = parsed.point || (menu?.points && !/^\d+分$/.test(menu.points) ? menu.points : '');

  return (
    <div
      ref={setNodeRef}
      className={`bg-slate-50 border border-slate-200 rounded-xl overflow-hidden transition-opacity ${
        isDragging ? 'opacity-40' : 'opacity-100'
      }`}
    >
      {/* Header row */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white transition-colors">
        <span
          {...listeners}
          {...attributes}
          onClick={e => e.stopPropagation()}
          className="w-2 h-8 rounded-full bg-slate-200 hover:bg-slate-300 shrink-0 cursor-grab active:cursor-grabbing"
          title="ドラッグして移動"
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 text-sm leading-snug">{block.title}</div>
          {menu?.tags?.length ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {menu.tags.slice(0, 3).map(tag => (
                <span key={tag} className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${getTagColor(tag)}`}>{tag}</span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {block.review && <MessageSquare className="w-3.5 h-3.5 text-slate-400" />}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-200 space-y-3 bg-white">
          {ruleText && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">ルール</div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{ruleText}</p>
            </div>
          )}
          {pointText && (
            <div>
              <div className="text-[10px] font-bold text-green-500 tracking-widest mb-1">コーチングポイント</div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{pointText}</p>
            </div>
          )}
          {/* Review textarea */}
          <div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              <MessageSquare className="w-3 h-3" /> 総評
            </div>
            <textarea
              placeholder="練習後の感想・気づきを記録..."
              value={block.review ?? ''}
              onChange={e => onUpdate({ review: e.target.value })}
              rows={2}
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none placeholder-slate-300 bg-slate-50"
            />
          </div>
          <button onClick={onDelete}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> 削除
          </button>
        </div>
      )}
    </div>
  );
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

export function BlockCardOverlay({ block }: { block: SessionBlock }) {
  return (
    <div className="bg-white border-2 border-green-400 rounded-xl px-3 py-2.5 shadow-2xl w-72 pointer-events-none rotate-1">
      <div className="font-semibold text-slate-800 text-sm leading-snug">{block.title}</div>
      {block.practice_menu?.tags?.length ? (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {block.practice_menu.tags.slice(0, 3).map(tag => (
            <span key={tag} className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${getTagColor(tag)}`}>{tag}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
