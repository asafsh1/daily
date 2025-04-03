export const generateUniqueId = (prefix) => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}-${timestamp}-${random}`;
};

// ID prefixes for different entities
export const ID_PREFIXES = {
  AIRLINE: 'AIR',
  USER: 'USR',
  CUSTOMER: 'CUST',
  SHIPMENT: 'SHIP',
  LEG: 'LEG',
  INVOICE: 'INV'
}; 