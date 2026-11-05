/** The first-run data: 10 tables and the mockups' 4 categories and 12 items. */
export const TABLE_COUNT = 10;

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
