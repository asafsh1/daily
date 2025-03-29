import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import axios from '../../utils/axiosConfig';
import { 
  getDashboardSummary, 
  getShipmentsByCustomer, 
  getShipmentsByDate,
  getOverdueNonInvoiced
} from '../../actions/dashboard';
import Spinner from '../layout/Spinner';
import DashboardSummary from './DashboardSummary';
import ShipmentsByCustomerChart from './ShipmentsByCustomerChart';
import ShipmentsByDateChart from './ShipmentsByDateChart';
import RecentShipments from './RecentShipments';
import OverdueShipments from './OverdueShipments';
import DashboardDetailModal from './DashboardDetailModal';
import { Link } from 'react-router-dom';
import Moment from 'react-moment';

const Dashboard = ({
  getDashboardSummary,
  getShipmentsByCustomer,
  getShipmentsByDate,
  getOverdueNonInvoiced,
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

  useEffect(() => {
    console.log('Dashboard component mounted, fetching summary...');
    
    getDashboardSummary()
      .then(() => console.log('Dashboard summary fetched successfully'))
      .catch(err => {
        console.error('Error fetching dashboard data:', err);
        setErrorMsg('Failed to load dashboard data. Please try again later.');
      });
  }, [getDashboardSummary]);

  useEffect(() => {
    console.log('Dashboard data state:', { summary, loading, error });
    
    if (error) {
      setErrorMsg(`Error loading dashboard: ${error.msg || 'Unknown error'}`);
    }
  }, [summary, loading, error]);

  useEffect(() => {
    console.log('Dashboard data:', { 
      summary, 
      shipmentsByCustomer, 
      shipmentsByDate, 
      overdueNonInvoiced,
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
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentShipments.map(shipment => (
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
            <div className="status-distribution">
              {Object.entries(shipmentsByStatus).length > 0 ? (
                Object.entries(shipmentsByStatus).map(([status, count]) => (
                  <Link to={`/shipments?status=${status}`} key={status} className="status-item">
                    <div className={`status-color status-${status.toLowerCase().replace(/\s+/g, '-')}`}></div>
                    <div className="status-label">{status}</div>
                    <div className="status-count">{count}</div>
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
  dashboard: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  dashboard: state.dashboard
});

export default connect(
  mapStateToProps,
  { getDashboardSummary, getShipmentsByCustomer, getShipmentsByDate, getOverdueNonInvoiced }
)(Dashboard); 