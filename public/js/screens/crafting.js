import { el } from '../utils/dom.js';
import { api, ApiError } from '../api.js';
import { setCharacter } from '../state.js';
import { toast } from '../ui/modal.js';
import { RARITY_COLORS } from '../config.js';

export async function renderCraftingTab(character, materials) {
  const wrap = el('div', {});
  wrap.appendChild(el('div', { class: 'muted', style: 'margin-bottom:8px' }, 'Загрузка рецептов...'));

  try {
    const { recipes } = await api.get('/crafting/recipes');
    wrap.innerHTML = '';

    if (recipes.length === 0) {
      wrap.appendChild(el('div', { class: 'muted' }, 'Нет доступных рецептов.'));
      return wrap;
    }

    const materialsByKey = Object.fromEntries(materials.map((m) => [m.key, m.quantity]));

    for (const recipe of recipes) {
      const canLevel = character.level >= recipe.requiredCharacterLevel;
      const canGold = character.gold >= recipe.goldCost;
      const missingInputs = recipe.inputs.filter((input) => {
        if (input.material) return (materialsByKey[input.material.key] || 0) < input.quantity;
        return false; // item-input availability checked server-side at craft time
      });
      const canCraft = canLevel && canGold && missingInputs.length === 0;

      const inputsText = recipe.inputs.map((input) => {
        const label = input.material ? input.material.name : input.item.name;
        const have = input.material ? (materialsByKey[input.material.key] || 0) : null;
        return have !== null ? `${label} ${have}/${input.quantity}` : `${label} x${input.quantity}`;
      }).join(', ');

      wrap.appendChild(
        el('div', { class: 'panel', style: 'margin-bottom:8px' }, [
          el('div', { class: 'row' }, [
            el('div', {}, [
              el('div', { style: `font-weight:600;color:${RARITY_COLORS[recipe.outputRarity]}` }, recipe.outputName),
              el('div', { class: 'muted' }, `Ур. ${recipe.requiredCharacterLevel} · 💰 ${recipe.goldCost}`),
            ]),
            el('button', {
              class: 'btn primary small',
              ...(canCraft ? {} : { disabled: 'disabled' }),
              onClick: canCraft ? async () => {
                try {
                  const result = await api.post('/crafting/craft', { recipeId: recipe.id });
                  setCharacter(result.character);
                  toast(`Создано: ${result.item}`);
                } catch (err) {
                  toast(err instanceof ApiError ? craftErrorText(err.message) : 'Ошибка крафта.');
                }
              } : undefined,
            }, 'Скрафтить'),
          ]),
          el('div', { class: 'muted', style: 'margin-top:6px' }, inputsText),
        ])
      );
    }
  } catch (err) {
    wrap.innerHTML = '';
    wrap.appendChild(el('div', { class: 'muted' }, 'Не удалось загрузить рецепты.'));
    console.error(err); // eslint-disable-line no-console
  }

  return wrap;
}

function craftErrorText(code) {
  const map = {
    not_enough_gold: 'Недостаточно золота.',
    not_enough_materials: 'Недостаточно материалов.',
    not_enough_items: 'Недостаточно предметов для крафта.',
    level_too_low: 'Слишком низкий уровень.',
    wrong_class: 'Рецепт недоступен для этого класса.',
  };
  return map[code] || 'Не удалось скрафтить предмет.';
}
