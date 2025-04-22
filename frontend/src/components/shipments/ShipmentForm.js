import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { addShipment, getShipment, updateShipment, clearShipment } from '../../actions/shipment';
import axios from '../../utils/axiosConfig';
import Spinner from '../layout/Spinner';
import ShipmentLegs from './ShipmentLegs';
import AutocompleteSearch from '../common/AutocompleteSearch';
import { toast } from 'react-hot-toast';
import ShipmentSidebar from './ShipmentSidebar';
import { generateUniqueId, ID_PREFIXES } from '../../utils/idGenerator';

const initialState = {
  dateAdded: new Date().toISOString().split('T')[0],
  orderStatus: 'planned',
  customer: '',
  shipmentStatus: 'Pending',
  weight: '',
  packageCount: '',
  length: '',
  width: '',
  height: '',
  volumetricWeight: '',
  chargeableWeight: '',
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
  legs: [],
  changeLog: []
};

const ShipmentForm = ({ 
  addShipment, 
  getShipment, 
  updateShipment, 
  clearShipment, 
  shipment: { shipment, loading } 
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [tempShipmentId, setTempShipmentId] = useState(null);
  const [activeSection, setActiveSection] = useState('basic');
  const [formInitialized, setFormInitialized] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams(); // Get the shipment ID from URL params
  const isEditMode = !!id;

  const [users, setUsers] = useState([]);
  const [shippers, setShippers] = useState([]);
  const [consignees, setConsignees] = useState([]);
  const [notifyParties, setNotifyParties] = useState([]);
  const [entityManagers, setEntityManagers] = useState([]);

  const [selectedShipper, setSelectedShipper] = useState(null);
  const [selectedConsignee, setSelectedConsignee] = useState(null);
  const [selectedNotifyParty, setSelectedNotifyParty] = useState(null);

  // Handle section change from sidebar
  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  // Render the leg section even in create mode with a temp ID
  useEffect(() => {
    if (!tempShipmentId && !isEditMode) {
      setTempShipmentId('temp-' + Date.now());
    }
  }, [tempShipmentId, isEditMode]);

  // Fetch entities whenever the component loads
  useEffect(() => {
    // Load the entities first (customers, users, etc.)
    loadEntities().then(() => {
      // If we have a shipment ID, load that shipment's data
      if (id) {
        getShipment(id);
      }
    });
  }, [id, getShipment]);

  // Populate form data when shipment is loaded
  useEffect(() => {
    if (!loading && shipment && isEditMode && !formInitialized) {
      console.log('Populating form data from shipment:', shipment);
      
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
      const shipmentData = { ...initialState }; 
      
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
          } else if (key === 'legs') {
            // Preserve legs array
            shipmentData.legs = shipment.legs || [];
          } else {
            shipmentData[key] = shipment[key];
          }
        }
      }
      
      console.log('Setting form data to:', shipmentData);
      setFormData(shipmentData);
      setFormInitialized(true);
    } else if (isEditMode && loading && !formInitialized) {
      // While loading edit data, still show form with defaults
      console.log('Loading shipment data - displaying empty form with defaults');
      setFormData({
        ...initialState,
        dateAdded: new Date().toISOString().split('T')[0],
        customer: 'Loading...',
        shipmentStatus: 'Loading...',
        shipperName: 'Loading...',
        consigneeName: 'Loading...',
      });
    }
  }, [loading, shipment, isEditMode, formInitialized, initialState]);

  // Replace fetchCustomers with loadEntities
  const loadEntities = async () => {
    try {
      // Try to load customer data from public endpoint first
      try {
        console.log('Fetching customers from public endpoint...');
        const customersRes = await axios.get('/api/customers/public');
        setCustomers(customersRes.data);
        console.log('Loaded customers from public endpoint:', customersRes.data.length);
      } catch (customerError) {
        console.error('Error fetching customers from public endpoint:', customerError);
        // Fall back to authenticated endpoint
        try {
          const customersAuthRes = await axios.get('/api/customers');
          setCustomers(customersAuthRes.data);
        } catch (authError) {
          console.error('Error fetching customers from authenticated endpoint:', authError);
          // Use empty array as fallback
          setCustomers([]);
        }
      }
      
      // Try to load users from public endpoint first
      try {
        console.log('Fetching users from public endpoint...');
        const usersRes = await axios.get('/api/users/public');
        setUsers(usersRes.data);
        console.log('Loaded users from public endpoint:', usersRes.data.length);
      } catch (userError) {
        console.error('Error fetching users from public endpoint:', userError);
        // Fall back to authenticated endpoint
        try {
          const usersAuthRes = await axios.get('/api/users');
          setUsers(usersAuthRes.data);
        } catch (authError) {
          console.error('Error fetching users from authenticated endpoint:', authError);
          // Use empty array as fallback
          setUsers([]);
        }
      }
      
      // No more redirect on error - just use what we have
      return true;
    } catch (err) {
      console.error('Error fetching entities:', err);
      // Instead of redirecting, just continue with empty entities
      console.log('Continuing with empty entities data');
      return false;
    }
  };

  // Fetch shippers from the API
  const fetchShippers = async () => {
    try {
      const res = await axios.get('/api/shippers');
      setShippers(res.data);
    } catch (err) {
      console.error('Error fetching shippers:', err);
    }
  };

  // Fetch consignees from the API
  const fetchConsignees = async () => {
    try {
      const res = await axios.get('/api/consignees');
      setConsignees(res.data);
    } catch (err) {
      console.error('Error fetching consignees:', err);
    }
  };

  // Fetch notify parties from the API
  const fetchNotifyParties = async () => {
    try {
      const res = await axios.get('/api/notify-parties');
      setNotifyParties(res.data);
    } catch (err) {
      console.error('Error fetching notify parties:', err);
    }
  };

  // Fetch entity managers
  const fetchEntityManagers = async () => {
    try {
      // First try the authenticated endpoint
      try {
        const res = await axios.get('/api/users');
        const managers = res.data.filter(user => user.role === 'manager' || user.role === 'admin');
        // setEntityManagers(managers);
      } catch (error) {
        console.log('Error with authenticated users endpoint, trying public endpoint...');
        // If that fails, try the public endpoint
        const publicRes = await axios.get('/api/users/public');
        const managers = publicRes.data.filter(user => user.role === 'manager' || user.role === 'admin');
        // setEntityManagers(managers);
      }
    } catch (err) {
      console.error('Error fetching entities:', err);
      console.log('Session expired, redirecting to login...');
      // setEntityManagers([]);
    }
  };

  // Load entities data when component mounts
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        // Fetch shippers
        const shippersRes = await axios.get('/api/shippers');
        setShippers(shippersRes.data);
        
        // Fetch consignees
        const consigneesRes = await axios.get('/api/consignees');
        setConsignees(consigneesRes.data);
        
        // Fetch notify parties
        const notifyPartiesRes = await axios.get('/api/notify-parties');
        setNotifyParties(notifyPartiesRes.data);
        
        // Fetch users
        const usersRes = await axios.get('/api/users');
        setUsers(usersRes.data);
        
        // Set entity managers too
        const managers = usersRes.data.filter(user => user.role === 'manager' || user.role === 'admin');
        setEntityManagers(managers);
      } catch (error) {
        console.error('Error fetching entities:', error);
        if (error.response?.status === 401) {
          console.log('Session expired, redirecting to login...');
          navigate('/login');
        } else {
          toast.error('Failed to load entities data');
        }
      }
    };
    
    fetchEntities();
  }, [navigate]);
  
  // Update the selected entities when editing an existing shipment
  useEffect(() => {
    if (isEditMode && shipment && !loading) {
      if (shipment.shipper) {
        const shipper = shippers.find(s => s._id === (typeof shipment.shipper === 'object' ? shipment.shipper._id : shipment.shipper));
        setSelectedShipper(shipper || null);
      }
      
      if (shipment.consignee) {
        const consignee = consignees.find(c => c._id === (typeof shipment.consignee === 'object' ? shipment.consignee._id : shipment.consignee));
        setSelectedConsignee(consignee || null);
      }
      
      if (shipment.notifyParty) {
        const notifyParty = notifyParties.find(np => np._id === (typeof shipment.notifyParty === 'object' ? shipment.notifyParty._id : shipment.notifyParty));
        setSelectedNotifyParty(notifyParty || null);
      }
    }
  }, [isEditMode, shipment, shippers, consignees, notifyParties, loading]);

  const {
    dateAdded,
    orderStatus,
    customer,
    shipmentStatus,
    weight,
    packageCount,
    length,
    width,
    height,
    volumetricWeight,
    chargeableWeight,
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
    if (length && isNaN(Number(length))) {
      newErrors.length = 'Length must be a number';
    }
    if (width && isNaN(Number(width))) {
      newErrors.width = 'Width must be a number';
    }
    if (height && isNaN(Number(height))) {
      newErrors.height = 'Height must be a number';
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
    
    setFormData(prevState => {
      const updatedState = {
        ...prevState,
        [name]: type === 'checkbox' ? checked : value
      };

      // Calculate volumetric weight and chargeable weight when dimensions change
      if (['length', 'width', 'height', 'weight'].includes(name)) {
        const length = name === 'length' ? parseFloat(value) || 0 : parseFloat(prevState.length) || 0;
        const width = name === 'width' ? parseFloat(value) || 0 : parseFloat(prevState.width) || 0;
        const height = name === 'height' ? parseFloat(value) || 0 : parseFloat(prevState.height) || 0;
        const weight = name === 'weight' ? parseFloat(value) || 0 : parseFloat(prevState.weight) || 0;
        
        // Only calculate if all dimensions are provided
        if (length > 0 && width > 0 && height > 0) {
          // Volumetric Weight (kg) = (Length × Width × Height in cm) / 6000
          const volumetricWeight = (length * width * height) / 6000;
          updatedState.volumetricWeight = volumetricWeight.toFixed(2);
          
          // The chargeable weight is the higher of actual weight or volumetric weight
          updatedState.chargeableWeight = Math.max(weight, volumetricWeight).toFixed(2);
        } else {
          // If dimensions aren't complete, set volumetric weight to empty and use actual weight
          updatedState.volumetricWeight = '';
          updatedState.chargeableWeight = weight > 0 ? weight.toString() : '';
        }
      }

      return updatedState;
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Prepare formData for submission
      const formDataToSubmit = { ...formData };
      
      // Handle case when we have no customers or users - use defaults
      if (!formData.customerId && formData.customer) {
        formDataToSubmit.customerName = formData.customer;
      }
      
      // Assign a default value for createdBy if none is set
      if (!formDataToSubmit.createdBy) {
        formDataToSubmit.createdBy = 'system-default';
      }
      
      if (id) {
        // Update existing shipment
        await updateShipment(id, formDataToSubmit, navigate);
        toast.success('Shipment updated successfully');
      } else {
        // Create new shipment
        await addShipment(formDataToSubmit, navigate);
        toast.success('Shipment created successfully');
      }
    } catch (err) {
      console.error('Error saving shipment:', err);
      // Show error without redirecting to login
      toast.error('Error saving shipment. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  // Add function to calculate shipment status based on legs
  const calculateShipmentStatus = (legs) => {
    if (!legs || !legs.length) return 'Pending';
    
    // If all legs are arrived, shipment is completed
    const allArrived = legs.every(leg => leg.status === 'Arrived' || leg.status === 'Completed');
    if (allArrived) return 'Arrived';
    
    // If first leg is pending, shipment is pending
    const firstLegPending = legs[0]?.status === 'Pending' || legs[0]?.status === 'Planned';
    if (firstLegPending) return 'Pending';
    
    // If any leg is in transit or not arrived, shipment is in transit
    const anyInTransit = legs.some(leg => leg.status !== 'Arrived' && leg.status !== 'Completed');
    if (anyInTransit) return 'In Transit';
    
    return 'Pending'; // Default fallback
  };

  // Update the handleLegChange function to recalculate shipment status
  const handleLegChange = (index, field, value) => {
    const updatedLegs = [...formData.legs];
    updatedLegs[index] = {
      ...updatedLegs[index],
      [field]: value,
      legId: updatedLegs[index].legId || `LEG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    // Calculate new shipment status based on updated legs
    const newShipmentStatus = calculateShipmentStatus(updatedLegs);
    
    setFormData({ 
      ...formData, 
      legs: updatedLegs,
      shipmentStatus: newShipmentStatus // Update shipment status automatically
    });
  };

  // Load shipment data for editing
  const loadShipmentData = (shipmentId) => {
    getShipment(shipmentId);
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

      <div className="shipment-container">
        <ShipmentSidebar 
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          isEditMode={true}
        />
        
        <div className="shipment-main-content">
          <form className="form shipment-form" onSubmit={onSubmit}>
            <div className="form-group">
              <label htmlFor="dateAdded">Date Added</label>
              <input
                type="date"
                id="dateAdded"
                name="dateAdded"
                value={formData.dateAdded}
                onChange={onChange}
                className={errors.dateAdded ? 'form-control is-invalid' : 'form-control'}
                disabled
              />
              {errors.dateAdded && <div className="invalid-feedback">{errors.dateAdded}</div>}
            </div>
            
            {/* SECTION 1: Basic Information */}
            <div id="basic" className="form-section">
              <h3 className="section-title">Basic Information</h3>
              <div className="form-group">
                <label htmlFor="orderStatus">Order Status</label>
                <select
                  id="orderStatus"
                  name="orderStatus"
                  value={formData.orderStatus}
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
                <label htmlFor="shipmentStatus">Shipment Status (Auto-calculated)</label>
                <input
                  type="text"
                  id="shipmentStatus"
                  name="shipmentStatus"
                  value={formData.shipmentStatus}
                  className="form-control"
                  disabled
                  title="This is automatically calculated based on the status of all legs"
                />
                <small className="form-text text-muted">
                  This is calculated automatically based on leg statuses:
                  <ul>
                    <li>If all legs are 'Arrived' → Shipment is 'Arrived'</li>
                    <li>If first leg is 'Pending' → Shipment is 'Pending'</li>
                    <li>Otherwise → Shipment is 'In Transit'</li>
                  </ul>
                </small>
              </div>
            </div>
            
            {/* SECTION 2: Customer & Parties Information */}
            <div id="parties" className="form-section">
              <h3 className="section-title">Customer & Parties Information</h3>
              <div className="form-group">
                <label htmlFor="customer">Customer*</label>
                {customersLoading ? (
                  <p>Loading customers...</p>
                ) : (
                  <select
                    id="customer"
                    name="customer" 
                    value={formData.customer}
                    onChange={onChange}
                    className={errors.customer ? 'form-control is-invalid' : 'form-control'}
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name || customer.companyName} {customer.customerId ? `(${customer.customerId})` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {errors.customer && <div className="invalid-feedback">{errors.customer}</div>}
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="shipper">Shipper*</label>
                  <AutocompleteSearch
                    items={shippers}
                    displayField="name"
                    secondaryField="shipperId"
                    placeholder="Search shippers..."
                    selectedItem={selectedShipper}
                    onItemSelect={setSelectedShipper}
                  />
                  {errors.shipperName && <div className="invalid-feedback">{errors.shipperName}</div>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="consignee">Consignee*</label>
                  <AutocompleteSearch
                    items={consignees}
                    displayField="name"
                    secondaryField="consigneeId"
                    placeholder="Search consignees..."
                    selectedItem={selectedConsignee}
                    onItemSelect={setSelectedConsignee}
                  />
                  {errors.consigneeName && <div className="invalid-feedback">{errors.consigneeName}</div>}
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="notifyParty">Notify Party</label>
                <AutocompleteSearch
                  items={notifyParties}
                  displayField="name"
                  secondaryField="notifyPartyId"
                  placeholder="Search notify parties..."
                  selectedItem={selectedNotifyParty}
                  onItemSelect={setSelectedNotifyParty}
                />
              </div>
            </div>
            
            {/* SECTION 3: Weight, Packages, Dimensions, Volume */}
            <div id="dimensions" className="form-section">
              <h3 className="section-title">Weight & Dimensions</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="weight">Actual Weight (kg)*</label>
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
                  <label htmlFor="packageCount">Number of Packages*</label>
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
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="length">Length (cm)</label>
                  <input
                    type="number"
                    id="length"
                    name="length"
                    value={formData.length}
                    onChange={onChange}
                    className={errors.length ? 'form-control is-invalid' : 'form-control'}
                    placeholder="Length in cm"
                    step="0.1"
                    min="0"
                  />
                  {errors.length && <div className="invalid-feedback">{errors.length}</div>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="width">Width (cm)</label>
                  <input
                    type="number"
                    id="width"
                    name="width"
                    value={formData.width}
                    onChange={onChange}
                    className={errors.width ? 'form-control is-invalid' : 'form-control'}
                    placeholder="Width in cm"
                    step="0.1"
                    min="0"
                  />
                  {errors.width && <div className="invalid-feedback">{errors.width}</div>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="height">Height (cm)</label>
                  <input
                    type="number"
                    id="height"
                    name="height"
                    value={formData.height}
                    onChange={onChange}
                    className={errors.height ? 'form-control is-invalid' : 'form-control'}
                    placeholder="Height in cm"
                    step="0.1"
                    min="0"
                  />
                  {errors.height && <div className="invalid-feedback">{errors.height}</div>}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="volumetricWeight">Volumetric Weight (kg)</label>
                  <input
                    type="text"
                    id="volumetricWeight"
                    value={formData.volumetricWeight}
                    className="form-control"
                    readOnly
                    disabled
                    title="Calculated as (Length × Width × Height) / 6000"
                  />
                  <small className="form-text text-muted">Calculated as (L × W × H) / 6000</small>
                </div>
                
                <div className="form-group">
                  <label htmlFor="chargeableWeight">Chargeable Weight (kg)</label>
                  <input
                    type="text"
                    id="chargeableWeight"
                    value={formData.chargeableWeight}
                    className="form-control"
                    readOnly
                    disabled
                    title="The higher of actual weight or volumetric weight"
                  />
                  <small className="form-text text-muted">Higher of actual or volumetric weight</small>
                </div>
              </div>
            </div>
            
            {/* SECTION 5: Shipment Legs */}
            <div id="legs" className="form-section">
              <h3 className="section-title">Shipment Legs</h3>
              <div className="shipment-legs-section">
                <ShipmentLegs shipmentId={isEditMode ? id : tempShipmentId} />
                {!isEditMode && (
                  <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle"></i> Legs added here will be associated with the shipment when saved.
                  </div>
                )}
              </div>
            </div>
            
            {/* SECTION 6: File Info & Financials */}
            <div id="file" className="form-section">
              <h3 className="section-title">File Information & Financials</h3>
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
              
              <div className="form-row">
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
                    placeholder="Cost amount"
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
                    placeholder="Receivables amount"
                  />
                </div>
              </div>
            </div>
            
            {/* SECTION 7: Invoice Information */}
            <div id="invoice" className="form-section">
              <h3 className="section-title">Invoice Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Invoice Number</label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={invoiceNumber}
                    onChange={onChange}
                    className="form-control"
                    placeholder="Invoice number if available"
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
              </div>
              
              <div className="form-row checkbox-row">
                <div className="form-group">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      name="invoiced"
                      id="invoiced"
                      checked={invoiced}
                      onChange={onChange}
                      className="form-check-input"
                    />
                    <label className="form-check-label" htmlFor="invoiced">Invoiced</label>
                  </div>
                </div>

                <div className="form-group">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      name="invoiceSent"
                      id="invoiceSent"
                      checked={invoiceSent}
                      onChange={onChange}
                      className="form-check-input"
                    />
                    <label className="form-check-label" htmlFor="invoiceSent">Invoice Sent</label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* SECTION 8: Created By and Comments */}
            <div id="additional" className="form-section">
              <h3 className="section-title">Additional Information</h3>
              <div className="card">
                <div className="card-body">
                  <div className="form-group mb-3">
                    <label htmlFor="createdBy">Created By*</label>
                    <select
                      className={`form-control ${errors.createdBy ? "is-invalid" : ""}`}
                      id="createdBy"
                      name="createdBy"
                      value={formData.createdBy || ''}
                      onChange={onChange}
                      required
                    >
                      <option value="">Select User</option>
                      {users && users.length > 0 ? (
                        users.map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.name} ({user.email})
                          </option>
                        ))
                      ) : (
                        <option value="system-default">System Default</option>
                      )}
                    </select>
                    {errors.createdBy && (
                      <div className="invalid-feedback">{errors.createdBy}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="comments">Comments</label>
                    <textarea
                      className="form-control"
                      id="comments"
                      name="comments"
                      rows="4"
                      value={formData.comments || ''}
                      onChange={onChange}
                      placeholder="Add any additional comments about this shipment"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {isEditMode ? 'Update Shipment' : 'Create Shipment'}
              </button>
              <Link to="/shipments" className="btn btn-light">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
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