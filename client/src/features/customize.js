/** The options panel's decisions, with no React in it (BR4.2). */

/** A pick-one group always keeps exactly one value; a pick-any group allows none or several. */
export function toggleOption(chosenIds, group, optionId) {
  if (group.kind === 'one') {
    const otherGroups = chosenIds.filter((id) => !group.options.some((option) => option.id === id));
    return [...otherGroups, optionId];
  }
  return chosenIds.includes(optionId) ? chosenIds.filter((id) => id !== optionId) : [...chosenIds, optionId];
}

/** The chosen options, in menu order, as ids. */
export const inMenuOrder = (item, chosenIds) =>
  item.optionGroups.flatMap((group) => group.options.filter((option) => chosenIds.includes(option.id)).map((option) => option.id));
