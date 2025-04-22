import React from 'react';
import { Line } from 'react-chartjs-2';
import PropTypes from 'prop-types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Format date as DD/MM
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

// Format date for tooltip display
const formatFullDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    weekday: 'short'
  });
};

// Group data by day
const processDataByDay = (data) => {
  console.log("Processing data:", data);
  
  // Handle case when data is null or undefined
  if (!data) {
    console.log("No data provided, using empty array");
    data = [];
  }
  
  // Handle case when data comes from public-all endpoint (object structure)
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    console.log("Data is an object, not an array - extracting daily stats");
    // If data is from the public-all endpoint with dailyStats property
    if (data.dailyStats && Array.isArray(data.dailyStats)) {
      data = data.dailyStats;
      console.log("Using dailyStats array:", data);
    } else {
      // Convert object to array if needed
      console.log("Converting object to array format");
      data = Object.entries(data).map(([key, value]) => {
        if (key === 'summary' || key === 'customerData' || key === 'monthlyStats') {
          return null; // Skip these keys
        }
        return {
          date: key,
          count: value.count || 0
        };
      }).filter(Boolean); // Remove null values
    }
  }
  
  // Ensure data is an array
  if (!Array.isArray(data)) {
    console.log("Data is not an array after processing, using empty array");
    data = [];
  }

  // If data is already in daily format, just ensure it's sorted
  if (data.length > 0 && data[0].date) {
    return [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // Convert monthly data to daily data
  const dailyData = [];
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - 30); // Last 30 days

  // Generate entries for the last 30 days
  for (let i = 0; i < 31; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Try to find actual data for this date
    const matchingData = Array.isArray(data) ? data.find(item => {
      if (!item) return false;
      if (item.date) {
        const itemDate = new Date(item.date);
        return itemDate.toISOString().split('T')[0] === dateStr;
      }
      
      // If we have month-based data, check if month matches
      if (item.month) {
        return (item.month === date.getMonth() + 1) && 
               (item.year === date.getFullYear() || !item.year);
      }
      
      return false;
    }) : null;

    let count = 0;
    if (matchingData) {
      count = matchingData.count || 0;
    } else if (Array.isArray(data) && data.length > 0 && data[0].month) {
      // If we have monthly data, distribute it evenly across days
      const monthData = data.find(item => item && item.month === (date.getMonth() + 1));
      if (monthData) {
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        count = Math.max(Math.round(monthData.count / daysInMonth), 0);
      }
    }
    
    // Add to daily data
    dailyData.push({
      date: dateStr,
      count: count,
      // Add day of week for better display
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' })
    });
  }
  
  console.log("Processed daily data:", dailyData);
  return dailyData;
};

const ShipmentsByDateChart = ({ data }) => {
  console.log("Raw date data:", data);
  // Process data to ensure daily format
  const dailyData = processDataByDay(data);
  console.log("Processed daily data for chart:", dailyData);
  
  const chartData = {
    labels: dailyData.map(item => `${formatDate(item.date)} (${item.dayOfWeek})`),
    datasets: [
      {
        label: 'Number of Shipments',
        data: dailyData.map(item => item.count),
        fill: false,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.4,
        pointBackgroundColor: dailyData.map(item => {
          const date = new Date(item.date);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          return isWeekend ? 
            'rgba(54, 162, 235, 0.7)' : 
            'rgba(75, 192, 192, 1)';
        }),
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: true,
        text: 'Shipments by Day (Last 30 Days)'
      },
      tooltip: {
        callbacks: {
          title: (tooltipItems) => {
            const index = tooltipItems[0].dataIndex;
            return formatFullDate(dailyData[index].date);
          },
          label: (context) => {
            return `Shipments: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0 // Show only whole numbers
        },
        title: {
          display: true,
          text: 'Number of Shipments'
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          callback: function(val, index) {
            // Show fewer labels for better readability
            return index % 3 === 0 ? this.getLabelForValue(val) : '';
          }
        },
        title: {
          display: true,
          text: 'Date'
        }
      }
    }
  };

  return (
    <div style={{ height: '400px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

ShipmentsByDateChart.propTypes = {
  data: PropTypes.array.isRequired
};

export default ShipmentsByDateChart; 