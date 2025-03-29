import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { addShipment, getShipment, updateShipment, clearShipment } from '../../actions/shipment';
import axios from '../../utils/axiosConfig';
import Spinner from '../layout/Spinner';
import ShipmentLegs from './ShipmentLegs';

const initialState = {
  dateAdded: new Date().toISOString().split('T')[0],
  orderStatus: 'planned',
  customer: '',
  shipmentStatus: 'Pending',
  weight: '',
  packageCount: '',
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
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [tempShipmentId, setTempShipmentId] = useState(null);
  const navigate = useNavigate();
  const { id } = useParams(); // Get the shipment ID from URL params
  const isEditMode = !!id;

  // Render the leg section even in create mode with a temp ID
  useEffect(() => {
    if (!tempShipmentId && !isEditMode) {
      setTempShipmentId('temp-' + Date.now());
    }
  }, [tempShipmentId, isEditMode]);

  // Load shipment data when in edit mode
  useEffect(() => {
    if (isEditMode) {
      getShipment(id);
    }

    // Load customers
    fetchCustomers();

    // Cleanup on component unmount
    return () => {
      clearShipment();
    };
  }, [getShipment, id, isEditMode, clearShipment]);

  // Populate form data when shipment is loaded
  useEffect(() => {
    if (!loading && shipment && isEditMode) {
      console.log('Populating form data from shipment:', shipment);
      
      // Only initialize once to prevent data loss during editing
      if (formData === initialState || 
          (formData.customer !== shipment.customer && 
          formData.dateAdded === initialState.dateAdded)) {
      
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

        // Create a new object to hold shipment data
        const shipmentData = {}; 
        
        // Copy all fields from shipment to data object
        for (const key in shipment) {
          if (key in initialState || key === '_id' || key === 'legs') {
            if (key === 'dateAdded' || key === 'fileCreatedDate') {
              shipmentData[key] = formatDate(shipment[key]);
            } else if (key === 'scheduledArrival') {
              shipmentData[key] = formatDateTime(shipment[key]);
            } else if (key === 'customer' && typeof shipment[key] === 'object') {
              // Handle customer object versus ID
              shipmentData[key] = shipment[key]._id || shipment[key];
            } else {
              shipmentData[key] = shipment[key];
            }
          }
        }
        
        // Fill any missing fields with defaults
        for (const key in initialState) {
          if (!(key in shipmentData)) {
            shipmentData[key] = initialState[key];
          }
        }
        
        console.log('Setting form data to:', shipmentData);
        setFormData(shipmentData);
      }
    }
  }, [loading, shipment, isEditMode, formData]);

  // Fetch customers from API
  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true);
      const res = await axios.get('/api/customers');
      setCustomers(res.data);
      setCustomersLoading(false);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setCustomersLoading(false);
    }
  };

  const {
    dateAdded,
    orderStatus,
    customer,
    shipmentStatus,
    weight,
    packageCount,
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
    if (!['done', 'confirmed', 'planned', 'canceled'].includes(orderStatus)) {
      newErrors.orderStatus = 'Invalid order status';
    }
    if (!customer) newErrors.customer = 'Customer is required';
    if (!['Pending', 'Arrived', 'Delayed', 'Canceled', 'In Transit'].includes(shipmentStatus)) {
      newErrors.shipmentStatus = 'Invalid shipment status';
    }
    if (!createdBy) newErrors.createdBy = 'Created By is required';
    if (invoiceStatus && !['Confirmed', 'Pending', 'Paid'].includes(invoiceStatus)) {
      newErrors.invoiceStatus = 'Invalid invoice status';
    }
    if (cost && isNaN(Number(cost))) {
      newErrors.cost = 'Cost must be a number';
    }
    if (weight && isNaN(Number(weight))) {
      newErrors.weight = 'Weight must be a number';
    }
    if (packageCount && isNaN(Number(packageCount))) {
      newErrors.packageCount = 'Package count must be a number';
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

    // Preserve the form data to prevent it from being reset
    const submittingData = {...formData};
    
    const shipmentData = {
      ...submittingData,
      dateAdded: new Date(dateAdded).toISOString(),
      fileCreatedDate: fileCreatedDate ? new Date(fileCreatedDate).toISOString() : undefined,
      cost: cost ? Number(cost) : undefined,
      weight: weight ? Number(weight) : undefined,
      packageCount: packageCount ? Number(packageCount) : undefined
    };

    console.log('Submitting shipment data:', shipmentData);

    try {
      if (isEditMode) {
        await updateShipment(id, shipmentData, navigate);
      } else {
        // For new shipment with legs, we'll need to associate the legs with the new shipment
        const newShipment = await addShipment(shipmentData);
        
        // Only proceed if the shipment was created successfully
        if (newShipment && newShipment._id) {
          // If we have temp legs, we need to update the legs
          if (tempShipmentId) {
            try {
              // Update legs that were associated with the temp ID
              await axios.put(`/api/shipment-legs/reassign/${tempShipmentId}/${newShipment._id}`);
              console.log('Successfully reassigned legs to new shipment');
            } catch (err) {
              console.error('Error reassigning legs:', err);
              setErrors(prev => ({
                ...prev,
                submit: 'Shipment created but there was an error associating the legs. Please check the shipment details.'
              }));
              // Still navigate but after a delay so the user sees the error
              setTimeout(() => navigate(`/shipments/${newShipment._id}`), 3000);
              return;
            }
          }
          
          // Only navigate if everything succeeded
          navigate('/shipments');
        } else {
          // Don't navigate if there was an error creating the shipment
          setErrors(prev => ({
            ...prev,
            submit: 'Failed to create shipment. Please check your form entries and try again.'
          }));
        }
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
  if ((loading && isEditMode) || customersLoading) {
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

      <form className="form shipment-form" onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="dateAdded">Date Added</label>
          <input
            type="date"
            id="dateAdded"
            name="dateAdded"
            value={dateAdded}
            onChange={onChange}
            className={errors.dateAdded ? 'form-control is-invalid' : 'form-control'}
          />
          {errors.dateAdded && <div className="invalid-feedback">{errors.dateAdded}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="customer">Customer</label>
          <select
            id="customer"
            name="customer"
            value={customer}
            onChange={onChange}
            className={errors.customer ? 'form-control is-invalid' : 'form-control'}
            required
          >
            <option value="">Select a customer</option>
            {customers.map(cust => (
              <option key={cust._id} value={cust._id}>
                {cust.name}
              </option>
            ))}
          </select>
          {errors.customer && <div className="invalid-feedback">{errors.customer}</div>}
          <small className="form-text">
            <Link to="/customers">Manage customers</Link>
          </small>
        </div>
        
        <div className="form-group">
          <label htmlFor="orderStatus">Order Status</label>
          <select
            id="orderStatus"
            name="orderStatus"
            value={orderStatus}
            onChange={onChange}
            className={errors.orderStatus ? 'form-control is-invalid' : 'form-control'}
          >
            <option value="planned">Planned</option>
            <option value="confirmed">Confirmed</option>
            <option value="done">Done</option>
            <option value="canceled">Canceled</option>
          </select>
          {errors.orderStatus && <div className="invalid-feedback">{errors.orderStatus}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="shipmentStatus">Shipment Status</label>
          <select
            id="shipmentStatus"
            name="shipmentStatus"
            value={shipmentStatus}
            onChange={onChange}
            className={errors.shipmentStatus ? 'form-control is-invalid' : 'form-control'}
          >
            <option value="Pending">Pending</option>
            <option value="In Transit">In Transit</option>
            <option value="Arrived">Arrived</option>
            <option value="Delayed">Delayed</option>
            <option value="Canceled">Canceled</option>
          </select>
          {errors.shipmentStatus && <div className="invalid-feedback">{errors.shipmentStatus}</div>}
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="weight">Weight (kg)</label>
            <input
              type="number"
              id="weight"
              name="weight"
              value={weight}
              onChange={onChange}
              className={errors.weight ? 'form-control is-invalid' : 'form-control'}
              placeholder="Total weight in kg"
              step="0.01"
              min="0"
            />
            {errors.weight && <div className="invalid-feedback">{errors.weight}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="packageCount">Number of Packages</label>
            <input
              type="number"
              id="packageCount"
              name="packageCount"
              value={packageCount}
              onChange={onChange}
              className={errors.packageCount ? 'form-control is-invalid' : 'form-control'}
              placeholder="Number of packages"
              min="0"
            />
            {errors.packageCount && <div className="invalid-feedback">{errors.packageCount}</div>}
          </div>
        </div>
        
        {/* Shipment Legs section - allow in both create and edit modes */}
        <div className="shipment-legs-section">
          <ShipmentLegs shipmentId={isEditMode ? id : tempShipmentId} />
          {!isEditMode && (
            <div className="alert alert-warning">
              <i className="fas fa-exclamation-triangle"></i> Legs added here will be associated with the shipment when saved.
            </div>
          )}
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="fileNumber">File Number</label>
            <input
              type="text"
              id="fileNumber"
              name="fileNumber"
              value={fileNumber}
              onChange={onChange}
              className="form-control"
              placeholder="Internal file number"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="fileCreatedDate">File Created Date</label>
            <input
              type="date"
              id="fileCreatedDate"
              name="fileCreatedDate"
              value={fileCreatedDate}
              onChange={onChange}
              className="form-control"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Cost (USD)</label>
          <input
            type="number"
            name="cost"
            value={cost}
            onChange={onChange}
            className={errors.cost ? 'form-control is-invalid' : 'form-control'}
            step="0.01"
            min="0"
          />
          {errors.cost && <div className="invalid-feedback">{errors.cost}</div>}
        </div>

        <div className="form-group">
          <label>Receivables (USD)</label>
          <input
            type="number"
            name="receivables"
            value={receivables}
            onChange={onChange}
            className="form-control"
            step="0.01"
            min="0"
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
          <label>Created By*</label>
          <input
            type="text"
            name="createdBy"
            value={createdBy}
            onChange={onChange}
            className={errors.createdBy ? 'form-control is-invalid' : 'form-control'}
            placeholder="Enter your name"
          />
          {errors.createdBy && <div className="invalid-feedback">{errors.createdBy}</div>}
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