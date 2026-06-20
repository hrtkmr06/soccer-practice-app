import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';

const TEAMS = ['Aチーム', 'Bチーム', 'Cチーム', '一年生'] as const;

interface Player {
  id: string;
  name: string;
  number: number;
  team: string;
  originalTeam: string;
  position_x: number;
  position_y: number;
}

const TEAM_COLORS: Record<string, { bg: string; ring: string; text: string; accent: string }> = {
  'Aチーム': { bg: 'bg-[#0d2137]', ring: 'ring-[#0d2137]/30', text: 'text-white', accent: 'bg-[#0d2137]/10' },
  'Bチーム': { bg: 'bg-green-600', ring: 'ring-green-600/30', text: 'text-white', accent: 'bg-green-50' },
  'Cチーム': { bg: 'bg-teal-600', ring: 'ring-teal-600/30', text: 'text-white', accent: 'bg-teal-50' },
  '一年生':  { bg: 'bg-amber-500', ring: 'ring-amber-500/30', text: 'text-white', accent: 'bg-amber-50' },
};

const TEAM_HEADER: Record<string, { bg: string; text: string }> = {
  'Aチーム': { bg: 'bg-[#0d2137]', text: 'text-white' },
  'Bチーム': { bg: 'bg-green-600', text: 'text-white' },
  'Cチーム': { bg: 'bg-teal-600', text: 'text-white' },
  '一年生':  { bg: 'bg-amber-500', text: 'text-white' },
};

// Area positions (top-left, top-right, bottom-left, bottom-right)
const AREA_CONFIG = [
  { team: 'Aチーム', x: 0, y: 0 },
  { team: 'Bチーム', x: 50, y: 0 },
  { team: 'Cチーム', x: 0, y: 50 },
  { team: '一年生',  x: 50, y: 50 },
] as const;

function PitchBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 680 1050" preserveAspectRatio="xMidYMid meet" fill="none" stroke="rgba(16,185,129,0.12)" strokeWidth="3">
      <rect x="30" y="30" width="620" height="990" />
      <line x1="30" y1="525" x2="650" y2="525" />
      <circle cx="340" cy="525" r="91" />
      <circle cx="340" cy="525" r="4" fill="rgba(16,185,129,0.12)" stroke="none" />
      <rect x="145" y="30" width="390" height="165" />
      <rect x="225" y="30" width="230" height="55" />
      <circle cx="340" cy="145" r="4" fill="rgba(16,185,129,0.12)" stroke="none" />
      <path d="M 275 195 A 91 91 0 0 0 405 195" />
      <rect x="145" y="855" width="390" height="165" />
      <rect x="225" y="995" width="230" height="55" />
      <circle cx="340" cy="905" r="4" fill="rgba(16,185,129,0.12)" stroke="none" />
      <path d="M 275 855 A 91 91 0 0 1 405 855" />
      <path d="M 30 45 A 15 15 0 0 0 45 30" />
      <path d="M 635 30 A 15 15 0 0 0 650 45" />
      <path d="M 30 1005 A 15 15 0 0 1 45 1020" />
      <path d="M 635 1020 A 15 15 0 0 1 650 1005" />
    </svg>
  );
}

function getTeamFromPosition(x: number, y: number): string {
  if (x < 50 && y < 50) return 'Aチーム';
  if (x >= 50 && y < 50) return 'Bチーム';
  if (x < 50 && y >= 50) return 'Cチーム';
  return '一年生';
}

export default function FreeformBoard() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [changedCount, setChangedCount] = useState(0);

  useEffect(() => { fetchPlayers(); }, []);

  useEffect(() => {
    const changed = players.filter(p => p.team !== p.originalTeam).length;
    setChangedCount(changed);
  }, [players]);

  async function fetchPlayers() {
    setLoading(true);
    const { data } = await supabase.from('players').select('*').order('number');
    if (data) {
      setPlayers(data as Player[]);
    }
    setLoading(false);
  }

  async function updatePlayer(playerId: string, updates: Partial<Player>) {
    await supabase.from('players').update(updates).eq('id', playerId);
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, ...updates } : p));
  }

  async function resetAll() {
    const updates = players.map(p => ({
      id: p.id,
      team: p.originalTeam,
      position_x: p.originalTeam === 'Aチーム' ? 15 + Math.random() * 30 : p.originalTeam === 'Bチーム' ? 65 + Math.random() * 25 : p.originalTeam === 'Cチーム' ? 15 + Math.random() * 30 : 65 + Math.random() * 25,
      position_y: p.originalTeam === 'Aチーム' || p.originalTeam === 'Bチーム' ? 15 + Math.random() * 70 : 55 + Math.random() * 35,
    }));
    for (const u of updates) {
      await supabase.from('players').update({ team: u.team, position_x: u.position_x, position_y: u.position_y }).eq('id', u.id);
    }
    setPlayers(prev => prev.map(p => {
      const u = updates.find(x => x.id === p.id);
      return u ? { ...p, team: u.team, position_x: u.position_x, position_y: u.position_y } : p;
    }));
  }

  function handleDragEnd(playerId: string, info: { point: { x: number; y: number } }) {
    setDraggingId(null);
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = info.point.x - rect.left;
    const y = info.point.y - rect.top;

    const xPct = Math.max(2, Math.min(98, (x / rect.width) * 100));
    const yPct = Math.max(2, Math.min(98, (y / rect.height) * 100));

    const newTeam = getTeamFromPosition(xPct, yPct);
    updatePlayer(playerId, { position_x: xPct, position_y: yPct, team: newTeam });
  }

  const playersByTeam = (team: string) => players.filter(p => p.team === team);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-green-600" />
          <span className="font-bold text-slate-800 text-sm">ホワイトボード</span>
          <span className="text-xs text-slate-400">選手を自由にドラッグして配置</span>
        </div>
        <div className="flex items-center gap-3">
          {changedCount > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
              {changedCount} 名変動
            </span>
          )}
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors"
            title="全選手を元の位置に戻す"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            リセット
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto p-4 bg-slate-100">
        <div
          ref={canvasRef}
          className="relative mx-auto"
          style={{
            width: 'min(100%, 1200px)',
            minWidth: '700px',
            aspectRatio: '1 / 1',
          }}
        >
          {/* 4 Quadrants */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {AREA_CONFIG.map(({ team }) => (
              <div
                key={team}
                className="relative border border-slate-200/60 overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #fafbfc 0%, #f0f4f8 100%)',
                }}
              >
                {/* Pitch markings */}
                <PitchBackground />

                {/* Team label */}
                <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm z-10 ${TEAM_HEADER[team]?.bg ?? 'bg-slate-500'} ${TEAM_HEADER[team]?.text ?? 'text-white'}`}>
                  {team}
                </div>

                {/* Player count */}
                <div className="absolute top-3 right-3 text-xs font-bold text-slate-300 z-10">
                  {playersByTeam(team).length} 名
                </div>

                {/* Team area subtle overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.03]"
                  style={{
                    background: team === 'Aチーム' ? '#0d2137' : team === 'Bチーム' ? '#16a34a' : team === 'Cチーム' ? '#0d9488' : '#f59e0b',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Grid lines */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-300/60" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300/60" />
          </div>

          {/* Players */}
          {players.map(player => {
            const colors = TEAM_COLORS[player.team] ?? TEAM_COLORS['Aチーム'];
            const isMoved = player.team !== player.originalTeam;
            const isDragging = draggingId === player.id;

            return (
              <motion.div
                key={player.id}
                drag
                dragMomentum={false}
                dragElastic={0.05}
                onDragStart={() => setDraggingId(player.id)}
                onDragEnd={(_, info) => handleDragEnd(player.id, info)}
                className="absolute z-20 cursor-grab active:cursor-grabbing select-none"
                style={{
                  left: `${player.position_x}%`,
                  top: `${player.position_y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                whileHover={{ scale: 1.15, zIndex: 30 }}
                whileTap={{ scale: 0.92 }}
                whileDrag={{ scale: 1.2, zIndex: 40, cursor: 'grabbing' }}
                animate={{
                  scale: isDragging ? 1.2 : 1,
                  zIndex: isDragging ? 40 : 20,
                  boxShadow: isDragging
                    ? '0 20px 40px rgba(0,0,0,0.25), 0 8px 16px rgba(0,0,0,0.15)'
                    : '0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <div className="flex flex-col items-center gap-0.5">
                  {/* Magnet circle */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black shadow-md ring-2 ring-offset-2 transition-colors ${colors.bg} ${colors.text} ${colors.ring}`}
                    style={{
                      backgroundColor: isMoved ? undefined : undefined,
                    }}
                  >
                    {player.number}
                  </div>
                  {/* Name */}
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap leading-tight shadow-sm ${isMoved ? 'bg-amber-100 text-amber-700' : 'bg-white/90 text-slate-700'}`}>
                    {player.name}
                  </span>
                  {/* Original team badge (if moved) */}
                  {isMoved && (
                    <span className="text-[9px] font-bold text-white bg-amber-500 px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                      {player.originalTeam}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
