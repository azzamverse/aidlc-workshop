import { useState } from 'react';
import { formatMoney } from '../shared/money.js';
import { resolveOptionIds, unitPriceCents } from '../screens/diner/cartStore.js';
import { inMenuOrder, toggleOption } from './customize.js';
import { Sheet } from './Sheet.jsx';

function Choice({ group, option, checked, onToggle }) {
  return (
    <label className="choice">
      <span className="choice-name">
        <input
          type={group.kind === 'one' ? 'radio' : 'checkbox'}
          name={group.id}
          checked={checked}
          onChange={() => onToggle(group, option.id)}
          data-testid={`customize-option-${option.id}`}
        />
        {option.name}
      </span>
      <span>
        {option.priceDeltaCents > 0 && <span className="price">+{formatMoney(option.priceDeltaCents)} </span>}
        {checked && <span className="muted">Selected</span>}
      </span>
    </label>
  );
}

/** A dish's choices and running price. The server works out the real price (BR4.4). */
export function CustomizePanel({ item, onAdd, onClose }) {
  const [chosenIds, setChosenIds] = useState(() => resolveOptionIds(item));

  function toggle(group, optionId) {
    setChosenIds((current) => toggleOption(current, group, optionId));
  }

  function add() {
    onAdd(item, inMenuOrder(item, chosenIds));
    onClose();
  }

  return (
    <Sheet title={item.name} onClose={onClose} testId="customize-panel">
      <p className="muted">Make it yours</p>
      {item.optionGroups.map((group) => (
        <section className="card" key={group.id} role={group.kind === 'one' ? 'radiogroup' : 'group'} aria-label={group.name}>
          <h2>{group.name}</h2>
          {group.options.map((option) => (
            <Choice key={option.id} group={group} option={option} checked={chosenIds.includes(option.id)} onToggle={toggle} />
          ))}
        </section>
      ))}
      <button className="btn block" onClick={add} data-testid="customize-add">Add to cart · {formatMoney(unitPriceCents(item, chosenIds))}</button>
      <button className="link-btn" onClick={onClose} data-testid="customize-cancel">Cancel</button>
    </Sheet>
  );
}
