import axios from 'axios';
import { toast } from 'react-toastify';

// Get the API base URL from environment variables
const apiBaseUrl = process.env.REACT_APP_API_URL || 'https://daily-shipment-tracker.onrender.com';

if (!apiBaseUrl) {
  console.error('REACT_APP_API_URL is not defined in environment variables, using default');
}

console.log('Using API base URL:', apiBaseUrl);

// Track if we're currently getting a new token to avoid infinite loops
let isRefreshingToken = false;
let emergencyTokenAttempted = false;

// Function to get a new token
const getNewToken = async () => {
  if (isRefreshingToken) {
    console.log('Token refresh already in progress, waiting...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return localStorage.getItem('token');
  }
  
  isRefreshingToken = true;
  try {
    // Try emergency token endpoint first if not already attempted
    if (!emergencyTokenAttempted) {
      emergencyTokenAttempted = true;
      try {
        console.log('Trying emergency token endpoint...');
        const response = await axios.get(`${apiBaseUrl}/api/auth/emergency-token`);
        if (response.data && response.data.token) {
          console.log('Got emergency token successfully');
          localStorage.setItem('token', response.data.token);
          return response.data.token;
        }
      } catch (emergencyErr) {
        console.log('Emergency token endpoint failed, trying standard endpoints...', emergencyErr.message);
      }
    }
    
    // Try GET method 
    try {
      const response = await axios.get(`${apiBaseUrl}/api/auth/get-dev-token`);
      if (response.data && response.data.token) {
        console.log('Got new token from GET endpoint');
        localStorage.setItem('token', response.data.token);
        return response.data.token;
      }
    } catch (getErr) {
      console.log('GET token failed, trying POST');
    }
    
    // Try POST method
    try {
      const response = await axios.post(`${apiBaseUrl}/api/auth/get-dev-token`);
      if (response.data && response.data.token) {
        console.log('Got new token from POST endpoint');
        localStorage.setItem('token', response.data.token);
        return response.data.token;
      }
    } catch (postErr) {
      console.log('POST token failed, trying public diagnostics');
    }
    
    // Try public diagnostics as last resort
    try {
      const diagResponse = await axios.get(`${apiBaseUrl}/api/dashboard/public-diagnostics`);
      if (diagResponse.data && diagResponse.data.auth && diagResponse.data.auth.devToken) {
        console.log('Got new token from public diagnostics');
        localStorage.setItem('token', diagResponse.data.auth.devToken);
        return diagResponse.data.auth.devToken;
      }
    } catch (diagErr) {
      console.log('Public diagnostics failed:', diagErr.message);
    }
    
    console.log('All token retrieval methods failed');
    return null;
  } catch (error) {
    console.error('Failed to get new token:', error);
    return null;
  } finally {
    isRefreshingToken = false;
  }
};

// Helper to determine if a URL is for a public endpoint
const isPublicEndpoint = (url) => {
  const publicEndpoints = [
    '/api/auth/emergency-token',
    '/api/auth/get-dev-token',
    '/api/dashboard/public-',
    '/api/dashboard/public-all',
    '/api/customers/public',
    '/api/users/public',
    '/api/airlines'
  ];
  
  return publicEndpoints.some(endpoint => url.includes(endpoint));
};

// Helper to convert authenticated endpoint to public alternative
const getPublicAlternative = (url) => {
  // Map of authenticated endpoints to their public alternatives
  const publicMappings = {
    '/api/dashboard/summary': '/api/dashboard/public-summary',
    '/api/dashboard/shipments-by-date': '/api/dashboard/public-all',
    '/api/dashboard/shipments-by-customer': '/api/dashboard/public-all',
    '/api/customers': '/api/customers/public',
    '/api/users': '/api/users/public',
    '/api/shipments': '/api/shipments/public'
  };
  
  // Check for exact matches
  for (const [authUrl, publicUrl] of Object.entries(publicMappings)) {
    if (url === authUrl || url.startsWith(authUrl + '?')) {
      return publicUrl;
    }
  }
  
  // Special handling for shipment details with ID
  if (url.match(/\/api\/shipments\/[a-zA-Z0-9]+/)) {
    // Extract the ID from the URL
    const id = url.split('/').pop();
    return `/api/shipments/public/${id}`;
  }
  
  // If no match, return the original URL
  return null;
};

// Create axios instance with base URL and default config
const instance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 90000, // 90 seconds (increased from 60 seconds)
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Enable sending cookies with requests
});

// Add request interceptor to include auth token
instance.interceptors.request.use(
  (config) => {
    // Skip auth header for token endpoints or public endpoints
    if (config.url.includes('/get-dev-token') || 
        config.url.includes('/public-diagnostics') ||
        config.url.includes('/emergency-token')) {
      return config;
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
      // Also use Authorization header as fallback
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Add additional debugging for shipment endpoints
    if (config.url.includes('/shipments')) {
      console.log(`📦 Shipment API Request: ${config.method.toUpperCase()} ${config.url}`, config.data ? 'With data' : 'No data');
      if (config.data) {
        console.log('Shipment request payload:', JSON.stringify(config.data).substring(0, 500) + '...');
      }
    } else {
      // Log other outgoing requests
      console.log(`🚀 API Request: ${config.method.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
instance.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    console.log(`✅ API Response: ${response.config.method.toUpperCase()} ${response.config.url}`, response.status);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Add detailed error logging to help with debugging
    console.error('API error details:', {
      url: originalRequest ? originalRequest.url : 'No URL',
      method: originalRequest ? originalRequest.method : 'No method',
      status: error.response ? error.response.status : 'No status',
      data: error.response ? error.response.data : 'No data',
      message: error.message || 'No message'
    });
    
    // Handle timeout errors specifically
    if (error.code === 'ECONNABORTED' && error.message && error.message.includes('timeout')) {
      console.log(`Request timeout for ${originalRequest.url}, attempting retry...`);
      
      // Prevent multiple retries
      if (!originalRequest._timeoutRetry) {
        originalRequest._timeoutRetry = true;
        
        // Check if there's a public alternative for this endpoint
        const publicUrl = getPublicAlternative(originalRequest.url);
        if (publicUrl && !originalRequest.url.includes('/public/')) {
          console.log(`Timeout occurred, trying public endpoint: ${publicUrl}`);
          return instance.get(publicUrl);
        }
        
        // Retry the original request with increased timeout
        console.log(`Retrying original request with increased timeout`);
        originalRequest.timeout = 90000; // 90 seconds for retry
        return instance(originalRequest);
      }
    }
    
    // Prevent infinite retry loop
    if (originalRequest._retry) {
      // Check if there's a public alternative for this endpoint
      const publicUrl = getPublicAlternative(originalRequest.url);
      if (publicUrl) {
        console.log(`Authenticated endpoint failed after retry, using public alternative: ${publicUrl}`);
        // Create a new request to the public endpoint
        return instance.get(publicUrl);
      }
      return Promise.reject(error);
    }

    // Try to get a new token on 401 errors
    if (error.response && error.response.status === 401) {
      // Check if there's a public alternative for this endpoint first
      const publicUrl = getPublicAlternative(originalRequest.url);
      if (publicUrl) {
        console.log(`Auth error (401), using public endpoint first: ${publicUrl}`);
        // Try the public endpoint
        return instance.get(publicUrl);
      }
      
      // If no public alternative or we specifically want to retry with auth
      if (!isRefreshingToken) {
        originalRequest._retry = true;
        
        const newToken = await getNewToken();
        
        if (newToken) {
          // Update request header with new token
          originalRequest.headers['x-auth-token'] = newToken;
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          
          // Retry the original request
          return instance(originalRequest);
        } else {
          console.error('Authentication error: Failed to get new token');
          // Don't show error toast for shipment form to prevent redirect
          if (!originalRequest.url.includes('/api/shipments/')) {
            toast.error('Authentication error: Please try refreshing the page');
          }
        }
      }
    }
    
    if (error.response) {
      // Handle specific error cases
      switch (error.response.status) {
        case 401:
          // Already handled above
          console.error('Authentication error: You need to be logged in');
          break;
        case 404:
          // Not found error - might be an API path issue
          console.error('Resource not found:', error.response.data);
          break;
        case 403:
          // Forbidden error
          console.error('Access forbidden:', error.response.data);
          toast.error('You do not have permission to perform this action');
          break;
        case 503:
          // Service Unavailable - likely database connection issue
          console.error('Database connection error:', error.response.data.msg);
          break;
        default:
          // Log other errors
          console.error('API Error:', error.response.data);
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request);
      toast.error('Server not responding. Please try again later.');
    } else {
      // Error in request configuration
      console.error('Request configuration error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default instance; 