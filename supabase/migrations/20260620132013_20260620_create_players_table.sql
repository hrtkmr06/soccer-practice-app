
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  number INTEGER,
  team TEXT NOT NULL DEFAULT 'Aチーム',
  original_team TEXT NOT NULL DEFAULT 'Aチーム',
  position_x NUMERIC DEFAULT 50,
  position_y NUMERIC DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_all_players" ON players FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_all_players" ON players FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_all_players" ON players FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_all_players" ON players FOR DELETE TO anon, authenticated USING (true);

INSERT INTO players (name, number, team, original_team, position_x, position_y) VALUES
  ('マト',     1,  'Aチーム', 'Aチーム', 15, 20),
  ('寺沢',    2,  'Aチーム', 'Aチーム', 35, 15),
  ('鈴木',    3,  'Aチーム', 'Aチーム', 15, 45),
  ('田中',    4,  'Aチーム', 'Aチーム', 35, 40),
  ('渡辺',    5,  'Aチーム', 'Aチーム', 15, 70),
  ('伊藤',    6,  'Aチーム', 'Aチーム', 35, 65),
  ('小林',    7,  'Aチーム', 'Aチーム', 25, 85),
  ('山本',    8,  'Bチーム', 'Bチーム', 65, 20),
  ('中村',    9,  'Bチーム', 'Bチーム', 85, 15),
  ('加藤',    10, 'Bチーム', 'Bチーム', 65, 45),
  ('吉田',    11, 'Bチーム', 'Bチーム', 85, 40),
  ('山田',    12, 'Bチーム', 'Bチーム', 65, 70),
  ('佐々木',  13, 'Cチーム', 'Cチーム', 15, 20),
  ('松本',    14, 'Cチーム', 'Cチーム', 35, 15),
  ('井上',    15, 'Cチーム', 'Cチーム', 15, 45),
  ('木村',    16, 'Cチーム', 'Cチーム', 35, 40),
  ('清水',    17, '一年生',  '一年生',  65, 20),
  ('林',      18, '一年生',  '一年生',  85, 15),
  ('斎藤',    19, '一年生',  '一年生',  65, 45),
  ('池田',    20, '一年生',  '一年生',  85, 40);
