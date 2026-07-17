CREATE TABLE characters (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  class TEXT NOT NULL CHECK (class IN ('mage', 'warrior', 'archer', 'zhnec', 'assasin')),
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp BIGINT NOT NULL DEFAULT 0,
  gold BIGINT NOT NULL DEFAULT 0,
  current_dungeon_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE character_stats (
  character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  base_hp NUMERIC NOT NULL,
  base_attack NUMERIC NOT NULL,
  base_defense NUMERIC NOT NULL,
  base_attack_speed NUMERIC NOT NULL,
  base_crit_chance NUMERIC NOT NULL,
  base_crit_dmg NUMERIC NOT NULL,
  base_lifesteal NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE character_upgrades (
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  stat_key TEXT NOT NULL CHECK (stat_key IN ('attack', 'defense', 'hp', 'attack_speed', 'crit_chance', 'crit_dmg', 'lifesteal')),
  level INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (character_id, stat_key)
);
