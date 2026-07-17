CREATE TABLE materials (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary'))
);

CREATE TABLE character_materials (
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (character_id, material_id)
);
