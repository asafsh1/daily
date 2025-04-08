import React, { useEffect, useState } from 'react';
import axios from '../../utils/axiosConfig';
import Spinner from '../layout/Spinner';
import CustomerItem from '../customers/CustomerItem';
import CustomerForm from '../customers/CustomerForm';
import { toast } from 'react-toastify';

const CustomerManager = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [error, setError] = useState(null);

  // Load customers on component mount
  useEffect(() => {
    getCustomers();
  }, []);

  // Fetch customers from API
  const getCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again later.');
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  // Delete customer
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/customers/${id}`);
      setCustomers(customers.filter(customer => customer._id !== id));
      toast.success('Customer deleted successfully');
    } catch (err) {
      console.error('Error deleting customer:', err);
      toast.error(err.response?.data?.msg || 'Error deleting customer');
    }
  };

  // Open form to edit customer
  const handleEdit = (customer) => {
    setEditCustomer(customer);
    setShowForm(true);
  };

  // Handle form submission (add/edit)
  const handleFormSubmit = async (customerData) => {
    try {
      if (editCustomer) {
        // Update existing customer
        const res = await axios.put(`/api/customers/${editCustomer._id}`, customerData);
        setCustomers(
          customers.map(customer => 
            customer._id === editCustomer._id ? res.data : customer
          )
        );
        toast.success('Customer updated successfully');
      } else {
        // Add new customer
        const res = await axios.post('/api/customers', customerData);
        setCustomers([...customers, res.data]);
        toast.success('Customer added successfully');
      }
      
      // Close form and reset
      setShowForm(false);
      setEditCustomer(null);
    } catch (err) {
      console.error('Error saving customer:', err);
      const errorMsg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.msg || 'An error occurred';
      toast.error(errorMsg);
    }
  };

  // Handle form cancel
  const handleCancel = () => {
    setShowForm(false);
    setEditCustomer(null);
  };

  if (loading) return <Spinner />;

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">Customer Management</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowForm(true)}
          disabled={showForm}
        >
          <i className="fas fa-plus"></i> Add Customer
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <CustomerForm 
          initialData={editCustomer}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
        />
      )}

      {customers.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => (
                <CustomerItem 
                  key={customer._id} 
                  customer={customer} 
                  onDelete={handleDelete} 
                  onEdit={handleEdit} 
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="alert alert-info">No customers found. Please add a customer.</p>
      )}
    </div>
  );
};

export default CustomerManager; 