CREATE TABLE crafting_recipes (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  output_item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  class_restriction TEXT NULL CHECK (class_restriction IS NULL OR class_restriction IN ('mage', 'warrior', 'archer', 'zhnec', 'assasin')),
  required_character_level INTEGER NOT NULL DEFAULT 1,
  gold_cost INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE crafting_recipe_inputs (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES crafting_recipes(id) ON DELETE CASCADE,
  material_id INTEGER NULL REFERENCES materials(id) ON DELETE CASCADE,
  item_id INTEGER NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  CHECK ((material_id IS NULL) <> (item_id IS NULL))
);
