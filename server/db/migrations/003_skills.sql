CREATE TABLE skills (
  id SERIAL PRIMARY KEY,
  class TEXT NOT NULL CHECK (class IN ('mage', 'warrior', 'archer', 'zhnec', 'assasin')),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cooldown_ms INTEGER NOT NULL,
  priority INTEGER NOT NULL,
  effect_type TEXT NOT NULL CHECK (effect_type IN ('damage', 'heal', 'buff', 'debuff', 'lifesteal_bonus')),
  power_multiplier NUMERIC NOT NULL DEFAULT 1,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  unlock_level INTEGER NOT NULL DEFAULT 1
);
