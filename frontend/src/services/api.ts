import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

// Interceptor to inject JWT bearer token into every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle token refresh on 401 response
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error status is 401, not already retried, and a refresh token exists
    if (error.response?.status === 401 && !originalRequest._retry && localStorage.getItem('refreshToken')) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        // Request a new access token
        const res = await axios.post((import.meta.env.VITE_API_URL || '') + '/auth/refresh', {
          refreshToken,
        });
        
        if (res.status === 200 && res.data.token) {
          localStorage.setItem('token', res.data.token);
          if (res.data.refreshToken) {
            localStorage.setItem('refreshToken', res.data.refreshToken);
          }
          originalRequest.headers.Authorization = `Bearer ${res.data.token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Refresh token failed', refreshError);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth'; // Redirect to login
      }
    }
    return Promise.reject(error);
  }
);

export interface ValidationError {
  field: string;
  message: string;
}

export const extractErrorMessage = (err: any, fallbackMessage: string = 'Action failed. Please try again.'): string => {
  if (err?.response?.data) {
    const data = err.response.data;
    
    // Check if it's a validation error with structured errors array
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors
        .map((error: any) => {
          let fieldName = error.field || 'Unknown';
          // Strip common prefixes like 'body.', 'query.', 'params.'
          fieldName = fieldName.replace(/^(body|query|params)\./i, '');
          
          if (fieldName.toLowerCase() === 'usn') {
            fieldName = 'USN';
          } else {
            // Capitalize first letter
            fieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
          }
          
          return `Field: ${fieldName}\nReason: ${error.message}`;
        })
        .join('\n\n');
    }
    
    // If it's a single message (e.g., standard error message from backend)
    if (data.message) {
      return data.message;
    }
  }
  
  // Fallback if no detailed errors are available
  return err?.message || fallbackMessage;
};

export default api;
