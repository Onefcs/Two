CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('weapon', 'helmet', 'chest', 'gloves', 'boots', 'belt', 'ring_1', 'ring_2', 'amulet', 'relic')),
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  class_restriction TEXT NULL CHECK (class_restriction IS NULL OR class_restriction IN ('mage', 'warrior', 'archer', 'zhnec', 'assasin')),
  stat_ranges JSONB NOT NULL DEFAULT '{}'::jsonb,
  level_requirement INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE item_instances (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  rolled_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  equipped_slot TEXT NULL CHECK (equipped_slot IS NULL OR equipped_slot IN ('weapon', 'helmet', 'chest', 'gloves', 'boots', 'belt', 'ring_1', 'ring_2', 'amulet', 'relic')),
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX item_instances_equipped_slot_unique
  ON item_instances (character_id, equipped_slot)
  WHERE equipped_slot IS NOT NULL;
