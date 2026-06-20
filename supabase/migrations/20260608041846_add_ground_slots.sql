
-- Ground allocation slots (time × area × team)
CREATE TABLE ground_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL DEFAULT '14:00',
  end_time TEXT NOT NULL DEFAULT '15:00',
  area TEXT NOT NULL,
  team TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ground_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_all_ground_slots" ON ground_slots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_ground_slots" ON ground_slots FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_ground_slots" ON ground_slots FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_ground_slots" ON ground_slots FOR DELETE TO anon, authenticated USING (true);

-- Link session_blocks to ground_slots
ALTER TABLE session_blocks ADD COLUMN IF NOT EXISTS ground_slot_id UUID REFERENCES ground_slots(id) ON DELETE SET NULL;

-- Migrate existing session_blocks: create a ground slot per block and link them
DO $$
DECLARE
  block_rec RECORD;
  new_slot_id UUID;
BEGIN
  FOR block_rec IN SELECT * FROM session_blocks ORDER BY session_id, sort_order LOOP
    INSERT INTO ground_slots (session_id, start_time, end_time, area, team, sort_order)
    VALUES (block_rec.session_id, block_rec.start_time, block_rec.end_time, block_rec.area, block_rec.team, block_rec.sort_order)
    RETURNING id INTO new_slot_id;

    UPDATE session_blocks SET ground_slot_id = new_slot_id WHERE id = block_rec.id;
  END LOOP;
END $$;
