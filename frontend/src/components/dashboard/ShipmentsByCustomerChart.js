import React from 'react';
import { Bar } from 'react-chartjs-2';
import PropTypes from 'prop-types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ShipmentsByCustomerChart = ({ data }) => {
  // Sort data by count (highest first)
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  
  // Take top 10 customers only to avoid clutter
  const displayData = sortedData.slice(0, 10);
  
  // Prepare chart data
  const chartData = {
    labels: displayData.map(item => item.customer),
    datasets: [
      {
        label: 'Number of Shipments',
        data: displayData.map(item => item.count || 0),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };
  
  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Shipments by Customer'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return `Shipments: ${value}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0 // Only show whole numbers
        }
      }
    }
  };

  return (
    <div style={{ height: '400px' }}>
      {displayData.length > 0 ? (
        <Bar data={chartData} options={options} />
      ) : (
        <p>No data available</p>
      )}
    </div>
  );
};

ShipmentsByCustomerChart.propTypes = {
  data: PropTypes.array.isRequired
};

export default ShipmentsByCustomerChart; 