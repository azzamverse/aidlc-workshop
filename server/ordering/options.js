import { AppError } from '../platform/errors.js';

const invalidOptions = (message) => new AppError(400, 'INVALID_OPTIONS', message);

function refuseMalformed(optionIds) {
  if (!Array.isArray(optionIds) || optionIds.some((id) => typeof id !== 'string' || id === '')) {
    throw invalidOptions('The chosen options are not valid.');
  }
  if (new Set(optionIds).size !== optionIds.length) throw invalidOptions('An option was chosen twice.');
}

function chosenInGroup(group, optionIds) {
  const chosen = group.options.filter((option) => optionIds.includes(option.id));
  if (group.kind !== 'one') return chosen;
  if (chosen.length > 1) throw invalidOptions(`Only one choice is allowed for ${group.name}.`);
  return chosen.length === 1 ? chosen : group.options.filter((option) => option.isDefault);
}

/**
 * BR4.4 and BR4.5: works out one line from its option ids, in whole cents. A group
 * left out takes its default. `options` holds only the choices worth recording:
 * non-default or priced, so a line of free defaults keeps v1's shape (BR4.9).
 */
export function priceLine(item, groups, optionIds = []) {
  refuseMalformed(optionIds);
  const known = new Set(groups.flatMap((group) => group.options.map((option) => option.id)));
  if (optionIds.some((id) => !known.has(id))) throw invalidOptions('An option does not belong to this dish.');

  const applied = groups.flatMap((group) => chosenInGroup(group, optionIds));
  return {
    unitPriceCents: applied.reduce((price, option) => price + option.priceDeltaCents, item.priceCents),
    options: applied.filter((option) => !option.isDefault || option.priceDeltaCents > 0),
  };
}
