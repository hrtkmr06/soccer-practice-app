
-- Practice menu stock (drills library)
CREATE TABLE practice_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  rules TEXT,
  points TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE practice_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_all_practice_menus" ON practice_menus FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_practice_menus" ON practice_menus FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_practice_menus" ON practice_menus FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_practice_menus" ON practice_menus FOR DELETE TO anon, authenticated USING (true);

-- Practice sessions (per day)
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  overall_theme TEXT,
  weather TEXT DEFAULT '晴れ',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_all_practice_sessions" ON practice_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_practice_sessions" ON practice_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_practice_sessions" ON practice_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_practice_sessions" ON practice_sessions FOR DELETE TO anon, authenticated USING (true);

-- Individual blocks within a session
CREATE TABLE session_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  practice_menu_id UUID REFERENCES practice_menus(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  area TEXT NOT NULL,
  team TEXT NOT NULL,
  review TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE session_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_all_session_blocks" ON session_blocks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_session_blocks" ON session_blocks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_session_blocks" ON session_blocks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_session_blocks" ON session_blocks FOR DELETE TO anon, authenticated USING (true);

-- Seed some practice menus
INSERT INTO practice_menus (title, rules, points, tags) VALUES
  ('ビルドアップ（3対2）', 'GKを含めた3対2の数的優位からボールを前進させる。プレス時のコースの消し方と受け手のポジショニングを意識。', '①GKへのバックパスを怖がらない ②受け手は斜めの角度で顔を出す ③ファーストタッチの方向', ARRAY['ビルドアップ', 'TR1', 'ポゼッション']),
  ('ミートスプリント', 'コーチのパスに対してセンターライン方向へスプリント。止める・蹴るの精度を高める。', '①ボールに向かう最初の一歩 ②体の向きを作ってからコントロール ③2タッチ以内でパス', ARRAY['W-UP', 'アジリティ', 'ミートスプリント']),
  ('ゲーム形式（8対8）', '縦30m横40mのピッチで8対8。オフサイドあり。テーマに沿ったプレーが出た時にコーチング停止。', '①テーマの再現性 ②プレス開始のトリガー ③セカンドボールの予測', ARRAY['ゲーム', 'TR2']),
  ('ポゼッション（4対2）', '10m四方のグリッドで4対2のロンド。パス回し6本成功で攻守交代。守備は中央を閉じること。', '①テンポと距離感 ②守備の連動 ③サポートの角度と距離', ARRAY['W-UP', 'ポゼッション', 'ロンド']),
  ('トランジション（4対4+2フリーマン）', '攻守が切り替わった瞬間の即時奪回または即時攻撃の判断を磨く。', '①ボールロスト後2秒以内の切替 ②フリーマンの活用 ③プレッシャーのかけ方', ARRAY['TR2', 'トランジション', 'ゲーム']),
  ('クロスからのフィニッシュ', 'サイドからのクロスに対してストライカー2人が連動してゴール前に入るトレーニング。', '①ニアとファーの役割分担 ②クロスのタイミングに合わせた動き出し ③ファーストタッチ後のシュート体勢', ARRAY['フィニッシュ', 'TR2', 'クロス']),
  ('ディフェンスラインのスライド', '横パスに連動したDFラインのスライドと、縦パスが入った時の連動プレスを反復練習。', '①ボールサイドの圧縮 ②ラインの高さ統一 ③縦パスへの反応速度', ARRAY['守備', 'TR1', 'ライン']),
  ('セットプレー（コーナーキック）', 'ニア・ファー・ショートの3パターンを習得。守備側も2人マーク＋ゾーンの組み合わせを確認。', '①動き出しのタイミング ②ブロックの作り方 ③クリア後のセカンド', ARRAY['セットプレー', 'CK']);

-- Seed a practice session for today and nearby dates
INSERT INTO practice_sessions (date, overall_theme, weather, notes) VALUES
  (CURRENT_DATE, 'ビルドアップの再現性向上', '晴れ', 'Aチームは先週の課題であるサイドへの展開を重点的に確認する。'),
  (CURRENT_DATE + INTERVAL '3 days', '守備ブロックの組織化', '曇り', '全チームで守備の基準を統一する。'),
  (CURRENT_DATE - INTERVAL '5 days', 'トランジションの質向上', '晴れ', '先週の試合の反省から、切替の遅さを修正する。');

-- Seed session blocks for today's session
WITH today_session AS (SELECT id FROM practice_sessions WHERE date = CURRENT_DATE)
INSERT INTO session_blocks (session_id, title, start_time, end_time, area, team, sort_order) 
SELECT 
  today_session.id,
  b.title, b.start_time, b.end_time, b.area, b.team, b.sort_order
FROM today_session,
(VALUES 
  ('ミートスプリント', '14:00', '14:20', 'テニス側', 'Aチーム', 1),
  ('ポゼッション（4対2）', '14:00', '14:20', '野球側', 'Bチーム', 2),
  ('ビルドアップ（3対2）', '14:25', '15:05', 'テニス側', 'Aチーム', 3),
  ('ディフェンスラインのスライド', '14:25', '15:05', '野球側', 'Bチーム', 4),
  ('ゲーム形式（8対8）', '15:10', '15:50', 'テニス側', 'Aチーム', 5)
) AS b(title, start_time, end_time, area, team, sort_order);
