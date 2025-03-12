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
    loading 
  }
}) => {
  const [modalData, setModalData] = useState({
    isOpen: false,
    title: '',
    data: [],
    type: ''
  });

  useEffect(() => {
    getDashboardSummary();
    getShipmentsByCustomer();
    getShipmentsByDate();
    getOverdueNonInvoiced();
  }, [getDashboardSummary, getShipmentsByCustomer, getShipmentsByDate, getOverdueNonInvoiced]);

  const handleSectionClick = async (sectionType, title) => {
    let data = [];
    
    try {
      switch (sectionType) {
        case 'total-shipments':
          const res = await axios.get('/api/shipments');
          data = res.data;
          break;
        case 'shipment-status':
          const shipments = await axios.get('/api/shipments');
          data = shipments.data;
          break;
        case 'order-status':
          const orderShipments = await axios.get('/api/shipments');
          data = orderShipments.data;
          break;
        case 'invoicing':
          const invoiceShipments = await axios.get('/api/shipments');
          data = invoiceShipments.data;
          break;
        case 'total-cost':
          const costShipments = await axios.get('/api/shipments');
          // Filter to only show shipments with cost
          data = costShipments.data.filter(shipment => shipment.cost);
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
      console.error('Error fetching data for modal:', err);
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

  return loading ? (
    <Spinner />
  ) : (
    <section className="container">
      <h1 className="large text-primary">Dashboard</h1>
      <p className="lead">
        <i className="fas fa-tachometer-alt"></i> Shipment Tracking Dashboard
      </p>

      <div className="dashboard-container">
        {summary && <DashboardSummary summary={summary} onSectionClick={handleSectionClick} />}

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

        {overdueNonInvoiced && overdueNonInvoiced.length > 0 && (
          <div className="overdue-shipments-container">
            <OverdueShipments shipments={overdueNonInvoiced} />
          </div>
        )}

        {summary && summary.recentShipments && (
          <div className="recent-shipments-container">
            <h2 className="text-primary">Recent Shipments</h2>
            <RecentShipments shipments={summary.recentShipments} />
          </div>
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
  dashboard: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  dashboard: state.dashboard
});

export default connect(mapStateToProps, {
  getDashboardSummary,
  getShipmentsByCustomer,
  getShipmentsByDate,
  getOverdueNonInvoiced
})(Dashboard); 