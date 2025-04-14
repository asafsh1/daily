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
import ShipmentsByCustomerChart from './ShipmentsByCustomerChart';
import ShipmentsByDateChart from './ShipmentsByDateChart';
import ShipmentsByOriginChart from './ShipmentsByOriginChart';
import RecentShipments from './RecentShipments';
import OverdueShipments from './OverdueShipments';
import DashboardDetailModal from './DashboardDetailModal';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Dashboard.css';

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
    loading: reduxLoading,
    error: reduxError
  }
}) => {
  const [localLoading, setLoading] = useState(false);
  const [localError, setError] = useState(null);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [detailedShipments, setDetailedShipments] = useState([]);
  const [profitableShipments, setProfitableShipments] = useState([]);
  const [lossShipments, setLossShipments] = useState([]);
  const [modalData, setModalData] = useState({
    isOpen: false,
    title: '',
    data: [],
    type: ''
  });

  // Add a fallback to public-diagnostics when the authenticated endpoint fails
  useEffect(() => {
    const checkConnection = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/dashboard/diagnostics');
        setConnectionIssue(false);
      } catch (error) {
        console.error('Diagnostics error:', error.message);
        try {
          const publicRes = await axios.get('/api/public-diagnostics');
          setConnectionIssue(publicRes.data.database.readyState !== 1);
        } catch (publicError) {
          console.error('Public diagnostics error:', publicError.message);
          setConnectionIssue(true);
        }
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (connectionIssue) {
        console.warn('Skipping data fetch due to connection issues');
        return;
      }

      try {
        setLoading(true);
        await getDashboardSummary();
        await getShipmentsByDate();
        await getShipmentsByCustomer();
        await getOverdueNonInvoiced();
        
        const shipmentsDetails = await getDetailedShipments();
        setDetailedShipments(shipmentsDetails || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err.message);
        if (err.response?.status === 401) {
          window.location.href = '/login';
        } else {
          toast.error('Error loading dashboard data. Please try refreshing the page.');
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    const refreshInterval = setInterval(fetchData, 300000); // Refresh every 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, [
    getDashboardSummary,
    getShipmentsByCustomer,
    getShipmentsByDate,
    getOverdueNonInvoiced,
    getDetailedShipments,
    connectionIssue
  ]);

  useEffect(() => {
    if (!summary?.recentShipments?.length) return;

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
    
    setProfitableShipments(withProfit.filter(s => s.isProfitable));
    setLossShipments(withProfit.filter(s => !s.isProfitable));
  }, [summary]);

  const handleSectionClick = async (sectionType, title) => {
    try {
      const res = await axios.get('/api/shipments');
      let data = res.data.shipments || res.data;

      switch (sectionType) {
        case 'total-cost':
          data = data.filter(shipment => {
            const cost = shipment.cost ? parseFloat(shipment.cost) : 0;
            return !isNaN(cost) && cost > 0;
          });
          break;
        case 'total-receivables':
          data = data.filter(shipment => {
            const receivables = shipment.receivables ? parseFloat(shipment.receivables) : 0;
            return !isNaN(receivables) && receivables > 0;
          });
          break;
        case 'total-profit':
          data = data
            .map(shipment => {
              const cost = shipment.cost ? parseFloat(shipment.cost) : 0;
              const receivables = shipment.receivables ? parseFloat(shipment.receivables) : 0;
              return {
                ...shipment,
                profit: (!isNaN(receivables) ? receivables : 0) - (!isNaN(cost) ? cost : 0)
              };
            })
            .filter(shipment => !isNaN(shipment.profit));
          break;
        default:
          break;
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

  const renderErrorMessage = () => {
    if (connectionIssue) {
      return (
        <div className="alert alert-warning">
          <i className="fas fa-exclamation-triangle"></i>
          Database connection issues detected. Some data may not be available.
          <button 
            className="btn btn-sm btn-outline-warning ml-3"
            onClick={() => window.location.reload()}
          >
            Retry Connection
          </button>
        </div>
      );
    }
    if (localError || reduxError) {
      let errorMessage = 'An error occurred while loading the dashboard.';
      if (reduxError && reduxError.msg === 'Database connection not available') {
        errorMessage = 'Unable to connect to the database. Please try again later.';
      }
      return (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle"></i> {errorMessage}
        </div>
      );
    }
    return null;
  };

  const renderLoadingOrContent = (component, fallback = null) => {
    if (localLoading || reduxLoading) {
      return <div className="loading-placeholder"><Spinner size="sm" /></div>;
    }
    if (connectionIssue) {
      return fallback || (
        <div className="data-unavailable">
          <i className="fas fa-database"></i>
          Data temporarily unavailable
        </div>
      );
    }
    return component;
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="text-primary">Dashboard</h1>
        <div className="dashboard-actions">
          <Link to="/shipments" className="btn btn-primary">
            <i className="fas fa-plus"></i> New Shipment
          </Link>
        </div>
      </div>

      {renderErrorMessage()}

      <div className="dashboard-grid">
        {/* Summary Section */}
        <div className="dashboard-section summary-section">
          <h2>Summary</h2>
          {renderLoadingOrContent(
            <div className="summary-content">
              <div className="stat-card">
                <h3>Total Shipments</h3>
                <p>{summary?.totalShipments || '--'}</p>
              </div>
              <div className="stat-card">
                <h3>Active Shipments</h3>
                <p>{summary?.activeShipments || '--'}</p>
              </div>
              <div className="stat-card">
                <h3>Completed Today</h3>
                <p>{summary?.completedToday || '--'}</p>
              </div>
            </div>,
            <div className="summary-fallback">
              <div className="stat-card">
                <h3>Total Shipments</h3>
                <p>--</p>
              </div>
              <div className="stat-card">
                <h3>Active Shipments</h3>
                <p>--</p>
              </div>
              <div className="stat-card">
                <h3>Completed Today</h3>
                <p>--</p>
              </div>
            </div>
          )}
        </div>

        {/* Charts Section */}
        <div className="dashboard-section charts-section">
          <h2>Analytics</h2>
          <div className="charts-grid">
            {renderLoadingOrContent(
              <ShipmentsByCustomerChart data={shipmentsByCustomer || []} />,
              <div className="chart-fallback">No customer data available</div>
            )}
            {renderLoadingOrContent(
              <ShipmentsByDateChart data={shipmentsByDate || []} />,
              <div className="chart-fallback">No timeline data available</div>
            )}
            {renderLoadingOrContent(
              <ShipmentsByOriginChart data={detailedShipments || []} />,
              <div className="chart-fallback">No origin data available</div>
            )}
          </div>
        </div>

        {/* Recent Shipments Section */}
        <div className="dashboard-section recent-section">
          <h2>Recent Shipments</h2>
          {renderLoadingOrContent(
            <RecentShipments shipments={summary?.recentShipments || []} />,
            <div className="table-fallback">No recent shipments to display</div>
          )}
        </div>

        {/* Overdue Section */}
        <div className="dashboard-section overdue-section">
          <h2>Overdue Shipments</h2>
          {renderLoadingOrContent(
            <OverdueShipments shipments={overdueNonInvoiced || []} />,
            <div className="table-fallback">No overdue shipments to display</div>
          )}
        </div>
      </div>

      <DashboardDetailModal
        isOpen={modalData.isOpen}
        onClose={() => setModalData({ ...modalData, isOpen: false })}
        title={modalData.title}
        data={modalData.data}
        type={modalData.type}
      />
    </div>
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