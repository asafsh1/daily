import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { addShipment, getShipment, updateShipment, clearShipment } from '../../actions/shipment';
import Spinner from '../layout/Spinner';

const initialState = {
  dateAdded: new Date().toISOString().split('T')[0],
  orderStatus: 'planned',
  customer: '',
  awbNumber1: '',
  awbNumber2: '',
  routing: '',
  scheduledArrival: '',
  shipmentStatus: 'Pending',
  fileNumber: '',
  fileCreatedDate: '',
  invoiced: false,
  invoiceSent: false,
  cost: '',
  receivables: '',
  comments: '',
  invoiceNumber: '',
  invoiceStatus: 'Pending',
  createdBy: ''
};

const ShipmentForm = ({ 
  addShipment, 
  getShipment, 
  updateShipment, 
  clearShipment, 
  shipment: { shipment, loading } 
}) => {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { id } = useParams(); // Get the shipment ID from URL params
  const isEditMode = !!id;

  // Load shipment data when in edit mode
  useEffect(() => {
    if (isEditMode) {
      getShipment(id);
    }

    // Cleanup on component unmount
    return () => {
      clearShipment();
    };
  }, [getShipment, id, isEditMode, clearShipment]);

  // Populate form data when shipment is loaded
  useEffect(() => {
    if (!loading && shipment && isEditMode) {
      const shipmentData = { ...initialState };
      
      // Format dates to match form field requirements
      const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().split('T')[0];
      };

      const formatDateTime = (dateString) => {
        if (!dateString) return '';
        // Format: YYYY-MM-DDThh:mm
        return new Date(dateString).toISOString().slice(0, 16);
      };

      // Map all shipment data to form fields
      for (const key in shipment) {
        if (key in shipmentData) {
          if (key === 'dateAdded' || key === 'fileCreatedDate') {
            shipmentData[key] = formatDate(shipment[key]);
          } else if (key === 'scheduledArrival') {
            shipmentData[key] = formatDateTime(shipment[key]);
          } else {
            shipmentData[key] = shipment[key];
          }
        }
      }

      setFormData(shipmentData);
    }
  }, [loading, shipment, isEditMode]);

  const {
    dateAdded,
    orderStatus,
    customer,
    awbNumber1,
    awbNumber2,
    routing,
    scheduledArrival,
    shipmentStatus,
    fileNumber,
    fileCreatedDate,
    invoiced,
    invoiceSent,
    cost,
    receivables,
    comments,
    invoiceNumber,
    invoiceStatus,
    createdBy
  } = formData;

  const validateForm = () => {
    const newErrors = {};
    
    if (!dateAdded) newErrors.dateAdded = 'Date added is required';
    if (!orderStatus) newErrors.orderStatus = 'Order status is required';
    if (!['done', 'confirmed', 'planned', 'canceled', 'in transit'].includes(orderStatus)) {
      newErrors.orderStatus = 'Invalid order status';
    }
    if (!customer) newErrors.customer = 'Customer is required';
    if (!awbNumber1) newErrors.awbNumber1 = 'AWB number is required';
    if (!routing) newErrors.routing = 'Routing is required';
    if (!scheduledArrival) newErrors.scheduledArrival = 'Scheduled arrival is required';
    if (!['Pending', 'Arrived', 'Delayed', 'Canceled'].includes(shipmentStatus)) {
      newErrors.shipmentStatus = 'Invalid shipment status';
    }
    if (invoiceStatus && !['Confirmed', 'Pending', 'Paid'].includes(invoiceStatus)) {
      newErrors.invoiceStatus = 'Invalid invoice status';
    }
    if (cost && isNaN(Number(cost))) {
      newErrors.cost = 'Cost must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const onSubmit = async e => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const shipmentData = {
      ...formData,
      dateAdded: new Date(dateAdded).toISOString(),
      scheduledArrival: new Date(scheduledArrival).toISOString(),
      fileCreatedDate: fileCreatedDate ? new Date(fileCreatedDate).toISOString() : undefined,
      cost: cost ? Number(cost) : undefined
    };

    try {
      if (isEditMode) {
        await updateShipment(id, shipmentData, navigate);
      } else {
        await addShipment(shipmentData, navigate);
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setErrors(prev => ({
        ...prev,
        submit: 'Error submitting form. Please try again.'
      }));
    }
  };

  // Show loading indicator while fetching shipment data
  if (loading && isEditMode) {
    return <Spinner />;
  }

  return (
    <section className="container">
      <h1 className="large text-primary">
        {isEditMode ? 'Edit Shipment' : 'Add Shipment'}
      </h1>
      <p className="lead">
        <i className="fas fa-shipping-fast"></i>{' '}
        {isEditMode ? 'Update shipment information' : 'Add a new shipment to the system'}
      </p>

      {errors.submit && (
        <div className="alert alert-danger">{errors.submit}</div>
      )}

      <form className="form" onSubmit={onSubmit}>
        <div className="form-group">
          <label>Date Added*</label>
          <input
            type="date"
            name="dateAdded"
            value={dateAdded}
            onChange={onChange}
            className={errors.dateAdded ? 'form-control is-invalid' : 'form-control'}
          />
          {errors.dateAdded && <div className="invalid-feedback">{errors.dateAdded}</div>}
        </div>

        <div className="form-group">
          <label>Order Status*</label>
          <select
            name="orderStatus"
            value={orderStatus}
            onChange={onChange}
            className={errors.orderStatus ? 'form-control is-invalid' : 'form-control'}
          >
            <option value="planned">Planned</option>
            <option value="confirmed">Confirmed</option>
            <option value="in transit">In Transit</option>
            <option value="done">Done</option>
            <option value="canceled">Canceled</option>
          </select>
          {errors.orderStatus && <div className="invalid-feedback">{errors.orderStatus}</div>}
        </div>

        <div className="form-group">
          <label>Customer*</label>
          <input
            type="text"
            name="customer"
            value={customer}
            onChange={onChange}
            className={errors.customer ? 'form-control is-invalid' : 'form-control'}
          />
          {errors.customer && <div className="invalid-feedback">{errors.customer}</div>}
        </div>

        <div className="form-group">
          <label>AWB Number 1*</label>
          <input
            type="text"
            name="awbNumber1"
            value={awbNumber1}
            onChange={onChange}
            className={errors.awbNumber1 ? 'form-control is-invalid' : 'form-control'}
          />
          {errors.awbNumber1 && <div className="invalid-feedback">{errors.awbNumber1}</div>}
        </div>

        <div className="form-group">
          <label>AWB Number 2</label>
          <input
            type="text"
            name="awbNumber2"
            value={awbNumber2}
            onChange={onChange}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>Routing*</label>
          <input
            type="text"
            name="routing"
            value={routing}
            onChange={onChange}
            className={errors.routing ? 'form-control is-invalid' : 'form-control'}
          />
          {errors.routing && <div className="invalid-feedback">{errors.routing}</div>}
        </div>

        <div className="form-group">
          <label>Scheduled Arrival*</label>
          <input
            type="datetime-local"
            name="scheduledArrival"
            value={scheduledArrival}
            onChange={onChange}
            className={errors.scheduledArrival ? 'form-control is-invalid' : 'form-control'}
          />
          {errors.scheduledArrival && <div className="invalid-feedback">{errors.scheduledArrival}</div>}
        </div>

        <div className="form-group">
          <label>Shipment Status</label>
          <select
            name="shipmentStatus"
            value={shipmentStatus}
            onChange={onChange}
            className={errors.shipmentStatus ? 'form-control is-invalid' : 'form-control'}
          >
            <option value="Pending">Pending</option>
            <option value="Arrived">Arrived</option>
            <option value="Delayed">Delayed</option>
            <option value="Canceled">Canceled</option>
          </select>
          {errors.shipmentStatus && <div className="invalid-feedback">{errors.shipmentStatus}</div>}
        </div>

        <div className="form-group">
          <label>File Number</label>
          <input
            type="text"
            name="fileNumber"
            value={fileNumber}
            onChange={onChange}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>File Created Date</label>
          <input
            type="date"
            name="fileCreatedDate"
            value={fileCreatedDate}
            onChange={onChange}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>Cost</label>
          <input
            type="number"
            name="cost"
            value={cost}
            onChange={onChange}
            className={errors.cost ? 'form-control is-invalid' : 'form-control'}
            step="0.01"
          />
          {errors.cost && <div className="invalid-feedback">{errors.cost}</div>}
        </div>

        <div className="form-group">
          <label>Receivables</label>
          <input
            type="text"
            name="receivables"
            value={receivables}
            onChange={onChange}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>Comments</label>
          <textarea
            name="comments"
            value={comments}
            onChange={onChange}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>Invoice Number</label>
          <input
            type="text"
            name="invoiceNumber"
            value={invoiceNumber}
            onChange={onChange}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>Invoice Status</label>
          <select
            name="invoiceStatus"
            value={invoiceStatus}
            onChange={onChange}
            className={errors.invoiceStatus ? 'form-control is-invalid' : 'form-control'}
          >
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Paid">Paid</option>
          </select>
          {errors.invoiceStatus && <div className="invalid-feedback">{errors.invoiceStatus}</div>}
        </div>

        <div className="form-group">
          <div className="form-check">
            <input
              type="checkbox"
              name="invoiced"
              checked={invoiced}
              onChange={onChange}
              className="form-check-input"
            />
            <label className="form-check-label">Invoiced</label>
          </div>
        </div>

        <div className="form-group">
          <div className="form-check">
            <input
              type="checkbox"
              name="invoiceSent"
              checked={invoiceSent}
              onChange={onChange}
              className="form-check-input"
            />
            <label className="form-check-label">Invoice Sent</label>
          </div>
        </div>

        <div className="form-group">
          <label>Created By</label>
          <input
            type="text"
            name="createdBy"
            value={createdBy}
            onChange={onChange}
            className="form-control"
            placeholder="Enter your name"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {isEditMode ? 'Update' : 'Submit'}
          </button>
          <Link to="/shipments" className="btn btn-light">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
};

ShipmentForm.propTypes = {
  addShipment: PropTypes.func.isRequired,
  getShipment: PropTypes.func.isRequired,
  updateShipment: PropTypes.func.isRequired,
  clearShipment: PropTypes.func.isRequired,
  shipment: PropTypes.object
};

const mapStateToProps = state => ({
  shipment: state.shipment
});

export default connect(
  mapStateToProps, 
  { addShipment, getShipment, updateShipment, clearShipment }
)(ShipmentForm); 