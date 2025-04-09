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
    console.log('Using cached airline data', Object.keys(airlineCache).length);
    return airlineCache;
  }
  
  try {
    console.log('Fetching airlines from API');
    const res = await axios.get('/api/airlines');
    
    if (!res.data || !Array.isArray(res.data)) {
      console.error('Invalid response format from airline API');
      throw new Error('Invalid response format from airline API');
    }
    
    if (res.data.length === 0) {
      console.warn('No airlines found in API response');
    }
    
    // Transform the array to a map keyed by airline code
    airlineCache = res.data.reduce((map, airline) => {
      if (airline.status === 'active') {
        // Ensure code is trimmed and normalized
        if (airline.code) {
          const normalizedCode = airline.code.trim();
          map[normalizedCode] = airline;
        }
      }
      return map;
    }, {});
    
    // Add hardcoded airlines if they don't exist in the DB
    Object.keys(HARDCODED_TRACKING).forEach(code => {
      if (!airlineCache[code]) {
        // Create a synthetic airline entry
        airlineCache[code] = {
          code: code,
          name: AIRLINE_NAMES[code] || `Airline ${code}`,
          status: 'active',
          _hardcoded: true,
          trackingUrlTemplate: 'hardcoded'
        };
      }
    });
    
    console.log(`Loaded ${Object.keys(airlineCache).length} airlines (${res.data.length} from API)`);
    
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
    
    // In case of complete failure, add hardcoded tracking as fallback
    const fallbackCache = {};
    Object.keys(HARDCODED_TRACKING).forEach(code => {
      fallbackCache[code] = {
        code: code,
        name: AIRLINE_NAMES[code] || `Airline ${code}`,
        status: 'active',
        _hardcoded: true,
        trackingUrlTemplate: 'hardcoded'
      };
    });
    
    console.log(`Using fallback hardcoded airlines (${Object.keys(fallbackCache).length})`);
    airlineCache = fallbackCache;
    cacheExpiration = now + CACHE_DURATION;
    
    return fallbackCache;
  }
};

// Map of airline codes to names for hardcoded entries
const AIRLINE_NAMES = {
  '114': 'El Al Airlines',
  '176': 'Emirates Airlines',
  '157': 'Qatar Airways',
  '006': 'Delta Air Lines',
  '001': 'American Airlines'
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
  
  // Clean up the input
  const cleanAwb = awb.trim();
  
  // If AWB contains a dash, extract the part before the dash
  if (cleanAwb.includes('-')) {
    const code = cleanAwb.split('-')[0];
    // Validate that we have a 3-digit code
    return /^\d{3}$/.test(code) ? code : null;
  }
  
  // If no dash and length is at least 11-12 digits (standard AWB), extract first 3 
  if (cleanAwb.length >= 11 && /^\d+$/.test(cleanAwb)) {
    return cleanAwb.substring(0, 3);
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
  if (!airlineCode || !awbNumber) {
    console.warn('Missing airlineCode or awbNumber for tracking URL');
    return null;
  }
  
  try {
    // Clean up inputs
    const code = airlineCode.toString().trim();
    const awb = awbNumber.toString().trim();
    
    // Load airlines data
    const airlines = await loadAirlines();
    
    // Check if we have this airline in our database
    const airline = airlines[code];
    
    if (airline) {
      if (airline._hardcoded && HARDCODED_TRACKING[code]) {
        // Use hardcoded tracking function
        return HARDCODED_TRACKING[code](awb);
      } else if (airline.trackingUrlTemplate) {
        // Use template from database
        // Extract the AWB number portion if needed (after the prefix)
        const awbNumberPart = awb.includes('-') ? awb.split('-')[1] : awb;
        return airline.trackingUrlTemplate.replace('{awb}', awbNumberPart);
      }
    }
    
    // Fall back to hardcoded if available
    if (HARDCODED_TRACKING[code]) {
      return HARDCODED_TRACKING[code](awb);
    }
    
    console.warn(`No tracking template found for airline code ${code}`);
    return null;
  } catch (err) {
    console.error('Error generating tracking URL:', err);
    
    // Last attempt - try hardcoded
    try {
      if (HARDCODED_TRACKING[airlineCode.trim()]) {
        return HARDCODED_TRACKING[airlineCode.trim()](awbNumber.trim());
      }
    } catch (hardcodedErr) {
      console.error('Hardcoded tracking failed:', hardcodedErr);
    }
    
    return null;
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
  
  return getTrackingUrl(airlineCode, cleanAwb);
};

/**
 * Synchronous version of getTrackingUrl that only uses the cache
 * Used for rendering components where async may not be practical
 * @param {string} airlineCode - The airline code or name
 * @param {string} awb - The AWB number 
 * @returns {string|null} The tracking URL or null
 */
export const getTrackingUrlSync = (airlineCode, awb) => {
  if (!awb || typeof awb !== 'string' || !airlineCode) return null;
  
  const cleanAwb = awb.trim();
  let code = null;
  
  // If airlineCode is a numeric code, use it directly
  if (/^\d{3}$/.test(airlineCode.trim())) {
    code = airlineCode.trim();
  } else {
    // If airlineCode is a carrier name, try to match it
    code = matchCarrierNameToCode(airlineCode);
    if (!code) {
      // Try to extract from AWB
      code = getAirlineCode(cleanAwb);
    }
  }
  
  if (!code) return null;
  
  // Check if we have this airline in cache
  if (airlineCache[code]) {
    const airline = airlineCache[code];
    if (airline._hardcoded && HARDCODED_TRACKING[code]) {
      return HARDCODED_TRACKING[code](cleanAwb);
    } else if (airline.trackingUrlTemplate) {
      const awbNumberPart = cleanAwb.includes('-') ? cleanAwb.split('-')[1] : cleanAwb;
      return airline.trackingUrlTemplate.replace('{awb}', awbNumberPart);
    }
  }
  
  // Fall back to hardcoded based on code
  if (HARDCODED_TRACKING[code]) {
    return HARDCODED_TRACKING[code](cleanAwb);
  }
  
  return null;
};

/**
 * Attempts to match carrier name to a code
 * @param {string} carrierName - The carrier/airline name
 * @returns {string|null} The airline code or null
 */
const matchCarrierNameToCode = (carrierName) => {
  if (!carrierName || typeof carrierName !== 'string') return null;
  
  const carrierLower = carrierName.toLowerCase();
  
  // Match carrier name to code
  if (carrierLower.includes('el al')) return '114';
  if (carrierLower.includes('emirates')) return '176';
  if (carrierLower.includes('qatar')) return '157';
  if (carrierLower.includes('delta')) return '006';
  if (carrierLower.includes('american')) return '001';
  
  // Check cache for name match
  for (const code in airlineCache) {
    if (airlineCache[code].name && 
        airlineCache[code].name.toLowerCase().includes(carrierLower)) {
      return code;
    }
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