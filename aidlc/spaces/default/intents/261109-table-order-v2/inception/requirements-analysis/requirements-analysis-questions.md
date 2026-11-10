# Requirements Analysis Questions: Table Order v2

The brief's open questions on which features are in, which v1 screens change, and what sits behind the Staff PIN were settled in Scope Definition. Its question on a second language doesn't apply, because Multi-language was not chosen. Its remaining question comes first.

## Q1. [Product owner] How should the order tracker show the estimated wait?

This is the brief's open question on the tracker, and the one the product lead's review left for this stage.

A. As minutes, such as "About 12 min" (Recommended)
B. As words only: "About right" or "Running late"
C. Both: minutes, with "Running late" once the estimate has passed
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. [Product owner] How should the estimated wait be worked out?

The "Honest wait time" feature was not chosen, and v1 records no times for when an order changes status, so history would need new data.

A. A simple rule: a set base time plus a few minutes for each order ahead in the kitchen, with no history needed (Recommended)
B. From today's finished orders and how busy the kitchen is, which needs status times recorded
C. A fixed time set for every order
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. [Product owner] How should Notifications reach people?

Email, SMS and paid services are out of scope, so this is about what happens inside the app.

A. An in-app banner, a short sound, and vibration on phones that support it, with a mute switch (Recommended)
B. An in-app banner only
C. A banner for diners, and a banner with sound for staff
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. [Developer] How should the Staff PIN work?

Without checks on the server, a PIN on the screen protects nothing, because staff actions could still be called directly. A PIN must never be written into the code.

A. One shared PIN from the `STAFF_PIN` setting, checked on the server for staff actions, remembered until the browser closes; if the setting is missing, the server makes one up at start and prints it (Recommended)
B. The same, but the app refuses to start without `STAFF_PIN`
C. One shared PIN, checked on the staff screens only
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q5. [Product owner] Which allergens should the Allergy shield cover?

A. Eight common ones: gluten, dairy, eggs, nuts, peanuts, soy, fish and shellfish (Recommended)
B. The 14 allergens used on UK and EU food labels
C. Four only: gluten, dairy, nuts and shellfish
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q6. [Product owner] What should "+ Add" do on a dish that has options?

v1's browser tests rely on one press of "+ Add" adding the item. Anything other than A means those tests change.

A. "+ Add" still adds at once with the default choices, and a small "Customize" link beside it opens the options (Recommended)
B. "+ Add" opens the options first on every dish that has them
C. Options can only be changed afterwards, from the Cart
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q7. [Product owner] Which wildly creative X-factors should stand out to the judges? (select all that apply)

A. The Living Table (Recommended)
B. Kitchen Theatre
C. Spin the Bottle
D. Chef's Dice
X. Other (please specify)

[Answer]: A, B, C, D

## Q8. [Product owner] What happens to Call the waiter / Ask for the bill and the Animated order tracker?

A. Keep both, add the new (Recommended)
B. Replace the tracker
C. Replace Call the waiter
X. Other (please specify)

[Answer]: A

## Q9. [Product owner] How far should the 3D, more creative design go?

A. Diner and new screens (Recommended)
B. New screens only
C. Every screen
X. Other (please specify)

[Answer]: A
