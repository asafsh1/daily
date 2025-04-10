import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import axios from '../../utils/axiosConfig';
import { 
  getDashboardSummary, 
  getShipmentsByCustomer, 
  getShipmentsByDate,
  getOverdueNonInvoiced,
  getDetailedShipments
} from '../../actions/dashboard';
import Spinner from '../layout/Spinner';
import DashboardSummary from './DashboardSummary';
import ShipmentsByCustomerChart from './ShipmentsByCustomerChart';
import ShipmentsByDateChart from './ShipmentsByDateChart';
import ShipmentsByOriginChart from './ShipmentsByOriginChart';
import RecentShipments from './RecentShipments';
import OverdueShipments from './OverdueShipments';
import DashboardDetailModal from './DashboardDetailModal';
import { Link } from 'react-router-dom';
import Moment from 'react-moment';
import { toast } from 'react-toastify';

const Dashboard = ({
  getDashboardSummary,
  getShipmentsByCustomer,
  getShipmentsByDate,
  getOverdueNonInvoiced,
  getDetailedShipments,
  dashboard: { 
    summary, 
    shipmentsByCustomer, 
    shipmentsByDate, 
    overdueNonInvoiced,
    loading,
    error
  }
}) => {
  const [errorMsg, setErrorMsg] = useState('');
  const [modalData, setModalData] = useState({
    isOpen: false,
    title: '',
    data: [],
    type: ''
  });
  
  const [diagnosticInfo, setDiagnosticInfo] = useState(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [profitableShipments, setProfitableShipments] = useState([]);
  const [lossShipments, setLossShipments] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [detailedShipments, setDetailedShipments] = useState([]);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add a fallback to public-diagnostics when the authenticated endpoint fails
  useEffect(() => {
    const fetchDiagnosticInfo = async () => {
      setDiagnosticLoading(true);
      try {
        // Try the authenticated endpoint first
        const res = await axios.get('/api/dashboard/diagnostics');
        setDiagnosticInfo(res.data);
        setConnectionIssue(false);
      } catch (error) {
        console.error('Diagnostics error:', error.message);
        
        try {
          // If that fails, try the public endpoint
          console.log('Trying public diagnostics endpoint...');
          const publicRes = await axios.get('/api/public-diagnostics');
          setDiagnosticInfo(publicRes.data);
          
          // If we get here, the API is working but DB might not be
          if (publicRes.data.database.readyState !== 1) {
            setConnectionIssue(true);
            console.warn('Database connection issue detected:', publicRes.data.database.connectionError);
          } else {
            setConnectionIssue(false);
          }
        } catch (publicError) {
          console.error('Public diagnostics error:', publicError.message);
          setConnectionIssue(true);
        }
      } finally {
        setDiagnosticLoading(false);
      }
    };

    fetchDiagnosticInfo();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/dashboard/data');
        setDashboardData(response.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    console.log('Dashboard component mounted, fetching summary...');
    
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    console.log('Current API URL:', apiUrl);
    
    const fetchData = async () => {
      try {
        // Run diagnostics first
        const connected = !connectionIssue;
        if (!connected) {
          console.warn('Skipping data fetch due to connection issues');
          return;
        }
        
        await getDashboardSummary();
        console.log('Dashboard summary fetched successfully:', summary);
        
        await getShipmentsByDate();
        console.log('Shipments by date fetched successfully');
        
        await getShipmentsByCustomer();
        console.log('Shipments by customer fetched successfully');
        
        await getOverdueNonInvoiced();
        console.log('Overdue non-invoiced fetched successfully');
        
        // Get detailed shipments for origin chart
        const shipmentsDetails = await getDetailedShipments();
        console.log('Detailed shipments fetched successfully');
        setDetailedShipments(shipmentsDetails || []);
        
      } catch (err) {
        console.error('Error fetching dashboard data:', err.message, err);
        if (err.response?.status === 401) {
          console.log('Session expired, redirecting to login...');
          window.location.href = '/login';
        } else {
          toast.error('Error loading dashboard data. Please try refreshing the page.');
        }
      }
    };
    
    fetchData();
    
    // Set up auto-refresh
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing dashboard data');
      fetchData();
    }, 300000); // Refresh every 5 minutes
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [getDashboardSummary, getShipmentsByCustomer, getShipmentsByDate, getOverdueNonInvoiced, getDetailedShipments, connectionIssue]);

  useEffect(() => {
    console.log('Dashboard data state:', { summary, loading, error });
    
    if (error) {
      setErrorMsg(`Error loading dashboard: ${error.msg || 'Unknown error'}`);
    }
    
    // Process financial data if summary exists
    if (summary && summary.recentShipments && Array.isArray(summary.recentShipments)) {
      // Calculate profit/loss for each shipment
      const withProfit = summary.recentShipments.map(shipment => {
        const cost = shipment.cost ? parseFloat(shipment.cost) : 0;
        const receivables = shipment.receivables ? parseFloat(shipment.receivables) : 0;
        const profit = receivables - cost;
        return {
          ...shipment,
          profit,
          isProfitable: profit > 0
        };
      });
      
      // Split into profitable and loss-making shipments
      const profitable = withProfit.filter(s => s.isProfitable);
      const loss = withProfit.filter(s => !s.isProfitable);
      
      setProfitableShipments(profitable);
      setLossShipments(loss);
      
      console.log(`Processed ${profitable.length} profitable and ${loss.length} loss-making shipments`);
    }
  }, [summary, loading, error]);

  useEffect(() => {
    console.log('Dashboard data:', { 
      summary: summary || 'null', 
      shipmentsByCustomer: shipmentsByCustomer || [], 
      shipmentsByDate: shipmentsByDate || [],
      overdueNonInvoiced: overdueNonInvoiced || [],
      loading 
    });
  }, [summary, shipmentsByCustomer, shipmentsByDate, overdueNonInvoiced, loading]);

  const handleSectionClick = async (sectionType, title) => {
    let data = [];
    
    try {
      switch (sectionType) {
        case 'total-shipments':
          const res = await axios.get('/api/shipments');
          data = res.data.shipments || res.data;
          break;
        case 'shipment-status':
          const shipments = await axios.get('/api/shipments');
          data = shipments.data.shipments || shipments.data;
          break;
        case 'order-status':
          const orderShipments = await axios.get('/api/shipments');
          data = orderShipments.data.shipments || orderShipments.data;
          break;
        case 'invoicing':
          const invoiceShipments = await axios.get('/api/shipments');
          data = invoiceShipments.data.shipments || invoiceShipments.data;
          break;
        case 'total-cost':
          const costShipments = await axios.get('/api/shipments');
          // Filter to only show shipments with cost
          const shipmentData = costShipments.data.shipments || costShipments.data;
          data = shipmentData.filter(shipment => {
            const cost = shipment.cost ? parseFloat(shipment.cost) : 0;
            return !isNaN(cost) && cost > 0;
          });
          break;
        case 'total-receivables':
          const receivablesShipments = await axios.get('/api/shipments');
          // Filter to only show shipments with receivables
          const receivablesData = receivablesShipments.data.shipments || receivablesShipments.data;
          data = receivablesData.filter(shipment => {
            const receivables = shipment.receivables ? parseFloat(shipment.receivables) : 0;
            return !isNaN(receivables) && receivables > 0;
          });
          break;
        case 'total-profit':
          const profitShipments = await axios.get('/api/shipments');
          // Calculate profit for each shipment
          const profitData = profitShipments.data.shipments || profitShipments.data;
          data = profitData.map(shipment => {
            const cost = shipment.cost ? parseFloat(shipment.cost) : 0;
            const receivables = shipment.receivables ? parseFloat(shipment.receivables) : 0;
            const profit = (!isNaN(receivables) ? receivables : 0) - (!isNaN(cost) ? cost : 0);
            return {
              ...shipment,
              profit
            };
          }).filter(shipment => {
            return !isNaN(shipment.profit);
          });
          break;
        default:
          data = [];
      }

      setModalData({
        isOpen: true,
        title,
        data,
        type: sectionType
      });
    } catch (err) {
      console.error('Error fetching detail data:', err);
      toast.error(`Error loading ${title} data`);
    }
  };

  const closeModal = () => {
    setModalData({
      isOpen: false,
      title: '',
      data: [],
      type: ''
    });
  };

  // Create default stats data if summary is not available
  const statsData = summary?.statsData || [
    {
      title: 'Total Shipments',
      value: summary?.totalShipments || 0,
      footer: 'All time shipments',
      icon: 'fa-shipping-fast',
      path: '/shipments'
    },
    {
      title: 'Pending',
      value: summary?.shipmentsByStatus?.Pending || 0,
      footer: 'Waiting to be shipped',
      icon: 'fa-clock',
      path: '/shipments?status=Pending'
    },
    {
      title: 'In Transit',
      value: summary?.shipmentsByStatus?.['In Transit'] || 0,
      footer: 'Currently in transit',
      icon: 'fa-plane',
      path: '/shipments?status=In Transit'
    },
    {
      title: 'Non-Invoiced',
      value: summary?.totalNonInvoiced || 0,
      footer: 'Shipments without invoice',
      icon: 'fa-file-invoice-dollar',
      path: '/shipments?invoiced=false'
    }
  ];

  // Handle empty data safely
  const recentShipments = summary?.recentShipments || [];
  const shipmentsByStatus = summary?.shipmentsByStatus || {};

  if (errorMsg) {
    return (
      <section className="container dashboard">
        <h1 className="large text-primary">Dashboard</h1>
        <div className="alert alert-danger">{errorMsg}</div>
        <Link to="/shipments" className="btn btn-primary">
          View Shipments
        </Link>
      </section>
    );
  }

  return loading ? (
    <Spinner />
  ) : (
    <section className="container dashboard">
      <h1 className="large text-primary">Dashboard</h1>
      <p className="lead">
        <i className="fas fa-tachometer-alt"></i> Welcome to the Dashboard
      </p>

      <div className="stats-row">
        {statsData.map((stat, index) => (
          <div key={index} className="stats-card" onClick={() => handleSectionClick(stat.title.toLowerCase().replace(' ', '-'), stat.title)}>
            <Link to={stat.path || '#'} className="stats-card-link">
              <div className="stats-header">
                <i className={`fas ${stat.icon}`}></i>
                <h3>{stat.title}</h3>
              </div>
              <div className="stats-value">{stat.value}</div>
              <div className="stats-footer">{stat.footer}</div>
            </Link>
          </div>
        ))}
      </div>

      {/* Financial summary section */}
      <div className="financial-summary">
        <h2 className="text-primary">Financial Summary</h2>
        <div className="shipment-tabs">
          <button 
            className={`tab-button ${activeTab === 'all' ? 'active' : ''}`} 
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button 
            className={`tab-button ${activeTab === 'profitable' ? 'active' : ''}`} 
            onClick={() => setActiveTab('profitable')}
          >
            Profitable
          </button>
          <button 
            className={`tab-button ${activeTab === 'loss' ? 'active' : ''}`} 
            onClick={() => setActiveTab('loss')}
          >
            Loss
          </button>
        </div>
        
        <div className="stats-row">
          <div className="stats-card" onClick={() => handleSectionClick('total-cost', 'Total Cost')}>
            <div className="stats-card-link">
              <div className="stats-header">
                <i className="fas fa-dollar-sign"></i>
                <h3>Total Cost</h3>
              </div>
              <div className="stats-value">
                ${activeTab === 'all' 
                  ? (summary?.totalCost ? summary.totalCost.toFixed(2) : '0.00')
                  : activeTab === 'profitable'
                    ? (Array.isArray(profitableShipments) && profitableShipments.length > 0 
                        ? profitableShipments.reduce((total, s) => total + (parseFloat(s.cost || 0)), 0).toFixed(2) 
                        : '0.00')
                    : (Array.isArray(lossShipments) && lossShipments.length > 0 
                        ? lossShipments.reduce((total, s) => total + (parseFloat(s.cost || 0)), 0).toFixed(2) 
                        : '0.00')
                }
              </div>
              <div className="stats-footer">
                {activeTab === 'all' ? 'All shipments' : 
                 activeTab === 'profitable' ? 'Profitable shipments' : 'Loss-making shipments'}
              </div>
            </div>
          </div>
          
          <div className="stats-card" onClick={() => handleSectionClick('total-receivables', 'Total Receivables')}>
            <div className="stats-card-link">
              <div className="stats-header">
                <i className="fas fa-money-bill-wave"></i>
                <h3>Total Receivables</h3>
              </div>
              <div className="stats-value">
                ${activeTab === 'all' 
                  ? (summary?.totalReceivables ? summary.totalReceivables.toFixed(2) : '0.00')
                  : activeTab === 'profitable'
                    ? (Array.isArray(profitableShipments) && profitableShipments.length > 0 
                        ? profitableShipments.reduce((total, s) => total + (parseFloat(s.receivables || 0)), 0).toFixed(2) 
                        : '0.00')
                    : (Array.isArray(lossShipments) && lossShipments.length > 0 
                        ? lossShipments.reduce((total, s) => total + (parseFloat(s.receivables || 0)), 0).toFixed(2) 
                        : '0.00')
                }
              </div>
              <div className="stats-footer">
                {activeTab === 'all' ? 'All shipments' : 
                 activeTab === 'profitable' ? 'Profitable shipments' : 'Loss-making shipments'}
              </div>
            </div>
          </div>
          
          <div className="stats-card" onClick={() => handleSectionClick('total-profit', 'Total Profit')}>
            <div className="stats-card-link">
              <div className="stats-header">
                <i className="fas fa-chart-line"></i>
                <h3>{activeTab === 'loss' ? 'Total Loss' : 'Total Profit'}</h3>
              </div>
              <div className={`stats-value ${activeTab === 'loss' ? 'text-danger' : 
                              (activeTab === 'profitable' ? 'text-success' : 
                              (summary?.totalProfit && summary.totalProfit >= 0) ? 'text-success' : 'text-danger')}`}>
                ${activeTab === 'all' 
                  ? (summary?.totalProfit ? Math.abs(summary.totalProfit).toFixed(2) : '0.00')
                  : activeTab === 'profitable'
                    ? (Array.isArray(profitableShipments) && profitableShipments.length > 0 
                        ? profitableShipments.reduce((total, s) => {
                            const receivables = parseFloat(s.receivables || 0);
                            const cost = parseFloat(s.cost || 0);
                            return total + (receivables - cost);
                          }, 0).toFixed(2) 
                        : '0.00')
                    : (Array.isArray(lossShipments) && lossShipments.length > 0 
                        ? Math.abs(lossShipments.reduce((total, s) => {
                            const receivables = parseFloat(s.receivables || 0);
                            const cost = parseFloat(s.cost || 0);
                            return total + (receivables - cost);
                          }, 0)).toFixed(2) 
                        : '0.00')
                }
                {activeTab === 'loss' && ' (Loss)'}
                {activeTab === 'all' && (summary?.totalProfit || 0) < 0 && ' (Loss)'}
              </div>
              <div className="stats-footer">
                {activeTab === 'all' ? 'All shipments' : 
                 activeTab === 'profitable' ? 'Profitable shipments' : 'Loss-making shipments'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Financial data table */}
        {activeTab !== 'all' && (
          <div className="financial-data-table">
            <h3>{activeTab === 'profitable' ? 'Profitable Shipments' : 'Loss-Making Shipments'}</h3>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Cost</th>
                    <th>Receivables</th>
                    <th>Profit/Loss</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'profitable' ? profitableShipments : lossShipments).map(shipment => (
                    <tr key={shipment._id}>
                      <td>
                        <Moment format="DD/MM/YYYY">
                          {shipment.dateAdded}
                        </Moment>
                      </td>
                      <td>
                        {typeof shipment.customer === 'object' 
                          ? (shipment.customer?.name || 'Unknown') 
                          : (shipment.customer || 'Unknown')}
                      </td>
                      <td>
                        <span className={`status-badge status-${shipment.shipmentStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                          {shipment.shipmentStatus}
                        </span>
                      </td>
                      <td>${(shipment.cost || 0).toFixed(2)}</td>
                      <td>${(shipment.receivables || 0).toFixed(2)}</td>
                      <td className={shipment.profit > 0 ? 'text-success' : 'text-danger'}>
                        ${Math.abs(shipment.profit).toFixed(2)} 
                        {shipment.profit < 0 && ' (Loss)'}
                      </td>
                      <td>
                        <Link to={`/shipments/${shipment._id}`} className="btn btn-sm">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-row">
        <div className="recent-shipments card">
          <div className="card-header">
            <h3>Recent Shipments</h3>
            <Link to="/shipments" className="view-all">
              View All
            </Link>
          </div>
          
          <div className="card-body">
            {recentShipments.length > 0 ? (
              <div className="table-responsive">
                <RecentShipments shipments={recentShipments} />
              </div>
            ) : (
              <p>No recent shipments</p>
            )}
          </div>
        </div>

        <div className="shipment-status card">
          <div className="card-header">
            <h3>Shipment Status</h3>
          </div>
          <div className="card-body">
            <div className="status-grid">
              {Object.entries(shipmentsByStatus).length > 0 ? (
                Object.entries(shipmentsByStatus).map(([status, count]) => (
                  <Link 
                    to={`/shipments?status=${status}`} 
                    key={status} 
                    className="status-card"
                  >
                    <div className={`status-icon status-${status.toLowerCase().replace(/\s+/g, '-')}`}>
                      <i className={
                        status === 'Pending' ? 'fas fa-clock' :
                        status === 'In Transit' ? 'fas fa-plane' :
                        status === 'Arrived' ? 'fas fa-check-circle' :
                        status === 'Delayed' ? 'fas fa-exclamation-triangle' :
                        status === 'Canceled' ? 'fas fa-ban' :
                        'fas fa-shipping-fast'
                      }></i>
                    </div>
                    <div className="status-details">
                      <span className="status-name">{status}</span>
                      <span className="status-value">{count}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <p>No status data available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {overdueNonInvoiced && overdueNonInvoiced.length > 0 && (
        <div className="overdue-shipments-container">
          <h2 className="text-primary">Overdue Non-Invoiced Shipments</h2>
          <OverdueShipments shipments={overdueNonInvoiced} />
        </div>
      )}

      <div className="dashboard-charts">
        <div className="chart-container">
          <h2 className="text-primary">Shipments by Customer</h2>
          {shipmentsByCustomer && shipmentsByCustomer.length > 0 ? (
            <ShipmentsByCustomerChart data={shipmentsByCustomer} />
          ) : (
            <p>No data available</p>
          )}
        </div>

        <div className="chart-container">
          <h2 className="text-primary">Shipments by Date</h2>
          {shipmentsByDate && shipmentsByDate.length > 0 ? (
            <ShipmentsByDateChart data={shipmentsByDate} />
          ) : (
            <p>No data available</p>
          )}
        </div>
      </div>
      
      <div className="chart-container mt-4">
        <h2 className="text-primary">Shipments and Profit by Origin</h2>
        {detailedShipments && detailedShipments.length > 0 ? (
          <ShipmentsByOriginChart data={detailedShipments} />
        ) : (
          <p>No data available</p>
        )}
      </div>

      <DashboardDetailModal
        isOpen={modalData.isOpen}
        onClose={closeModal}
        title={modalData.title}
        data={modalData.data}
        type={modalData.type}
      />
    </section>
  );
};

Dashboard.propTypes = {
  getDashboardSummary: PropTypes.func.isRequired,
  getShipmentsByCustomer: PropTypes.func.isRequired,
  getShipmentsByDate: PropTypes.func.isRequired,
  getOverdueNonInvoiced: PropTypes.func.isRequired,
  getDetailedShipments: PropTypes.func.isRequired,
  dashboard: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  dashboard: state.dashboard
});

export default connect(
  mapStateToProps,
  { getDashboardSummary, getShipmentsByCustomer, getShipmentsByDate, getOverdueNonInvoiced, getDetailedShipments }
)(Dashboard); 