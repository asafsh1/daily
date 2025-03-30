import React, { useState, useEffect } from 'react';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import PropTypes from 'prop-types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// Define chart types and view modes
const CHART_TYPES = {
  SHIPMENT_COUNT: 'shipment_count',
  REVENUE: 'revenue',
  COST: 'cost',
  PROFIT: 'profit',
  PERCENTAGE: 'percentage'
};

const VIEW_MODES = {
  BAR: 'bar',
  PIE: 'pie',
  DOUGHNUT: 'doughnut'
};

const ShipmentsByCustomerChart = ({ data }) => {
  const [chartType, setChartType] = useState(CHART_TYPES.SHIPMENT_COUNT);
  const [viewMode, setViewMode] = useState(VIEW_MODES.BAR);
  const [sortedData, setSortedData] = useState([]);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [totalStats, setTotalStats] = useState({
    shipments: 0,
    revenue: 0,
    cost: 0,
    profit: 0
  });
  
  // Calculate real financial data from API data when available
  useEffect(() => {
    // Process data for chart visualization
    const processedData = data.map(item => {
      // Default financial values
      let cost = 0;
      let revenue = 0;
      
      // If customer has financial data available
      if (item.financials) {
        cost = item.financials.cost || 0;
        revenue = item.financials.revenue || 0;
      }
      
      return {
        ...item,
        cost,
        revenue,
        profit: revenue - cost,
        percentage: 0 // Will be calculated below
      };
    });
    
    // Calculate totals for percentages and summary
    const totals = processedData.reduce((acc, item) => {
      return {
        shipments: acc.shipments + (item.count || 0),
        revenue: acc.revenue + (item.revenue || 0),
        cost: acc.cost + (item.cost || 0),
        profit: acc.profit + ((item.revenue || 0) - (item.cost || 0))
      };
    }, { shipments: 0, revenue: 0, cost: 0, profit: 0 });
    
    setTotalStats(totals);
    
    // Calculate percentages
    const withPercentages = processedData.map(item => ({
      ...item,
      countPercentage: totals.shipments ? ((item.count || 0) / totals.shipments) * 100 : 0,
      revenuePercentage: totals.revenue ? ((item.revenue || 0) / totals.revenue) * 100 : 0,
      costPercentage: totals.cost ? ((item.cost || 0) / totals.cost) * 100 : 0,
      profitPercentage: totals.profit ? ((item.profit || 0) / totals.profit) * 100 : 0
    }));
    
    // Sort by the current chart type
    const sorted = [...withPercentages].sort((a, b) => {
      switch (chartType) {
        case CHART_TYPES.REVENUE:
          return (b.revenue || 0) - (a.revenue || 0);
        case CHART_TYPES.COST:
          return (b.cost || 0) - (a.cost || 0);
        case CHART_TYPES.PROFIT:
          return (b.profit || 0) - (a.profit || 0);
        case CHART_TYPES.PERCENTAGE:
          return b.countPercentage - a.countPercentage;
        default:
          return (b.count || 0) - (a.count || 0);
      }
    });
    
    setSortedData(sorted);
  }, [data, chartType]);

  // Get the data to display (limited or all)
  const getDisplayData = () => {
    if (showAllCustomers || sortedData.length <= 5) {
      return sortedData;
    }
    
    // If showing limited data, get top 5
    const topCustomers = sortedData.slice(0, 5);
    
    // If there are more than 5 customers, add an "Others" category
    if (sortedData.length > 5) {
      const others = sortedData.slice(5).reduce((acc, item) => {
        return {
          customer: 'Others',
          count: (acc.count || 0) + (item.count || 0),
          revenue: (acc.revenue || 0) + (item.revenue || 0),
          cost: (acc.cost || 0) + (item.cost || 0),
          profit: (acc.profit || 0) + (item.profit || 0),
          countPercentage: (acc.countPercentage || 0) + (item.countPercentage || 0),
          revenuePercentage: (acc.revenuePercentage || 0) + (item.revenuePercentage || 0),
          costPercentage: (acc.costPercentage || 0) + (item.costPercentage || 0),
          profitPercentage: (acc.profitPercentage || 0) + (item.profitPercentage || 0)
        };
      }, {});
      
      return [...topCustomers, others];
    }
    
    return topCustomers;
  };
  
  // Prepare chart data based on selected options
  const prepareChartData = () => {
    const displayData = getDisplayData();
    let label, values, backgroundColor, borderColor;
    
    switch (chartType) {
      case CHART_TYPES.REVENUE:
        label = 'Revenue (USD)';
        values = displayData.map(item => item.revenue || 0);
        backgroundColor = 'rgba(75, 192, 192, 0.6)';
        borderColor = 'rgba(75, 192, 192, 1)';
        break;
      case CHART_TYPES.COST:
        label = 'Cost (USD)';
        values = displayData.map(item => item.cost || 0);
        backgroundColor = 'rgba(255, 99, 132, 0.6)';
        borderColor = 'rgba(255, 99, 132, 1)';
        break;
      case CHART_TYPES.PROFIT:
        label = 'Profit (USD)';
        values = displayData.map(item => item.profit || 0);
        backgroundColor = displayData.map(item => 
          (item.profit || 0) >= 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)'
        );
        borderColor = displayData.map(item => 
          (item.profit || 0) >= 0 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)'
        );
        break;
      case CHART_TYPES.PERCENTAGE:
        label = 'Percentage of Business';
        values = displayData.map(item => item.countPercentage || 0);
        backgroundColor = [
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(199, 199, 199, 0.6)'
        ];
        borderColor = [
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(199, 199, 199, 1)'
        ];
        break;
      default: // SHIPMENT_COUNT
        label = 'Number of Shipments';
        values = displayData.map(item => item.count || 0);
        backgroundColor = 'rgba(54, 162, 235, 0.6)';
        borderColor = 'rgba(54, 162, 235, 1)';
    }
    
    // For pie/doughnut charts, ensure colors are arrays
    if (viewMode !== VIEW_MODES.BAR && !Array.isArray(backgroundColor)) {
      backgroundColor = displayData.map((_, i) => [
        'rgba(54, 162, 235, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(153, 102, 255, 0.6)',
        'rgba(255, 159, 64, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(199, 199, 199, 0.6)'
      ][i % 7]);
      
      borderColor = displayData.map((_, i) => [
        'rgba(54, 162, 235, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(199, 199, 199, 1)'
      ][i % 7]);
    }
    
    return {
      labels: displayData.map(item => item.customer),
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

  // Define chart options
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        display: viewMode !== VIEW_MODES.BAR
      },
      title: {
        display: true,
        text: getChartTitle()
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const index = context.dataIndex;
            const item = getDisplayData()[index];
            
            if (viewMode !== VIEW_MODES.BAR) {
              return generateTooltipLabel(item);
            }
            
            return context.dataset.label + ': ' + formatValue(context.parsed.y, chartType);
          },
          afterLabel: (context) => {
            if (viewMode === VIEW_MODES.BAR) {
              const index = context.dataIndex;
              const item = getDisplayData()[index];
              return generateAdditionalTooltipInfo(item);
            }
            return [];
          }
        }
      }
    },
    scales: viewMode === VIEW_MODES.BAR ? {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatValue(value, chartType);
          }
        }
      }
    } : undefined
  };
  
  // Helper functions for chart title and formatting
  function getChartTitle() {
    let title = 'Customer Analysis: ';
    
    switch (chartType) {
      case CHART_TYPES.REVENUE:
        title += 'Revenue Distribution';
        break;
      case CHART_TYPES.COST:
        title += 'Cost Distribution';
        break;
      case CHART_TYPES.PROFIT:
        title += 'Profit Analysis';
        break;
      case CHART_TYPES.PERCENTAGE:
        title += 'Business Share';
        break;
      default:
        title += 'Shipment Volume';
    }
    
    return title;
  }
  
  function formatValue(value, type) {
    switch (type) {
      case CHART_TYPES.REVENUE:
      case CHART_TYPES.COST:
      case CHART_TYPES.PROFIT:
        return '$' + Number(value).toFixed(2);
      case CHART_TYPES.PERCENTAGE:
        return Number(value).toFixed(1) + '%';
      default:
        return value; // Shipment count as integer
    }
  }
  
  function generateTooltipLabel(item) {
    switch (chartType) {
      case CHART_TYPES.REVENUE:
        return `Revenue: ${formatValue(item.revenue || 0, CHART_TYPES.REVENUE)} (${item.revenuePercentage.toFixed(1)}%)`;
      case CHART_TYPES.COST:
        return `Cost: ${formatValue(item.cost || 0, CHART_TYPES.COST)} (${item.costPercentage.toFixed(1)}%)`;
      case CHART_TYPES.PROFIT:
        return `Profit: ${formatValue(item.profit || 0, CHART_TYPES.PROFIT)} (${item.profitPercentage.toFixed(1)}%)`;
      case CHART_TYPES.PERCENTAGE:
        return `${item.customer}: ${item.countPercentage.toFixed(1)}%`;
      default:
        return `Shipments: ${item.count} (${item.countPercentage.toFixed(1)}%)`;
    }
  }
  
  function generateAdditionalTooltipInfo(item) {
    const lines = [];
    
    if (chartType !== CHART_TYPES.SHIPMENT_COUNT && chartType !== CHART_TYPES.PERCENTAGE) {
      lines.push(`Shipments: ${item.count} (${item.countPercentage.toFixed(1)}%)`);
    }
    
    if (chartType !== CHART_TYPES.REVENUE) {
      lines.push(`Revenue: ${formatValue(item.revenue || 0, CHART_TYPES.REVENUE)} (${item.revenuePercentage.toFixed(1)}%)`);
    }
    
    if (chartType !== CHART_TYPES.COST) {
      lines.push(`Cost: ${formatValue(item.cost || 0, CHART_TYPES.COST)} (${item.costPercentage.toFixed(1)}%)`);
    }
    
    if (chartType !== CHART_TYPES.PROFIT) {
      lines.push(`Profit: ${formatValue(item.profit || 0, CHART_TYPES.PROFIT)}`);
      
      // Calculate margin
      if (item.revenue > 0) {
        const margin = ((item.profit || 0) / (item.revenue || 1)) * 100;
        lines.push(`Margin: ${margin.toFixed(1)}%`);
      }
    }
    
    return lines;
  }
  
  // Render the appropriate chart type
  const renderChart = () => {
    switch (viewMode) {
      case VIEW_MODES.PIE:
        return <Pie data={chartData} options={options} />;
      case VIEW_MODES.DOUGHNUT:
        return <Doughnut data={chartData} options={options} />;
      default:
        return <Bar data={chartData} options={options} />;
    }
  };

  return (
    <div className="customer-chart-container">
      <div className="chart-summary">
        <div className="summary-item">
          <strong>Total Shipments:</strong> {totalStats.shipments}
        </div>
        <div className="summary-item">
          <strong>Total Revenue:</strong> ${totalStats.revenue.toFixed(2)}
        </div>
        <div className="summary-item">
          <strong>Total Cost:</strong> ${totalStats.cost.toFixed(2)}
        </div>
        <div className="summary-item">
          <strong>Total Profit:</strong> 
          <span className={totalStats.profit >= 0 ? 'text-success' : 'text-danger'}>
            ${totalStats.profit.toFixed(2)}
          </span>
        </div>
      </div>
      
      <div className="chart-controls mb-3">
        <div className="control-section">
          <label className="mr-2">Data Type:</label>
          <div className="btn-group mr-3">
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
            <button 
              className={`btn btn-sm ${chartType === CHART_TYPES.PERCENTAGE ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setChartType(CHART_TYPES.PERCENTAGE)}
            >
              Percentage
            </button>
          </div>
        </div>
        
        <div className="control-section">
          <label className="mr-2">Chart Type:</label>
          <div className="btn-group mr-3">
            <button 
              className={`btn btn-sm ${viewMode === VIEW_MODES.BAR ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode(VIEW_MODES.BAR)}
            >
              Bar
            </button>
            <button 
              className={`btn btn-sm ${viewMode === VIEW_MODES.PIE ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode(VIEW_MODES.PIE)}
            >
              Pie
            </button>
            <button 
              className={`btn btn-sm ${viewMode === VIEW_MODES.DOUGHNUT ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode(VIEW_MODES.DOUGHNUT)}
            >
              Doughnut
            </button>
          </div>
        </div>
        
        <div className="control-section">
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="showAllCustomers"
              checked={showAllCustomers}
              onChange={() => setShowAllCustomers(!showAllCustomers)}
            />
            <label className="form-check-label" htmlFor="showAllCustomers">
              Show all customers
            </label>
          </div>
        </div>
      </div>
      
      <div className="chart-container">
        {renderChart()}
      </div>
      
      {sortedData.length > 0 && (
        <div className="mt-3 text-muted small">
          <p className="mb-0">
            Showing data for {showAllCustomers ? 'all' : Math.min(5, sortedData.length)} 
            {!showAllCustomers && sortedData.length > 5 ? ' (top 5) ' : ' '} 
            customers out of {sortedData.length} total.
          </p>
        </div>
      )}
    </div>
  );
};

ShipmentsByCustomerChart.propTypes = {
  data: PropTypes.array.isRequired
};

export default ShipmentsByCustomerChart; 