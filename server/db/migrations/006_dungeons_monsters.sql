CREATE TABLE dungeons (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  min_character_level INTEGER NOT NULL DEFAULT 1,
  boss_unlock_level INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  background_layers JSONB NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE characters
  ADD CONSTRAINT characters_current_dungeon_fk
  FOREIGN KEY (current_dungeon_id) REFERENCES dungeons(id);

CREATE TABLE monsters (
  id SERIAL PRIMARY KEY,
  dungeon_id INTEGER NOT NULL REFERENCES dungeons(id) ON DELETE CASCADE,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  hp NUMERIC NOT NULL,
  attack NUMERIC NOT NULL,
  defense NUMERIC NOT NULL,
  attack_speed NUMERIC NOT NULL,
  crit_chance NUMERIC NOT NULL DEFAULT 0.05,
  crit_dmg NUMERIC NOT NULL DEFAULT 1.5,
  xp_reward INTEGER NOT NULL,
  gold_reward_min INTEGER NOT NULL,
  gold_reward_max INTEGER NOT NULL,
  is_boss BOOLEAN NOT NULL DEFAULT false,
  spawn_weight INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE monster_item_drops (
  monster_id INTEGER NOT NULL REFERENCES monsters(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  drop_chance NUMERIC(7,5) NOT NULL,
  PRIMARY KEY (monster_id, item_id)
);

CREATE TABLE monster_material_drops (
  monster_id INTEGER NOT NULL REFERENCES monsters(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  drop_chance NUMERIC(7,5) NOT NULL,
  qty_min INTEGER NOT NULL DEFAULT 1,
  qty_max INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (monster_id, material_id)
);

CREATE TABLE character_dungeon_progress (
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  dungeon_id INTEGER NOT NULL REFERENCES dungeons(id) ON DELETE CASCADE,
  boss_defeated BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (character_id, dungeon_id)
);
