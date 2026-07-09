import { createClient } from '@supabase/supabase-js';
import type { GroundSlot, PracticeMenu, PracticeSession, SessionBlock } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);
export const isLocalMode = !hasSupabaseEnv;

interface PlayerRow {
  id: string;
  name: string;
  number: number;
  team: string;
  original_team: string;
  position_x: number;
  position_y: number;
  created_at: string;
}

type SessionBlockRow = Omit<SessionBlock, 'practice_menu'>;

type LocalDb = {
  practice_menus: PracticeMenu[];
  practice_sessions: PracticeSession[];
  ground_slots: GroundSlot[];
  session_blocks: SessionBlockRow[];
  players: PlayerRow[];
};

type TableName = keyof LocalDb;
type FilterOp = 'eq' | 'in' | 'gte' | 'lte' | 'not';
type Filter = { op: FilterOp; column: string; value: unknown; value2?: unknown };

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function makeLocalDb(): LocalDb {
  const menus: PracticeMenu[] = [
    { id: uuid(), title: 'ビルドアップ（3対2）', rules: '数的優位で前進。', points: '角度と体の向き。', tags: ['ビルドアップ', 'TR1'], created_at: nowIso() },
    { id: uuid(), title: 'ポゼッション（4対2）', rules: '10m四方でロンド。', points: 'テンポとサポート。', tags: ['W-UP', 'ポゼッション'], created_at: nowIso() },
    { id: uuid(), title: 'ゲーム形式（8対8）', rules: 'テーマ再現を重視。', points: '切替と予測。', tags: ['ゲーム', 'TR2'], created_at: nowIso() },
  ];

  const sessions: PracticeSession[] = [];
  const slots: GroundSlot[] = [];
  const blocks: SessionBlockRow[] = [];

  const players: PlayerRow[] = [
    ['マト', 1, 'Aチーム'], ['寺沢', 2, 'Aチーム'], ['鈴木', 3, 'Aチーム'], ['田中', 4, 'Aチーム'],
    ['山本', 8, 'Bチーム'], ['中村', 9, 'Bチーム'], ['加藤', 10, 'Bチーム'], ['吉田', 11, 'Bチーム'],
    ['佐々木', 13, 'Cチーム'], ['松本', 14, 'Cチーム'], ['井上', 15, 'Cチーム'], ['木村', 16, 'Cチーム'],
    ['清水', 17, '一年生'], ['林', 18, '一年生'], ['斎藤', 19, '一年生'], ['池田', 20, '一年生'],
  ].map(([name, number, team], i) => ({
    id: uuid(),
    name: String(name),
    number: Number(number),
    team: String(team),
    original_team: String(team),
    position_x: team === 'Aチーム' ? 15 + (i % 4) * 8 : team === 'Bチーム' ? 60 + (i % 4) * 8 : team === 'Cチーム' ? 15 + (i % 4) * 8 : 60 + (i % 4) * 8,
    position_y: team === 'Aチーム' || team === 'Bチーム' ? 15 + (Math.floor(i / 4) % 4) * 12 : 60 + (Math.floor(i / 4) % 4) * 10,
    created_at: nowIso(),
  }));

  return {
    practice_menus: menus,
    practice_sessions: sessions,
    ground_slots: slots,
    session_blocks: blocks,
    players,
  };
}

const localDb: LocalDb = makeLocalDb();

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function matchesFilter(row: Record<string, unknown>, filter: Filter): boolean {
  const value = row[filter.column];
  if (filter.op === 'eq') return value === filter.value;
  if (filter.op === 'in') return Array.isArray(filter.value) && filter.value.includes(value);
  if (filter.op === 'gte') return String(value ?? '') >= String(filter.value ?? '');
  if (filter.op === 'lte') return String(value ?? '') <= String(filter.value ?? '');
  if (filter.op === 'not' && filter.value === 'is') return value !== filter.value2;
  return true;
}

function withJoin(table: TableName, rows: Record<string, unknown>[]) {
  if (table !== 'session_blocks') return rows;
  return rows.map((r) => {
    const practiceMenuId = r.practice_menu_id as string | null;
    const practice_menu = practiceMenuId
      ? localDb.practice_menus.find((m) => m.id === practiceMenuId) ?? null
      : null;
    return { ...r, practice_menu };
  });
}

class LocalQueryBuilder {
  private filters: Filter[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private selected = '*';
  private pendingResult: Record<string, unknown>[] | null = null;

  constructor(
    private readonly table: TableName,
    private readonly action: 'select' | 'insert' | 'update' | 'delete',
    private readonly payload?: Record<string, unknown> | Record<string, unknown>[],
  ) {}

  select(columns = '*') {
    this.selected = columns;
    if (this.action === 'insert') this.executeInsert();
    if (this.action === 'update') this.executeUpdate();
    if (this.action === 'delete') this.executeDelete();
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: opts?.ascending ?? true };
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: 'eq', column, value });
    return this;
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ op: 'in', column, value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ op: 'gte', column, value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ op: 'lte', column, value });
    return this;
  }

  not(column: string, op: string, value: unknown) {
    this.filters.push({ op: 'not', column, value: op, value2: value });
    return this;
  }

  async single() {
    const { data } = await this.execute();
    return { data: data?.[0] ?? null, error: null };
  }

  async maybeSingle() {
    const { data } = await this.execute();
    return { data: data?.[0] ?? null, error: null };
  }

  then(onFulfilled?: ((value: { data: unknown; error: null }) => unknown) | null, onRejected?: ((reason: unknown) => unknown) | null) {
    return this.execute().then(onFulfilled ?? undefined, onRejected ?? undefined);
  }

  private rows() {
    return localDb[this.table] as Record<string, unknown>[];
  }

  private filteredRows() {
    let rows = this.rows().filter((row) => this.filters.every((f) => matchesFilter(row, f)));
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      rows = [...rows].sort((a, b) => {
        const av = String(a[column] ?? '');
        const bv = String(b[column] ?? '');
        return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return rows;
  }

  private executeInsert() {
    if (this.pendingResult) return;
    const src = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
    const inserted = src.map((item) => {
      const base = { ...item } as Record<string, unknown>;
      if (!base.id) base.id = uuid();
      if (!base.created_at) base.created_at = nowIso();
      if (this.table === 'practice_menus' && !Array.isArray(base.tags)) base.tags = [];
      if (this.table === 'session_blocks') {
        if (base.ground_slot_id === undefined) base.ground_slot_id = null;
        if (base.practice_menu_id === undefined) base.practice_menu_id = null;
        if (base.review === undefined) base.review = null;
        if (base.sort_order === undefined) base.sort_order = 0;
      }
      if (this.table === 'practice_sessions') {
        if (base.overall_theme === undefined) base.overall_theme = null;
        if (base.weather === undefined) base.weather = '晴れ';
        if (base.notes === undefined) base.notes = null;
      }
      return base;
    });
    (localDb[this.table] as unknown as Record<string, unknown>[]).push(...inserted);
    this.pendingResult = inserted;
  }

  private executeUpdate() {
    if (this.pendingResult) return;
    const rows = this.filteredRows();
    rows.forEach((r) => Object.assign(r, this.payload ?? {}));
    this.pendingResult = rows;
  }

  private executeDelete() {
    if (this.pendingResult) return;
    const current = localDb[this.table] as unknown as Record<string, unknown>[];
    const toDelete = new Set(this.filteredRows().map((r) => String(r.id)));
    const kept = current.filter((r) => !toDelete.has(String(r.id)));
    (localDb[this.table] as unknown as Record<string, unknown>[]) = kept;

    if (this.table === 'practice_sessions') {
      const deletedSessionIds = toDelete;
      localDb.ground_slots = localDb.ground_slots.filter((s) => !deletedSessionIds.has(s.session_id));
      localDb.session_blocks = localDb.session_blocks.filter((b) => !deletedSessionIds.has(b.session_id));
    }
    if (this.table === 'ground_slots') {
      localDb.session_blocks = localDb.session_blocks.filter((b) => !b.ground_slot_id || !toDelete.has(b.ground_slot_id));
    }
    this.pendingResult = [];
  }

  private async execute() {
    if (this.action === 'insert') this.executeInsert();
    if (this.action === 'update') this.executeUpdate();
    if (this.action === 'delete') this.executeDelete();
    if (this.action === 'select') this.pendingResult = this.filteredRows();

    const rows = this.pendingResult ?? [];
    const joined = withJoin(this.table, rows);
    const result = clone(this.selected ? joined : rows);
    return { data: result, error: null as null };
  }
}

function createLocalSupabaseClient() {
  return {
    from(table: string) {
      const t = table as TableName;
      return {
        select(columns = '*') {
          return new LocalQueryBuilder(t, 'select').select(columns);
        },
        insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
          return new LocalQueryBuilder(t, 'insert', payload);
        },
        update(payload: Record<string, unknown>) {
          return new LocalQueryBuilder(t, 'update', payload);
        },
        delete() {
          return new LocalQueryBuilder(t, 'delete');
        },
      };
    },
  };
}

export const supabase: any = hasSupabaseEnv
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createLocalSupabaseClient();
