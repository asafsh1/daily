import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

const ShipmentsByOriginChart = ({ data }) => {
  const [displayType, setDisplayType] = useState('profit'); // profit or margin

  const processOriginData = (shipments) => {
    const originData = {};

    // Process each shipment
    shipments.forEach(shipment => {
      // Skip if no legs or financial data is missing
      if (!shipment.legs || !shipment.legs.length || 
          shipment.totalRevenue === undefined || 
          shipment.totalCost === undefined) {
        return;
      }

      // Get origin from first leg
      const origin = shipment.legs[0].origin;
      if (!origin) return;

      // Initialize data for this origin if not exists
      if (!originData[origin]) {
        originData[origin] = {
          count: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          margin: 0
        };
      }

      // Add shipment data
      originData[origin].count += 1;
      originData[origin].revenue += parseFloat(shipment.totalRevenue) || 0;
      originData[origin].cost += parseFloat(shipment.totalCost) || 0;
    });

    // Calculate profit and margin for each origin
    Object.keys(originData).forEach(origin => {
      const data = originData[origin];
      data.profit = data.revenue - data.cost;
      data.margin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
    });

    // Sort by count and get top 10
    return Object.entries(originData)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([origin, data]) => ({
        origin,
        ...data
      }));
  };

  const processedData = processOriginData(data);
  
  // Prepare chart data
  const chartData = {
    labels: processedData.map(item => item.origin),
    datasets: [
      {
        type: 'bar',
        label: 'Shipment Count',
        data: processedData.map(item => item.count),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: displayType === 'profit' ? 'Profit %' : 'Margin %',
        data: processedData.map(item => displayType === 'profit' ? 
          (item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0) : 
          item.margin),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        yAxisID: 'y1',
        datalabels: {
          display: false
        }
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Shipment Count'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: displayType === 'profit' ? 'Profit %' : 'Margin %'
        },
        grid: {
          drawOnChartArea: false,
        },
        min: 0,
        max: 100
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (context.datasetIndex === 0) {
              return `${label}: ${value} shipments`;
            } else {
              return `${label}: ${value.toFixed(2)}%`;
            }
          }
        }
      },
      legend: {
        position: 'top',
      },
      datalabels: {
        display: function(context) {
          // Only show datalabels for the bar chart
          return context.datasetIndex === 0;
        },
        color: '#000',
        font: {
          weight: 'bold'
        },
        formatter: function(value) {
          return value;
        },
        anchor: 'end',
        align: 'top',
        offset: 4
      }
    }
  };

  return (
    <div className="origin-chart-container">
      <div className="chart-controls mb-3">
        <div className="btn-group">
          <button 
            className={`btn ${displayType === 'profit' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setDisplayType('profit')}
          >
            Show Profit %
          </button>
          <button 
            className={`btn ${displayType === 'margin' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setDisplayType('margin')}
          >
            Show Margin %
          </button>
        </div>
      </div>
      
      <div style={{ height: '400px' }}>
        <Bar data={chartData} options={options} />
      </div>
      
      {processedData.length === 0 && (
        <div className="alert alert-info mt-3">
          No origin data available. Make sure shipments have legs with origin information.
        </div>
      )}
    </div>
  );
};

export default ShipmentsByOriginChart; 