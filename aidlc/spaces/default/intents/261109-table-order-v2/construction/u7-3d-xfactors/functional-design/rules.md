# Business Rules: U7 3D X-factors

From `requirements.md`, `stories.md`, `components.md` and `contract-summary.md`.

```yaml
rules:
  - { id: BR9.1, statement: One plate shows per dish unit in non-Cancelled orders., category: calculation, applies_to: The Living Table, trigger: opening the view or an order change, logic: Show one plate per unit up to 12 and then a "+N more" label. Cancelled orders show none, violation: none, source: FR9.1 }
  - { id: BR9.2, statement: A plate shows its order's status., category: policy, applies_to: The Living Table, trigger: an order change, logic: Pending is covered and Preparing steams and Completed is uncovered. It changes within 2 seconds with no refresh, violation: none, source: FR9.2 }
  - { id: BR9.3, statement: The table spins by drag and by arrow keys., category: policy, applies_to: The Living Table, trigger: drag or left and right arrow, logic: Rotate the table, violation: none, source: "FR9.3, NFR6" }
  - { id: BR9.4, statement: Where 3D cannot run every scene shows the same information as text., category: policy, applies_to: all four scenes, trigger: 3D start fails or is unavailable, logic: Show the text version with working controls and no error, violation: none, source: NFR12 }
  - { id: BR9.5, statement: Under reduced motion scenes are still and results show at once., category: constraint, applies_to: all four scenes, trigger: the device setting, logic: Draw still scenes and jump spins and rolls to their result, violation: none, source: NFR12 }
  - { id: BR9.6, statement: 3D code loads only when a view opens., category: constraint, applies_to: all four scenes, trigger: opening a view, logic: The Menu's first load does not fetch 3D code, violation: none, source: NFR13 }
  - { id: BR10.1, statement: A ticket's place shows its status., category: policy, applies_to: Kitchen Theatre, trigger: an order change, logic: Pending is at the rail start and Preparing at the stove and Completed at the pass. It moves within 2 seconds, violation: none, source: "FR10.1, FR10.2" }
  - { id: BR10.2, statement: Tickets show words and only this table's orders., category: constraint, applies_to: Kitchen Theatre, trigger: render, logic: Show the order number and status in words. Read only My orders' data. Cancelled orders have no ticket, violation: none, source: FR10.3 }
  - { id: BR11.1, statement: Only an Open visit can spin., category: validation, applies_to: spin route, trigger: a spin request, logic: IF no visit is open THEN refuse, violation: "status 409, code NO_OPEN_VISIT", source: FR11.1 }
  - { id: BR11.2, statement: Seats and question must be valid., category: validation, applies_to: spin route, trigger: a spin request, logic: IF seats is not a whole number from 2 to 8 or the question is not one of the two THEN refuse, violation: "status 400, code INVALID_SPIN", source: FR11.1 }
  - { id: BR11.3, statement: The server picks the seat at random., category: calculation, applies_to: spin route, trigger: an accepted spin, logic: Choose a seat from 1 to seats on the server and publish spin.started to the table, violation: none, source: FR11.2 }
  - { id: BR11.4, statement: Only the first spin counts until 5 seconds after it started., category: constraint, applies_to: spin route, trigger: a spin request, logic: Inside one transaction IF the visit's latest spin started under 5 seconds ago THEN refuse, violation: "status 409, code SPIN_ACTIVE", source: FR11.3 }
  - { id: BR11.5, statement: A screen opened during a spin shows the current result., category: policy, applies_to: spin read, trigger: opening the view, logic: Return the open visit's latest spin if it started under 5 seconds ago and otherwise nothing, violation: none, source: FR11.2 }
  - { id: BR11.6, statement: A spin takes no payment and records no name., category: constraint, applies_to: spin, trigger: any spin, logic: Store only the fields in entities.md, violation: none, source: FR11.3 }
  - { id: BR12.1, statement: The dice suggest one qualifying dish., category: calculation, applies_to: Chef's Dice, trigger: a roll, logic: Pick at random from dishes matching the mood that are not sold out and contain none of the chosen allergens, violation: none, source: "FR12.1, FR12.2" }
  - { id: BR12.2, statement: Tap and Enter always roll and shaking is a bonus., category: policy, applies_to: Chef's Dice, trigger: tap or Enter or shake, logic: Use motion only where allowed and ignore a denial, violation: no error shows, source: FR12.1 }
  - { id: BR12.3, statement: With no qualifying dish the app says so., category: policy, applies_to: Chef's Dice, trigger: a roll with no match, logic: Show a plain message and suggest nothing, violation: none, source: FR12.3 }
```

## Rules Summary

| Group | Rules | Covers |
|---|---|---|
| Scenes | BR9.1 to BR9.6 | Living Table, fallback, motion, loading |
| Kitchen Theatre | BR10.1, BR10.2 | Tickets |
| Spin the Bottle | BR11.1 to BR11.6 | Server rules |
| Chef's Dice | BR12.1 to BR12.3 | Roll and suggestion |

## Assumptions & Open Questions

- [assumption] Seats are numbered from 1, and the bottle lands on a seat shown by number.
