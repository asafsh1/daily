/**
 * Utility functions for exporting data to various formats
 */

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} headers - Array of header objects with key and display properties
 * @returns {String} CSV formatted string
 */
export const convertToCSV = (data, headers) => {
  if (!data || !data.length) return '';

  // Create header row with display names
  const headerRow = headers.map(header => `"${header.display}"`).join(',');
  
  // Create data rows
  const rows = data.map(item => {
    return headers.map(header => {
      let value = item[header.key];
      
      // Handle dates
      if (header.isDate && value) {
        const date = new Date(value);
        if (!isNaN(date)) {
          value = date.toLocaleDateString();
        }
      }
      
      // Handle null or undefined values
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Escape double quotes and wrap in quotes to handle commas in data
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  }).join('\n');

  return `${headerRow}\n${rows}`;
};

/**
 * Download CSV data as a file
 * @param {String} csvContent - CSV formatted string
 * @param {String} fileName - Name for the downloaded file
 */
export const downloadCSV = (csvContent, fileName) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; 