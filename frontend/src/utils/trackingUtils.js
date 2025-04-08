/**
 * Utility functions for generating airline tracking URLs
 */
import axios from './axiosConfig';

// Cache for airline data to reduce API calls
let airlineCache = {};
let cacheExpiration = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Loads airline data from the API and caches it
 * @param {boolean} forceRefresh - Whether to force a refresh of the cache
 * @param {number} retryCount - Current retry count for error handling
 * @returns {Promise<Object>} A map of airline codes to their data
 */
export const loadAirlines = async (forceRefresh = false, retryCount = 0) => {
  // Check if we have a valid cache
  const now = new Date().getTime();
  if (!forceRefresh && cacheExpiration && now < cacheExpiration && Object.keys(airlineCache).length > 0) {
    return airlineCache;
  }
  
  try {
    const res = await axios.get('/api/airlines');
    
    if (!res.data || !Array.isArray(res.data)) {
      throw new Error('Invalid response format from airline API');
    }
    
    // Transform the array to a map keyed by airline code
    airlineCache = res.data.reduce((map, airline) => {
      if (airline.status === 'active') {
        map[airline.code] = airline;
      }
      return map;
    }, {});
    
    // Set cache expiration
    cacheExpiration = now + CACHE_DURATION;
    
    return airlineCache;
  } catch (err) {
    console.error('Error loading airline data:', err);
    
    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying airline data load (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return loadAirlines(forceRefresh, retryCount + 1);
    }
    
    // If we have cached data, return it even if expired
    if (Object.keys(airlineCache).length > 0) {
      console.log('Returning expired cache due to API failure');
      return airlineCache;
    }
    
    throw new Error('Failed to load airline data after multiple retries');
  }
};

// Keep backward compatibility with hardcoded tracking URLs
const HARDCODED_TRACKING = {
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
 * Gets a tracking URL for an airline and AWB number
 * @param {string} airlineCode - The airline's code
 * @param {string} awbNumber - The AWB number
 * @returns {string} The tracking URL
 */
export const getTrackingUrl = async (airlineCode, awbNumber) => {
  try {
    const airlines = await loadAirlines();
    const airline = airlines[airlineCode];
    
    if (!airline) {
      throw new Error(`Airline with code ${airlineCode} not found`);
    }
    
    if (!airline.trackingUrlTemplate) {
      throw new Error(`No tracking URL template for airline ${airlineCode}`);
    }
    
    return airline.trackingUrlTemplate.replace('{awb}', awbNumber);
  } catch (err) {
    console.error('Error generating tracking URL:', err);
    throw err;
  }
};

/**
 * Generates a tracking URL for an AWB number
 * @param {string} awb - The AWB number (e.g., "114-12345678")
 * @returns {string|null} The tracking URL or null if the airline is not supported
 */
export const getTrackingUrlByAwb = async (awb) => {
  if (!awb || typeof awb !== 'string') return null;
  
  // Clean up the AWB by removing any spaces
  const cleanAwb = awb.trim();
  
  // Extract the airline code
  const airlineCode = getAirlineCode(cleanAwb);
  if (!airlineCode) return null;
  
  // Try to get airline data from cache or API
  const airlines = await loadAirlines();
  
  // If we have airline data in the database, use its template
  if (airlines[airlineCode]) {
    return getTrackingUrl(airlineCode, cleanAwb.split('-')[1]);
  }
  
  // Fall back to hardcoded tracking if available
  if (HARDCODED_TRACKING[airlineCode]) {
    return HARDCODED_TRACKING[airlineCode](cleanAwb);
  }
  
  // No tracking available
  return null;
};

/**
 * Synchronous version of getTrackingUrl that only uses the cache
 * Used for rendering components where async may not be practical
 * @param {string} carrierName - The carrier/airline name
 * @param {string} awb - The AWB number 
 * @returns {string|null} The tracking URL or null
 */
export const getTrackingUrlSync = (carrierName, awb) => {
  if (!awb || typeof awb !== 'string') return null;
  
  const cleanAwb = awb.trim();
  const airlineCode = getAirlineCode(cleanAwb);
  if (!airlineCode) return null;
  
  // If we have carrier name, look for matching airline in hardcoded list
  if (carrierName && typeof carrierName === 'string') {
    const carrierLower = carrierName.toLowerCase();
    
    // Match carrier name to code
    if (carrierLower.includes('el al') && HARDCODED_TRACKING['114']) {
      return HARDCODED_TRACKING['114'](cleanAwb);
    }
    if (carrierLower.includes('emirates') && HARDCODED_TRACKING['176']) {
      return HARDCODED_TRACKING['176'](cleanAwb);
    }
    if (carrierLower.includes('qatar') && HARDCODED_TRACKING['157']) {
      return HARDCODED_TRACKING['157'](cleanAwb);
    }
    if (carrierLower.includes('delta') && HARDCODED_TRACKING['006']) {
      return HARDCODED_TRACKING['006'](cleanAwb);
    }
    if (carrierLower.includes('american') && HARDCODED_TRACKING['001']) {
      return HARDCODED_TRACKING['001'](cleanAwb);
    }
  }
  
  // Try from cache first
  if (airlineCache[airlineCode]) {
    return getTrackingUrl(airlineCode, cleanAwb.split('-')[1]);
  }
  
  // Fall back to hardcoded based on AWB code
  if (HARDCODED_TRACKING[airlineCode]) {
    return HARDCODED_TRACKING[airlineCode](cleanAwb);
  }
  
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
  if (!airlineCode) return false;
  
  // Check if we have this airline in cache
  if (airlineCache[airlineCode]) return true;
  
  // Fall back to hardcoded
  return Boolean(HARDCODED_TRACKING[airlineCode]);
};

// Load airlines on module initialization
loadAirlines();

export default {
  getTrackingUrl,
  getTrackingUrlByAwb,
  getTrackingUrlSync,
  hasTracking,
  getAirlineCode,
  loadAirlines
}; 