/** Shows whole cents as dollars, from integers only, so no rounding can creep in. */
export function formatMoney(cents) {
  const dollars = Math.trunc(cents / 100);
  return `$${dollars}.${String(Math.abs(cents) % 100).padStart(2, '0')}`;
}
