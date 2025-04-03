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
  createdBy: '',
  shipperName: '',
  consigneeName: '',
  notifyParty: '',
  legs: []
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

  const [users, setUsers] = useState([]);

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

    // Fetch users for the createdBy dropdown
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/users`, {
          headers: {
            'x-auth-token': localStorage.getItem('token') || 'default-dev-token'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();

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
            } else if (key === 'customer') {
              // Handle customer object versus ID
              if (typeof shipment[key] === 'object' && shipment[key] !== null) {
                shipmentData[key] = shipment[key]._id || shipment[key];
              } else {
                shipmentData[key] = shipment[key];
              }
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
    createdBy,
    shipperName,
    consigneeName,
    notifyParty,
    legs
  } = formData;

  const validateForm = () => {
    const newErrors = {};
    
    console.log('Validating form fields:', {
      dateAdded,
      orderStatus,
      customer,
      shipmentStatus,
      createdBy,
      invoiceStatus,
      shipperName,
      consigneeName
    });
    
    if (!dateAdded) newErrors.dateAdded = 'Date added is required';
    if (!orderStatus) newErrors.orderStatus = 'Order status is required';
    if (!['done', 'confirmed', 'planned', 'canceled'].includes(orderStatus)) {
      newErrors.orderStatus = 'Invalid order status';
    }
    if (!customer) newErrors.customer = 'Customer is required';
    if (!shipmentStatus) {
      newErrors.shipmentStatus = 'Shipment status is required';
    } else {
      // Allow extended status values that start with valid statuses
      const baseStatuses = ['Pending', 'Arrived', 'Delayed', 'Canceled', 'In Transit'];
      const isValidStatus = baseStatuses.some(status => shipmentStatus.startsWith(status));
      
      if (!isValidStatus) {
        newErrors.shipmentStatus = `Invalid shipment status: '${shipmentStatus}'`;
      }
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
    if (!shipperName) newErrors.shipperName = 'Shipper name is required';
    if (!consigneeName) newErrors.consigneeName = 'Consignee name is required';

    console.log('Validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onChange = e => {
    const { name, value, type, checked } = e.target;
    // Don't allow changes to dateAdded
    if (name === 'dateAdded') return;
    
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const onSubmit = async e => {
    e.preventDefault();
    console.log('Form submission attempted with data:', formData);
    
    // Pre-validate and display errors clearly
    const validationResult = validateForm();
    if (!validationResult) {
      console.error('Form validation failed. Validation errors:', errors);
      
      // Display all validation errors in alert for better visibility
      const errorMessages = Object.values(errors).join('\n• ');
      window.alert(`Please fix the following errors:\n\n• ${errorMessages}`);
      
      // Highlight all invalid fields
      document.querySelectorAll('.is-invalid').forEach(field => {
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      
      return;
    }
    
    console.log('Form validation passed, preparing shipment data');

    // Filter out undefined fields and handle special data types
    const shipmentFields = {};
    for (const key in formData) {
      if (formData[key] !== undefined) {
        shipmentFields[key] = formData[key];
      }
    }
    
    // Ensure shipmentStatus is included in the update
    if (shipmentStatus && !shipmentFields.shipmentStatus) {
      shipmentFields.shipmentStatus = shipmentStatus;
    }
    
    console.log('Prepared shipment fields for submission:', shipmentFields);

    try {
      if (isEditMode) {
        console.log('Updating existing shipment with ID:', id);
        
        // Show processing indicator
        document.querySelector('button[type="submit"]').disabled = true;
        document.querySelector('button[type="submit"]').textContent = 'Processing...';
        
        try {
          // Use a direct API call for debugging
          const config = {
            headers: {
              'Content-Type': 'application/json'
            }
          };
          console.log('Making direct API call to debug issue');
          const directApiResult = await axios.put(`/api/shipments/${id}`, shipmentFields, config);
          console.log('Direct API Response:', directApiResult);
          
          if (directApiResult.status === 200) {
            console.log('Direct API call successful, now dispatching action');
            await updateShipment(id, shipmentFields, navigate);
            console.log('Update action dispatched');
          }
        } catch (apiError) {
          console.error('Direct API call failed:', apiError.response || apiError);
          throw apiError;
        }
        
        // Ensure navigation happens
        setTimeout(() => {
          console.log('Forcing navigation to shipment details');
          document.querySelector('button[type="submit"]').disabled = false;
          document.querySelector('button[type="submit"]').textContent = 'Update';
          navigate(`/shipments/${id}`);
        }, 1000);
      } else {
        // Create new shipment
        console.log('Creating new shipment');
        const res = await addShipment(shipmentFields);
        console.log('New shipment created:', res);
        
        // If there are temporary legs, assign them to the new shipment
        if (tempShipmentId && res && res._id) {
          const newShipmentId = res._id;
          try {
            console.log(`Reassigning legs from temp ID ${tempShipmentId} to new shipment ID ${newShipmentId}`);
            await axios.put(`/api/shipment-legs/reassign/${tempShipmentId}/${newShipmentId}`);
          } catch (err) {
            console.error('Error reassigning temp legs:', err);
          }
        }
        
        console.log('Navigating to shipments list');
        navigate('/shipments');
      }
    } catch (err) {
      console.error('Error saving shipment:', err);
      document.querySelector('button[type="submit"]').disabled = false;
      document.querySelector('button[type="submit"]').textContent = isEditMode ? 'Update' : 'Submit';
      
      // Extract and display detailed error message
      let errorMessage = 'Error saving shipment. Please try again.';
      if (err.response && err.response.data) {
        if (err.response.data.msg) {
          errorMessage = `Server error: ${err.response.data.msg}`;
        } else if (err.response.data.errors && err.response.data.errors.length > 0) {
          errorMessage = err.response.data.errors.map(e => e.msg).join(', ');
        }
      }
      
      setErrors({ submit: errorMessage });
      window.alert(errorMessage);
    }
  };

  const handleLegChange = (index, field, value) => {
    const updatedLegs = [...formData.legs];
    updatedLegs[index] = {
      ...updatedLegs[index],
      [field]: value,
      legId: updatedLegs[index].legId || `LEG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setFormData({ ...formData, legs: updatedLegs });
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
            disabled
          />
          {errors.dateAdded && <div className="invalid-feedback">{errors.dateAdded}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="customer">Customer*</label>
          {customersLoading ? (
            <p>Loading customers...</p>
          ) : (
            <select
              id="customer"
              name="customer"
              value={customer}
              onChange={onChange}
              className={errors.customer ? 'form-control is-invalid' : 'form-control'}
              required
            >
              <option value="">Select a customer</option>
              {customers.map(customer => (
                <option key={customer._id} value={customer._id}>
                  {customer.name}
                </option>
              ))}
            </select>
          )}
          {errors.customer && <div className="invalid-feedback">{errors.customer}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="shipperName">Shipper Name*</label>
          <input
            type="text"
            id="shipperName"
            name="shipperName"
            value={shipperName}
            onChange={onChange}
            className={errors.shipperName ? 'form-control is-invalid' : 'form-control'}
            required
          />
          {errors.shipperName && <div className="invalid-feedback">{errors.shipperName}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="consigneeName">Consignee Name*</label>
          <input
            type="text"
            id="consigneeName"
            name="consigneeName"
            value={consigneeName}
            onChange={onChange}
            className={errors.consigneeName ? 'form-control is-invalid' : 'form-control'}
            required
          />
          {errors.consigneeName && <div className="invalid-feedback">{errors.consigneeName}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="notifyParty">Notify Party</label>
          <input
            type="text"
            id="notifyParty"
            name="notifyParty"
            value={notifyParty}
            onChange={onChange}
            className={errors.notifyParty ? 'form-control is-invalid' : 'form-control'}
          />
          {errors.notifyParty && <div className="invalid-feedback">{errors.notifyParty}</div>}
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
          <label htmlFor="createdBy">Created By</label>
          <select
            id="createdBy"
            name="createdBy"
            value={createdBy}
            onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
            required
          >
            <option value="">Select User</option>
            {users.map(user => (
              <option key={user._id} value={user._id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
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