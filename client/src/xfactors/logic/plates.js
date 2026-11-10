/** BR9.1: the most plates the table draws; the text summary still lists every unit. */
export const PLATE_CAP = 12;

const STATE_OF_STATUS = { Pending: 'covered', Preparing: 'steaming', Completed: 'uncovered' };
const WORD_OF_STATE = { covered: 'Waiting', steaming: 'Cooking', uncovered: 'Ready' };
const TURN_PER_KEY = Math.PI / 12;
const TURN_PER_PIXEL = 0.01;

export const plateWord = (state) => WORD_OF_STATE[state];

/** One unit per dish quantity in non-Cancelled orders, oldest order first. */
export function platesFromOrders(orders, cap = PLATE_CAP) {
  const units = [...orders]
    .filter((order) => order.status !== 'Cancelled')
    .sort((a, b) => a.number - b.number)
    .flatMap((order) =>
      order.lines.flatMap((line, lineIndex) =>
        Array.from({ length: line.quantity }, (_, unit) => ({
          key: `${order.id}-${lineIndex}-${unit}`,
          dishName: line.name,
          state: STATE_OF_STATUS[order.status],
        })),
      ),
    );
  return { units, plates: units.slice(0, cap), hiddenCount: Math.max(0, units.length - cap) };
}

/** BR9.3: the left and right arrows turn the table; any other key leaves it. */
export function rotationAfterKey(rotation, key) {
  if (key === 'ArrowLeft') return rotation - TURN_PER_KEY;
  if (key === 'ArrowRight') return rotation + TURN_PER_KEY;
  return rotation;
}

/** The table's turn in whole degrees, 0 to 359, for assistive technology. */
export function turnedDegrees(rotation) {
  const degrees = Math.round((rotation * 180) / Math.PI);
  return ((degrees % 360) + 360) % 360;
}

export const rotationAfterDrag = (rotation, pixels) => rotation + pixels * TURN_PER_PIXEL;
