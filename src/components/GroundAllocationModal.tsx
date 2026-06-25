import { useState } from 'react';
import { X, Plus, Check, Settings2, Minus } from 'lucide-react';
import { GroundSlot, AREAS, TEAMS, AREA_BADGE, TEAM_BADGE } from '../types';

// "全面" is the whole-field option; partial areas are the sub-areas
const FULL_AREA = '全面';
const TSUNA_AREA = '綱端';
const PARTIAL_AREAS = AREAS.filter(a => a !== '全面' && a !== 'センター');
const INCOMPATIBLE_WITH_FULL: string[] = PARTIAL_AREAS.filter(a => a !== TSUNA_AREA);
const GRID_AREAS = [FULL_AREA, ...PARTIAL_AREAS];
const TEAM_OPTIONS = TEAMS.filter(t => t !== '全体');

interface TimeRow {
  key: number;
  start_time: string;
  end_time: string;
  cells: Record<string, string[]>; // area → teams[]
}

interface Props {
  existingSlots: GroundSlot[];
  onConfirm: (drafts: Omit<GroundSlot, 'id' | 'session_id' | 'created_at'>[]) => void;
  onClose: () => void;
}

let keyCounter = 0;
function nextKey() { return ++keyCounter; }

function makeDefaultRow(): TimeRow {
  return { key: nextKey(), start_time: '14:00', end_time: '14:30', cells: {} };
}

function slotsToRows(slots: GroundSlot[]): TimeRow[] {
  const groups: Record<string, TimeRow> = {};
  slots.forEach(s => {
    const tk = `${s.start_time}|${s.end_time}`;
    if (!groups[tk]) {
      groups[tk] = { key: nextKey(), start_time: s.start_time, end_time: s.end_time, cells: {} };
    }
    const cur = groups[tk].cells[s.area] ?? [];
    if (!cur.includes(s.team)) groups[tk].cells[s.area] = [...cur, s.team];
  });
  return Object.values(groups).sort((a, b) => a.start_time.localeCompare(b.start_time));
}

export default function GroundAllocationModal({ existingSlots, onConfirm, onClose }: Props) {
  const [rows, setRows] = useState<TimeRow[]>(() =>
    existingSlots.length > 0 ? slotsToRows(existingSlots) : [makeDefaultRow()]
  );

  function addRow() {
    const last = rows[rows.length - 1];
    // Auto-advance time by 30 min
    let nextStart = last?.end_time ?? '14:30';
    let nextEnd = incrementTime(nextStart, 30);
    setRows(r => [...r, { key: nextKey(), start_time: nextStart, end_time: nextEnd, cells: {} }]);
  }

  function removeRow(key: number) {
    setRows(r => r.filter(row => row.key !== key));
  }

  function updateRowTime(key: number, field: 'start_time' | 'end_time', value: string) {
    setRows(r => r.map(row => row.key === key ? { ...row, [field]: value } : row));
  }

  function updateCell(key: number, area: string, team: string) {
    setRows(r => r.map(row => {
      if (row.key !== key) return row;
      const next: Record<string, string[]> = { ...row.cells };
      const current = next[area] ?? [];
      const isSelected = current.includes(team);

      // Toggle off
      if (isSelected) {
        next[area] = current.filter(t => t !== team);
        return { ...row, cells: next };
      }

      const fullTeams = next[FULL_AREA] ?? [];

      // Add into FULL: clear incompatible areas first
      if (area === FULL_AREA) {
        INCOMPATIBLE_WITH_FULL.forEach(a => { delete next[a]; });
        // 綱端 can coexist, but not with the same teams as FULL
        if (next[TSUNA_AREA]?.includes(team)) {
          next[TSUNA_AREA] = next[TSUNA_AREA].filter(t => t !== team);
        }
      }

      // Add into incompatible partial: clear FULL teams
      if (area !== FULL_AREA && INCOMPATIBLE_WITH_FULL.includes(area)) {
        delete next[FULL_AREA];
      }

      // 綱端 cannot take teams already selected on FULL
      if (area === TSUNA_AREA && fullTeams.includes(team)) return row;

      next[area] = [...(next[area] ?? []), team];
      return { ...row, cells: next };
    }));
  }

  function getEffectiveTeams(row: TimeRow, area: string): string[] {
    const fullTeams = row.cells[FULL_AREA] ?? [];
    if (fullTeams.length > 0 && INCOMPATIBLE_WITH_FULL.includes(area)) return [];
    if (area === TSUNA_AREA && fullTeams.length > 0) {
      return (row.cells[area] ?? []).filter(t => !fullTeams.includes(t));
    }
    return row.cells[area] ?? [];
  }

  function handleConfirm() {
    const drafts: Omit<GroundSlot, 'id' | 'session_id' | 'created_at'>[] = [];
    let sortIdx = 0;
    rows.forEach(row => {
      GRID_AREAS.forEach(area => {
        const teams = getEffectiveTeams(row, area);
        teams.forEach(team => {
          drafts.push({
            start_time: row.start_time,
            end_time: row.end_time,
            area,
            team,
            sort_order: sortIdx++,
          });
        });
      });
    });
    if (drafts.length === 0) return;
    onConfirm(drafts);
  }

  const filledCount = rows.reduce(
    (acc, row) => acc + GRID_AREAS.reduce((n, area) => n + getEffectiveTeams(row, area).length, 0),
    0
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-base">グラウンド割り設定</h2>
              <p className="text-xs text-slate-400">表の各マスにチームを割り当てて確定してください</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body: matrix grid */}
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest py-2 pr-2 w-10" />
                  <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest py-2 px-1 w-24">開始</th>
                  <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest py-2 px-1 w-24">終了</th>
                  {GRID_AREAS.map(area => (
                    <th key={area} className="py-2 px-1 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${AREA_BADGE[area]}`}>
                        {area}
                      </span>
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.key} className="group">
                    {/* Row number indicator */}
                    <td className="py-1.5 pr-1">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {rows.indexOf(row) + 1}
                      </div>
                    </td>
                    {/* Time inputs */}
                    <td className="py-1.5 px-1">
                      <input
                        type="time"
                        value={row.start_time}
                        onChange={e => updateRowTime(row.key, 'start_time', e.target.value)}
                        className="w-full px-1.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 tabular-nums"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="time"
                        value={row.end_time}
                        onChange={e => updateRowTime(row.key, 'end_time', e.target.value)}
                        className="w-full px-1.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 tabular-nums"
                      />
                    </td>
                    {/* Area cells */}
                    {GRID_AREAS.map(area => {
                      const fullTeams = row.cells[FULL_AREA] ?? [];
                      const hasFull = fullTeams.length > 0;
                      const hasIncompatiblePartial = INCOMPATIBLE_WITH_FULL.some(a => (row.cells[a] ?? []).length > 0);
                      const teams = getEffectiveTeams(row, area);
                      // Exclusion:
                      //  - "全面" selected -> テニス側/野球側 disabled, 綱端 remains enabled
                      //  - テニス側/野球側 selected -> "全面" disabled
                      const areaDisabled = area === FULL_AREA
                        ? hasIncompatiblePartial
                        : hasFull && INCOMPATIBLE_WITH_FULL.includes(area);

                      return (
                        <td key={area} className="py-1.5 px-1 align-top">
                          <div className={`w-full min-h-[64px] border rounded-lg p-1 ${
                            areaDisabled ? 'bg-slate-100 border-slate-100 opacity-50' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="grid grid-cols-2 gap-1">
                              {TEAM_OPTIONS.map(t => {
                                const selected = teams.includes(t);
                                const disabled =
                                  areaDisabled ||
                                  (area === TSUNA_AREA && fullTeams.includes(t) && !selected);
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => updateCell(row.key, area, t)}
                                    className={`px-1 py-1 rounded text-[10px] font-bold border transition-colors ${
                                      selected
                                        ? `${TEAM_BADGE[t] ?? 'bg-slate-200 text-slate-700'} border-transparent`
                                        : disabled
                                          ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {t.replace('チーム', '')}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    {/* Delete row */}
                    <td className="py-1.5 px-0.5">
                      <button
                        onClick={() => removeRow(row.key)}
                        disabled={rows.length <= 1}
                        className="p-1 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add row button */}
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 mt-3 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> 時間帯を追加
            </button>
          </div>

          {/* Preview */}
          {filledCount > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                確定後の練習枠プレビュー ({filledCount} 枠)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TEAM_OPTIONS.map(team => {
                  const teamSlots = rows.flatMap(row =>
                    GRID_AREAS.filter(a => getEffectiveTeams(row, a).includes(team))
                      .map(a => ({ start: row.start_time, end: row.end_time, area: a }))
                  );
                  if (teamSlots.length === 0) return null;
                  return (
                    <div key={team} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-3 py-2 flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${TEAM_BADGE[team] ?? 'bg-slate-200 text-slate-700'}`}>
                          {team}
                        </span>
                        <span className="text-xs text-slate-500">{teamSlots.length} 枠</span>
                      </div>
                      <div className="px-3 pb-3 space-y-1.5">
                        {teamSlots.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-slate-600 bg-white rounded-lg px-2.5 py-2 border border-slate-200">
                            <span className="font-mono font-bold text-slate-700 tabular-nums">{s.start}–{s.end}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${AREA_BADGE[s.area] ?? 'bg-slate-100 text-slate-600'}`}>{s.area}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 bg-slate-50">
          <p className="text-xs text-slate-400">
            {filledCount > 0 ? `${filledCount} 枠を設定中` : 'マス目にチームを選択してください'}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-sm font-bold rounded-xl transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={filledCount === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-black rounded-xl transition-colors shadow-sm"
            >
              <Check className="w-4 h-4" />
              確定して枠を生成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function incrementTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}
