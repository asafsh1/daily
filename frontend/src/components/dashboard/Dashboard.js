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

  return (
    <section className="container">
      <h1 className="large text-primary">Dashboard</h1>
      <p className="lead">
        <i className="fas fa-tachometer-alt"></i> Welcome to the Dashboard
      </p>

      {loading ? (
        <Spinner />
      ) : (
        <div className="dashboard-container">
          {summary && <DashboardSummary summary={summary} onSectionClick={handleSectionClick} />}

          {summary && summary.recentShipments && (
            <div className="recent-shipments-container">
              <h2 className="text-primary">Recent Shipments</h2>
              <RecentShipments shipments={summary.recentShipments} />
            </div>
          )}

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

          {/* Shipment Movement Map */}
          <div className="map-container">
            <h2 className="text-primary">Shipment Movement Map</h2>
            <div className="shipment-map">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d4717349.033462952!2d-83.99559065!3d41.05350745!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1711646528096!5m2!1sen!2sus" 
                width="100%" 
                height="450" 
                style={{ border: 0 }} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade">
              </iframe>
            </div>
          </div>
        </div>
      )}

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