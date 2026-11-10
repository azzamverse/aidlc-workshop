# Interaction Specification: Table Order v2

Traced from `stories.md` and `requirements.md`.

| Component | Trigger and result | Loading | Empty | Error or unavailable |
|---|---|---|---|---|
| Order ready banner | Order becomes Completed: slides in, plays sound and vibration unless muted | None | Hidden | Sound blocked: banner still shows |
| New order alert | Order placed: shows on the board with sound | None | Hidden | Sound blocked: alert still shows |
| Mute switch | Press: toggles, and is remembered on the device | None | None | None |
| PIN screen | Each digit fills a dot; the fourth submits | Keys disabled while checking | Dots empty | "That PIN isn't right"; after 5 wrong tries, a 30-second lockout message |
| Allergy setting | Each row toggles, saved at once on the device | None | All off: no marks | Storage blocked: works for this visit |
| Customize | Pick-one rows replace each other; extras toggle; the price updates at once | None | Dish has no options: no link | Refused by server: message, cart kept |
| Cart warning | Place order with an unsafe dish: confirmation dialog | Button shows "Placing…" | No unsafe dish: no warning | Cancel: nothing changes |
| Call / bill buttons | Press: button shows "Staff told" until staff respond | Button disabled while sending | No Open visit: hidden | Failure: message, button resets |
| Pulsing card and Respond | Each request has its own Respond button | Disabled while sending | No requests: no pulse | Failure: message, pulse stays |
| Order tracker | Follows status live, with "About N min" | Skeleton | "No orders yet" | Cancelled: word only, no bar |
| My orders switcher | Pills swap the view; the choice stays until the tab changes | Scene shows a spinner while its code loads | Scene says no orders yet | 3D unavailable: text version |
| The Living Table | Drag or arrow keys spin it; plates change with status | Spinner | "Order something to fill your table" | Text list of dishes and states |
| Kitchen Theatre | Tickets slide between rail, stove and pass | Spinner | "No tickets yet" | Text list |
| Spin the Bottle | Choose question and seats, spin; all phones show the same result | Button disabled during a spin | Visit not Open: hidden | Refused during a spin: "Already spinning" |
| Chef's Dice | Pick mood, then tap, Enter or shake | Dice roll | No dish fits: says so | Motion denied: tap and Enter still work |

## Motion

Menu cards tilt slightly on hover and press. Under reduced motion, tilt, pulse, banners, spins and rolls stop, and results show at once.

## Responsive

Diner screens are designed for 360 to 420 px, and staff screens from 1024 px. Scenes scale to the screen width.

## Assumptions & Open Questions

- Sound uses a short built-in tone, so no audio licence is needed.
