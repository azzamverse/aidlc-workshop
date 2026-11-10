/** The first-run data: 10 tables and the mockups' 4 categories and 12 items. */
export const TABLE_COUNT = 10;

const SPICE = { name: 'Spice', kind: 'one', options: [['Mild', 0], ['Medium', 0, true], ['Hot', 0]] };
const SIZE = { name: 'Size', kind: 'one', options: [['Regular', 0, true], ['Large', 300]] };
const extras = (...options) => ({ name: 'Extras', kind: 'any', options });
const EXTRA_CHEESE = ['Extra cheese', 150];

/**
 * v2's details, matched to the seed by item name, so a v1 database gains them
 * without an item row changing (BR3.2). Options never add an allergen (BR4.2).
 */
export const SEED_DETAILS = {
  'Garlic Bread': { allergens: ['gluten', 'dairy'], mood: 'light', groups: [extras(EXTRA_CHEESE)] },
  'Tomato Soup': { allergens: ['dairy'], mood: 'light', groups: [SPICE] },
  'Caesar Salad': { allergens: ['gluten', 'dairy', 'eggs', 'fish', 'shellfish'], mood: 'light', groups: [extras(EXTRA_CHEESE)] },
  'Margherita Pizza': { allergens: ['gluten', 'dairy'], mood: 'hearty', groups: [SIZE, SPICE, extras(EXTRA_CHEESE)] },
  Cheeseburger: { allergens: ['gluten', 'dairy', 'eggs', 'soy'], mood: 'hearty', groups: [SIZE, SPICE, extras(EXTRA_CHEESE, ['Bacon', 200])] },
  'Spaghetti Bolognese': { allergens: ['gluten', 'dairy', 'eggs'], mood: 'hearty', groups: [SIZE, SPICE, extras(EXTRA_CHEESE)] },
  'Chocolate Cake': { allergens: ['gluten', 'dairy', 'eggs', 'peanuts', 'soy'], mood: 'sweet', groups: [] },
  'Ice Cream': { allergens: ['dairy', 'eggs'], mood: 'sweet', groups: [extras(['Chocolate sauce', 50])] },
  'Apple Pie': { allergens: ['gluten', 'dairy', 'nuts'], mood: 'sweet', groups: [] },
  Lemonade: { allergens: [], mood: 'light', groups: [SIZE] },
  'Iced Tea': { allergens: [], mood: 'light', groups: [SIZE] },
  Coffee: { allergens: [], mood: 'light', groups: [SIZE] },
};

export const SEED_CATEGORIES = [
  {
    id: 'starters',
    name: 'Starters',
    items: [
      ['garlic-bread', 'Garlic Bread', 'Toasted sourdough with garlic butter and parsley.', 450, '🥖'],
      ['tomato-soup', 'Tomato Soup', 'Slow-roasted tomatoes with basil and cream.', 550, '🍅'],
      ['caesar-salad', 'Caesar Salad', 'Romaine, parmesan, croutons and Caesar dressing.', 700, '🥗'],
    ],
  },
  {
    id: 'mains',
    name: 'Mains',
    items: [
      ['margherita-pizza', 'Margherita Pizza', 'Tomato, mozzarella and fresh basil.', 1200, '🍕'],
      ['cheeseburger', 'Cheeseburger', 'Beef patty, cheddar, pickles and house sauce.', 1150, '🍔'],
      ['spaghetti-bolognese', 'Spaghetti Bolognese', 'Slow-cooked beef ragu with parmesan.', 1300, '🍝'],
    ],
  },
  {
    id: 'desserts',
    name: 'Desserts',
    items: [
      ['chocolate-cake', 'Chocolate Cake', 'Rich sponge with dark chocolate ganache.', 600, '🍰'],
      ['ice-cream', 'Ice Cream', 'Three scoops of vanilla, chocolate or strawberry.', 400, '🍨'],
      ['apple-pie', 'Apple Pie', 'Warm spiced apples in a buttery crust.', 550, '🥧'],
    ],
  },
  {
    id: 'drinks',
    name: 'Drinks',
    items: [
      ['lemonade', 'Lemonade', 'Freshly squeezed with a hint of mint.', 300, '🍋'],
      ['iced-tea', 'Iced Tea', 'Black tea, chilled, with lemon.', 300, '🥤'],
      ['coffee', 'Coffee', 'Freshly brewed house blend.', 250, '☕'],
    ],
  },
];
