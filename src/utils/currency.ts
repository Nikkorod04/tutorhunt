/**
 * Currency formatting. Blueprint section 42.
 *
 * Monetary values are stored as plain numbers and only formatted at the edge.
 * Grouping and the two-decimal rule are implemented by hand rather than via
 * Intl, so the output is identical on every device and is unit testable.
 */

import { roundCurrency } from './pricing';

/** "₱1,250.00", and "-₱40.00" for negatives. */
export function formatPeso(amount: number): string {
  const rounded = roundCurrency(amount);
  const negative = rounded < 0;
  const [whole, decimals] = Math.abs(rounded).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}₱${grouped}.${decimals}`;
}

/** "₱350" when the value is whole, otherwise "₱350.50". For tight chips. */
export function formatPesoCompact(amount: number): string {
  const rounded = roundCurrency(amount);
  if (Number.isInteger(rounded)) {
    const grouped = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${rounded < 0 ? '-' : ''}₱${grouped}`;
  }
  return formatPeso(rounded);
}

/** A signed change label such as "+18%" or "-4%". */
export function formatPercentChange(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? '0%' : '+100%';
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(change);
  return `${rounded >= 0 ? '+' : ''}${rounded}%`;
}
