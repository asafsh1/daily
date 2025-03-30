import React, { useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import PropTypes from 'prop-types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const ShipmentsByCustomerChart = ({ data }) => {
  const [chartType, setChartType] = useState('bar');
  
  // Sort data by count (highest first)
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  
  // Calculate total shipments for percentages
  const totalShipments = sortedData.reduce((sum, item) => sum + (item.count || 0), 0);
  
  // Take top 7 customers and group the rest as "Others"
  let displayData = sortedData.slice(0, 7);
  
  // If there are more than 7 customers, add an "Others" category
  if (sortedData.length > 7) {
    const othersCount = sortedData
      .slice(7)
      .reduce((sum, item) => sum + (item.count || 0), 0);
      
    if (othersCount > 0) {
      displayData.push({
        customer: 'Others',
        count: othersCount
      });
    }
  }
  
  // Calculate percentages
  displayData = displayData.map(item => ({
    ...item,
    percentage: ((item.count / totalShipments) * 100).toFixed(1)
  }));
  
  // Create color palette - use a consistent color for each customer
  const backgroundColors = [
    'rgba(54, 162, 235, 0.7)',
    'rgba(75, 192, 192, 0.7)',
    'rgba(255, 206, 86, 0.7)',
    'rgba(153, 102, 255, 0.7)',
    'rgba(255, 159, 64, 0.7)',
    'rgba(255, 99, 132, 0.7)',
    'rgba(199, 199, 199, 0.7)',
    'rgba(83, 166, 106, 0.7)'
  ];
  
  const borderColors = backgroundColors.map(color => color.replace('0.7', '1'));
  
  // Data for Bar chart
  const barChartData = {
    labels: displayData.map(item => item.customer),
    datasets: [
      {
        label: 'Number of Shipments',
        data: displayData.map(item => item.count || 0),
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1
      }
    ]
  };
  
  // Data for Pie chart
  const pieChartData = {
    labels: displayData.map(item => `${item.customer} (${item.percentage}%)`),
    datasets: [
      {
        data: displayData.map(item => item.count || 0),
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1
      }
    ]
  };
  
  // Common chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        display: chartType === 'pie' // Only show legend for pie chart
      },
      title: {
        display: true,
        text: 'Shipments by Customer'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            const percentage = displayData[context.dataIndex].percentage;
            return `Shipments: ${value} (${percentage}% of total)`;
          }
        }
      }
    },
    scales: chartType === 'bar' ? {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0 // Only show whole numbers
        },
        title: {
          display: true,
          text: 'Number of Shipments'
        }
      },
      x: {
        ticks: {
          autoSkip: false,
          maxRotation: 45,
          minRotation: 45
        }
      }
    } : undefined // No scales for pie chart
  };

  // Toggle between chart types
  const handleToggleChart = () => {
    setChartType(chartType === 'bar' ? 'pie' : 'bar');
  };

  return (
    <div>
      <div className="chart-controls mb-3">
        <button 
          className={`btn btn-sm ${chartType === 'bar' ? 'btn-primary' : 'btn-outline-primary'}`} 
          onClick={() => setChartType('bar')}
        >
          Bar Chart
        </button>
        <button 
          className={`btn btn-sm ml-2 ${chartType === 'pie' ? 'btn-primary' : 'btn-outline-primary'}`} 
          onClick={() => setChartType('pie')}
        >
          Pie Chart
        </button>
      </div>
    
      <div style={{ height: '350px' }}>
        {displayData.length > 0 ? (
          chartType === 'bar' ? 
            <Bar data={barChartData} options={options} /> : 
            <Pie data={pieChartData} options={options} />
        ) : (
          <p>No data available</p>
        )}
      </div>
      
      {displayData.length > 0 && (
        <div className="chart-summary mt-2">
          <small className="text-muted">
            {sortedData.length > 7 
              ? `Showing top 7 customers and grouping ${sortedData.length - 7} others` 
              : `Showing all ${sortedData.length} customers`
            }
          </small>
        </div>
      )}
    </div>
  );
};

ShipmentsByCustomerChart.propTypes = {
  data: PropTypes.array.isRequired
};

export default ShipmentsByCustomerChart; 