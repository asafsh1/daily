// Sequential ID counter storage (simulates a database sequence)
const counters = {
  CUSTOMER: 1,
  USER: 1,
  AIRLINE: 1,
  SHIPMENT: 1,
  LEG: 1,
  SHIPPER: 1,
  CONSIGNEE: 1,
  NOTIFY_PARTY: 1
};

/**
 * Generates a unique ID with a consistent format: PREFIX + sequential number padded to 3 digits
 * Example: SHIPMENT001, SHIPMENT002, LEG001, LEG002, etc.
 * 
 * @param {string} prefix - The prefix to use (e.g., 'SHIPMENT', 'LEG')
 * @returns {string} - A unique ID with the format PREFIX + sequential number
 */
export const generateUniqueId = (prefix) => {
  // Increment the counter for this prefix
  if (!counters[prefix]) {
    counters[prefix] = 1;
  }
  
  // Get the current count and pad it to 3 digits
  const count = counters[prefix]++;
  const paddedCount = count.toString().padStart(3, '0');
  
  // Return the complete ID
  return `${prefix}${paddedCount}`;
};

// Define prefixes for different types of IDs
export const ID_PREFIXES = {
  CUSTOMER: 'CUSTOMER',
  USER: 'USER',
  AIRLINE: 'AIRLINE',
  SHIPMENT: 'SHIPMENT',
  LEG: 'LEG',
  SHIPPER: 'SHIPPER',
  CONSIGNEE: 'CONSIGNEE',
  NOTIFY_PARTY: 'NP'
}; 