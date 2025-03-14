import React from 'react';
import PropTypes from 'prop-types';

const DashboardSummary = ({ summary, onSectionClick }) => {
  const {
    totalShipments,
    shipmentsByStatus,
    invoiceStats,
    recentShipments
  } = summary;

  // Calculate total cost from recent shipments
  const totalCost = recentShipments
    ? recentShipments.reduce((total, shipment) => total + (shipment.cost || 0), 0)
    : 0;

  // Calculate total receivables from recent shipments
  const totalReceivables = recentShipments
    ? recentShipments.reduce((total, shipment) => total + (shipment.receivables || 0), 0)
    : 0;

  // Calculate profit (receivables minus cost)
  const totalProfit = totalReceivables - totalCost;

  // Count order statuses from recent shipments
  const orderStatus = {
    done: 0,
    confirmed: 0,
    planned: 0,
    canceled: 0,
    inTransit: 0
  };

  if (recentShipments) {
    recentShipments.forEach(shipment => {
      if (shipment.orderStatus === 'done') orderStatus.done++;
      else if (shipment.orderStatus === 'confirmed') orderStatus.confirmed++;
      else if (shipment.orderStatus === 'planned') orderStatus.planned++;
      else if (shipment.orderStatus === 'canceled') orderStatus.canceled++;
      else if (shipment.orderStatus === 'in transit') orderStatus.inTransit++;
    });
  }

  return (
    <div className="dashboard-summary">
      <div className="summary-card total-shipments" onClick={() => onSectionClick('total-shipments', 'Total Shipments')}>
        <h3>Total Shipments</h3>
        <div className="summary-value">{totalShipments || 0}</div>
        <div className="card-overlay">
          <i className="fas fa-search-plus"></i> Click to view details
        </div>
      </div>

      <div className="summary-card shipment-status" onClick={() => onSectionClick('shipment-status', 'Shipment Status')}>
        <h3>Shipment Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Pending</span>
            <span className="status-value">{shipmentsByStatus?.pending || 0}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Arrived</span>
            <span className="status-value">{shipmentsByStatus?.arrived || 0}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Delayed</span>
            <span className="status-value">{shipmentsByStatus?.delayed || 0}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Canceled</span>
            <span className="status-value">{shipmentsByStatus?.canceled || 0}</span>
          </div>
        </div>
        <div className="card-overlay">
          <i className="fas fa-search-plus"></i> Click to view details
        </div>
      </div>

      <div className="summary-card order-status" onClick={() => onSectionClick('order-status', 'Order Status')}>
        <h3>Order Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Done</span>
            <span className="status-value">{orderStatus.done}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Confirmed</span>
            <span className="status-value">{orderStatus.confirmed}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Planned</span>
            <span className="status-value">{orderStatus.planned}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Canceled</span>
            <span className="status-value">{orderStatus.canceled}</span>
          </div>
          <div className="status-item">
            <span className="status-label">In Transit</span>
            <span className="status-value">{orderStatus.inTransit}</span>
          </div>
        </div>
        <div className="card-overlay">
          <i className="fas fa-search-plus"></i> Click to view details
        </div>
      </div>

      <div className="summary-card invoicing" onClick={() => onSectionClick('invoicing', 'Invoicing')}>
        <h3>Invoicing</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Invoiced</span>
            <span className="status-value">{invoiceStats?.invoiced || 0}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Not Invoiced</span>
            <span className="status-value">{invoiceStats?.nonInvoiced || 0}</span>
          </div>
        </div>
        <div className="card-overlay">
          <i className="fas fa-search-plus"></i> Click to view details
        </div>
      </div>

      <div className="summary-card total-cost" onClick={() => onSectionClick('total-cost', 'Total Cost')}>
        <h3>Total Cost</h3>
        <div className="summary-value">${totalCost.toFixed(2)}</div>
        <div className="card-overlay">
          <i className="fas fa-search-plus"></i> Click to view details
        </div>
      </div>

      <div className="summary-card total-receivables" onClick={() => onSectionClick('total-receivables', 'Total Receivables')}>
        <h3>Total Receivables</h3>
        <div className="summary-value">${totalReceivables.toFixed(2)}</div>
        <div className="card-overlay">
          <i className="fas fa-search-plus"></i> Click to view details
        </div>
      </div>

      <div className="summary-card total-profit" onClick={() => onSectionClick('total-profit', 'Total Profit')}>
        <h3>Total Profit</h3>
        <div className={`summary-value ${totalProfit >= 0 ? 'text-success' : 'text-danger'}`}>
          ${totalProfit.toFixed(2)}
        </div>
        <div className="card-overlay">
          <i className="fas fa-search-plus"></i> Click to view details
        </div>
      </div>
    </div>
  );
};

DashboardSummary.propTypes = {
  summary: PropTypes.object.isRequired,
  onSectionClick: PropTypes.func.isRequired
};

export default DashboardSummary; 