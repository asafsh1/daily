export const generateUniqueId = (prefix) => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}-${timestamp}-${random}`;
};

// Define prefixes for different types of IDs
export const ID_PREFIXES = {
  CUSTOMER: 'CUST',
  USER: 'USR',
  AIRLINE: 'AIR',
  SHIPMENT: 'SHP',
  LEG: 'LEG',
  SHIPPER: 'SHP',
  CONSIGNEE: 'CNS',
  NOTIFY_PARTY: 'NP'
}; 