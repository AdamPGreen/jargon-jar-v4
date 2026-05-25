export const formatCurrency = (dollars: number): string => {
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