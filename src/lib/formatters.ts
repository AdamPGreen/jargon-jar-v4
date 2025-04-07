/**
 * Format cents to dollars with $ sign
 * @param cents Amount in cents
 */
export const formatCurrency = (cents: number): string => {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(dollars);
};

/**
 * Format a count with comma separators
 * @param count Number to format
 */
export const formatCount = (count: number): string => {
  return new Intl.NumberFormat('en-US').format(count);
}; 