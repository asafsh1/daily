import React, { useEffect, useState } from 'react';
import axios from '../../utils/axiosConfig';
import Spinner from '../layout/Spinner';
import CustomerItem from '../customers/CustomerItem';
import CustomerForm from '../customers/CustomerForm';

const CustomerManager = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);

  // Load customers on component mount
  useEffect(() => {
    getCustomers();
  }, []);

  // Fetch customers from API
  const getCustomers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/customers');
      setCustomers(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setLoading(false);
    }
  };

  // Delete customer
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await axios.delete(`/api/customers/${id}`);
        setCustomers(customers.filter(customer => customer._id !== id));
      } catch (err) {
        console.error('Error deleting customer:', err);
      }
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
      } else {
        // Add new customer
        const res = await axios.post('/api/customers', customerData);
        setCustomers([...customers, res.data]);
      }
      
      // Close form and reset
      setShowForm(false);
      setEditCustomer(null);
    } catch (err) {
      console.error('Error saving customer:', err);
      alert(`Error: ${err.response?.data?.errors?.[0]?.msg || 'Something went wrong'}`);
    }
  };

  // Handle form cancel
  const handleCancel = () => {
    setShowForm(false);
    setEditCustomer(null);
  };

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

      {showForm && (
        <CustomerForm 
          initialData={editCustomer}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
        />
      )}

      {loading ? (
        <Spinner />
      ) : customers.length > 0 ? (
        <div className="customers">
          <table className="table">
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
        <p>No customers found. Please add a customer.</p>
      )}
    </div>
  );
};

export default CustomerManager; 