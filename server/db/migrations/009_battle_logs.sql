CREATE TABLE battle_logs (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  dungeon_id INTEGER NOT NULL REFERENCES dungeons(id) ON DELETE CASCADE,
  monster_id INTEGER NOT NULL REFERENCES monsters(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('win', 'loss', 'timeout')),
  xp_gained INTEGER NOT NULL DEFAULT 0,
  gold_gained INTEGER NOT NULL DEFAULT 0,
  loot JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
