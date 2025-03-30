import React, { useState } from 'react';
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

// Define chart types
const CHART_TYPES = {
  SHIPMENT_COUNT: 'shipment_count',
  REVENUE: 'revenue',
  COST: 'cost',
  PROFIT: 'profit'
};

const ShipmentsByCustomerChart = ({ data }) => {
  const [chartType, setChartType] = useState(CHART_TYPES.SHIPMENT_COUNT);
  
  // Preprocess data to add financial information if available
  const processedData = data.map(item => {
    // Default financial values
    let cost = 0;
    let revenue = 0;
    let profit = 0;
    
    // If customer has financial data available (we're assuming this might be in the API data)
    if (item.financials) {
      cost = item.financials.cost || 0;
      revenue = item.financials.revenue || 0;
      profit = revenue - cost;
    }
    
    return {
      ...item,
      cost,
      revenue,
      profit
    };
  });
  
  // Prepare chart data based on selected view
  const prepareChartData = () => {
    let label = 'Number of Shipments';
    let values = processedData.map(item => item.count);
    let backgroundColor = 'rgba(54, 162, 235, 0.6)';
    let borderColor = 'rgba(54, 162, 235, 1)';
    
    switch (chartType) {
      case CHART_TYPES.REVENUE:
        label = 'Revenue (USD)';
        values = processedData.map(item => item.revenue);
        backgroundColor = 'rgba(75, 192, 192, 0.6)';
        borderColor = 'rgba(75, 192, 192, 1)';
        break;
      case CHART_TYPES.COST:
        label = 'Cost (USD)';
        values = processedData.map(item => item.cost);
        backgroundColor = 'rgba(255, 99, 132, 0.6)';
        borderColor = 'rgba(255, 99, 132, 1)';
        break;
      case CHART_TYPES.PROFIT:
        label = 'Profit (USD)';
        values = processedData.map(item => item.profit);
        backgroundColor = processedData.map(item => 
          item.profit >= 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)'
        );
        borderColor = processedData.map(item => 
          item.profit >= 0 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)'
        );
        break;
      default:
        // Default is shipment count, already set
    }
    
    return {
      labels: processedData.map(item => item.customer),
      datasets: [
        {
          label,
          data: values,
          backgroundColor,
          borderColor,
          borderWidth: 1
        }
      ]
    };
  };
  
  const chartData = prepareChartData();

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: true,
        text: 'Shipments by Customer'
      },
      tooltip: {
        callbacks: {
          afterLabel: (context) => {
            const index = context.dataIndex;
            const item = processedData[index];
            
            // Show additional info in tooltip
            const lines = [];
            if (chartType !== CHART_TYPES.SHIPMENT_COUNT) {
              lines.push(`Shipments: ${item.count}`);
            }
            if (chartType !== CHART_TYPES.REVENUE && item.revenue) {
              lines.push(`Revenue: $${item.revenue.toFixed(2)}`);
            }
            if (chartType !== CHART_TYPES.COST && item.cost) {
              lines.push(`Cost: $${item.cost.toFixed(2)}`);
            }
            if (chartType !== CHART_TYPES.PROFIT && item.profit) {
              lines.push(`Profit: $${item.profit.toFixed(2)}`);
            }
            return lines;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div className="customer-chart-container">
      <div className="chart-controls">
        <div className="btn-group">
          <button 
            className={`btn btn-sm ${chartType === CHART_TYPES.SHIPMENT_COUNT ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setChartType(CHART_TYPES.SHIPMENT_COUNT)}
          >
            Shipments
          </button>
          <button 
            className={`btn btn-sm ${chartType === CHART_TYPES.REVENUE ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setChartType(CHART_TYPES.REVENUE)}
          >
            Revenue
          </button>
          <button 
            className={`btn btn-sm ${chartType === CHART_TYPES.COST ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setChartType(CHART_TYPES.COST)}
          >
            Cost
          </button>
          <button 
            className={`btn btn-sm ${chartType === CHART_TYPES.PROFIT ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setChartType(CHART_TYPES.PROFIT)}
          >
            Profit
          </button>
        </div>
      </div>
      <Bar data={chartData} options={options} />
    </div>
  );
};

ShipmentsByCustomerChart.propTypes = {
  data: PropTypes.array.isRequired
};

export default ShipmentsByCustomerChart; 