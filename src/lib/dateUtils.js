/**
 * Date utilities for standardized date formatting across the resume app.
 * Storage format: YYYY-MM (e.g., "2020-01")
 * Display format: MMM YYYY (e.g., "Jan 2020")
 */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_MAP = {
  'jan': 0, 'january': 0,
  'feb': 1, 'february': 1,
  'mar': 2, 'march': 2,
  'apr': 3, 'april': 3,
  'may': 4,
  'jun': 5, 'june': 5,
  'jul': 6, 'july': 6,
  'aug': 7, 'august': 7,
  'sep': 8, 'sept': 8, 'september': 8,
  'oct': 9, 'october': 9,
  'nov': 10, 'november': 10,
  'dec': 11, 'december': 11
};

/**
 * Check if the date string represents "Present"
 */
export function isPresent(dateStr) {
  if (!dateStr) return false;
  const lower = dateStr.toLowerCase().trim();
  return lower === 'present' || lower === 'current' || lower === 'now';
}

/**
 * Parse a date string to { year, month } object.
 * Handles: "YYYY-MM", "MMM YYYY", "MMMM YYYY", "MM/YYYY"
 * Returns null if parsing fails.
 */
export function parseDate(dateStr) {
  if (!dateStr || isPresent(dateStr)) return null;
  
  const str = dateStr.trim();
  
  // Try YYYY-MM format (storage format)
  const isoMatch = str.match(/^(\d{4})-(\d{2})$/);
  if (isoMatch) {
    return { year: parseInt(isoMatch[1]), month: parseInt(isoMatch[2]) - 1 };
  }
  
  // Try "MMM YYYY" or "MMMM YYYY" format
  const textMatch = str.match(/^([a-zA-Z]+)\s+(\d{4})$/);
  if (textMatch) {
    const monthIndex = MONTH_MAP[textMatch[1].toLowerCase()];
    if (monthIndex !== undefined) {
      return { year: parseInt(textMatch[2]), month: monthIndex };
    }
  }
  
  // Try "MM/YYYY" format
  const slashMatch = str.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return { year: parseInt(slashMatch[2]), month: parseInt(slashMatch[1]) - 1 };
  }
  
  // Try just year "YYYY"
  const yearMatch = str.match(/^(\d{4})$/);
  if (yearMatch) {
    return { year: parseInt(yearMatch[1]), month: 0 }; // Default to January
  }
  
  return null;
}

/**
 * Convert a date string to storage format (YYYY-MM).
 * Returns the original string if parsing fails or if it's "Present".
 */
export function toStorageFormat(dateStr) {
  if (!dateStr) return '';
  if (isPresent(dateStr)) return 'Present';
  
  const parsed = parseDate(dateStr);
  if (!parsed) return dateStr; // Return original if can't parse
  
  const month = String(parsed.month + 1).padStart(2, '0');
  return `${parsed.year}-${month}`;
}

/**
 * Convert a date string to display format (MMM YYYY).
 * Returns the original string if parsing fails or if it's "Present".
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  if (isPresent(dateStr)) return 'Present';
  
  const parsed = parseDate(dateStr);
  if (!parsed) return dateStr; // Return original if can't parse
  
  return `${MONTHS[parsed.month]} ${parsed.year}`;
}

/**
 * Get list of month options for picker
 */
export function getMonthOptions() {
  return MONTHS.map((name, index) => ({
    value: index,
    label: name
  }));
}

/**
 * Get current year
 */
export function getCurrentYear() {
  return new Date().getFullYear();
}

/**
 * Generate a range of years (e.g., for a year dropdown)
 */
export function getYearRange(startYear = 1970, endYear = getCurrentYear() + 5) {
  const years = [];
  for (let y = endYear; y >= startYear; y--) {
    years.push(y);
  }
  return years;
}
