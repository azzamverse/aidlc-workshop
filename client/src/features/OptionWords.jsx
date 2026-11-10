/** Option names as plain text under a line (BR4.8). React escapes them, so they are never markup. */
export function OptionWords({ words }) {
  if (!words || words.length === 0) return null;
  return <div className="option-words muted">{words.join(' · ')}</div>;
}

/** The words of a placed line's recorded options. */
export const wordsOfLine = (line) => (line.options ?? []).map((option) => option.name);
