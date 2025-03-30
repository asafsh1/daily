/**
 * Utility functions for generating airline tracking URLs
 */

// Mapping of airline codes to tracking URL generators
const AIRLINE_TRACKING = {
  // El Al Airlines
  '114': (awb) => {
    // Extract the number part without the prefix
    const awbNumber = awb.includes('-') ? awb.split('-')[1] : awb;
    return `https://www.elalextra.net/info/awb.asp?aid=114&awb=${awbNumber}`;
  },
  
  // Emirates Airlines
  '176': (awb) => {
    // Format: remove any dashes and concatenate with prefix
    const cleanAwb = awb.replace(/-/g, '');
    return `https://eskycargo.emirates.com/app/offerandorder/#/shipments/list?type=D&values=${cleanAwb}`;
  },
  
  // Qatar Airways
  '157': (awb) => {
    // Extract just the number part (after the prefix)
    const awbNumber = awb.includes('-') ? awb.split('-')[1] : awb;
    return `https://www.qrcargo.com/s/track-your-shipment?documentType=MAWB&documentPrefix=157&documentNumber=${awbNumber}`;
  },
  
  // Delta Air Lines
  '006': (awb) => {
    // Format: concatenate all digits including the prefix
    const cleanAwb = awb.replace(/-/g, '');
    return `https://www.deltacargo.com/Cargo/home/trackShipment?awbNumber=${cleanAwb}`;
  },
  
  // American Airlines
  '001': (awb) => {
    // Format: concatenate all digits including the prefix
    const cleanAwb = awb.replace(/-/g, '');
    return `https://www.aacargo.com/mobile/tracking-details.html?awb=${cleanAwb}`;
  }
};

/**
 * Extracts the airline code from an AWB number
 * @param {string} awb - The AWB number (e.g., "114-12345678")
 * @returns {string} The airline code (e.g., "114")
 */
export const getAirlineCode = (awb) => {
  if (!awb || typeof awb !== 'string') return null;
  
  // If AWB contains a dash, extract the part before the dash
  if (awb.includes('-')) {
    return awb.split('-')[0];
  }
  
  // If no dash, try to extract the first 3 digits
  if (awb.length >= 3) {
    return awb.substring(0, 3);
  }
  
  return null;
};

/**
 * Generates a tracking URL for an AWB number
 * @param {string} awb - The AWB number (e.g., "114-12345678")
 * @returns {string|null} The tracking URL or null if the airline is not supported
 */
export const getTrackingUrl = (awb) => {
  if (!awb || typeof awb !== 'string') return null;
  
  // Clean up the AWB by removing any spaces
  const cleanAwb = awb.trim();
  
  // Extract the airline code
  const airlineCode = getAirlineCode(cleanAwb);
  
  // If we have a handler for this airline, generate the URL
  if (airlineCode && AIRLINE_TRACKING[airlineCode]) {
    return AIRLINE_TRACKING[airlineCode](cleanAwb);
  }
  
  // Default fallback for unknown airlines - use a generic tracker
  // This could be replaced with any default tracking service
  return null;
};

/**
 * Checks if an AWB number has a supported tracking URL
 * @param {string} awb - The AWB number
 * @returns {boolean} True if tracking is available
 */
export const hasTracking = (awb) => {
  if (!awb || typeof awb !== 'string') return false;
  
  const airlineCode = getAirlineCode(awb);
  return Boolean(airlineCode && AIRLINE_TRACKING[airlineCode]);
};

export default {
  getTrackingUrl,
  hasTracking,
  getAirlineCode
}; 