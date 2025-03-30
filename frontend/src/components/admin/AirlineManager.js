import React, { useEffect, useState } from 'react';
import axios from '../../utils/axiosConfig';
import Spinner from '../layout/Spinner';
import AirlineItem from './AirlineItem';
import AirlineForm from './AirlineForm';

const AirlineManager = () => {
  const [airlines, setAirlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editAirline, setEditAirline] = useState(null);

  // Load airlines on component mount
  useEffect(() => {
    getAirlines();
  }, []);

  // Fetch airlines from API
  const getAirlines = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/airlines');
      setAirlines(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching airlines:', err);
      setLoading(false);
    }
  };

  // Delete airline
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this airline?')) {
      try {
        await axios.delete(`/api/airlines/${id}`);
        setAirlines(airlines.filter(airline => airline._id !== id));
      } catch (err) {
        console.error('Error deleting airline:', err);
        alert(`Error: ${err.response?.data?.msg || 'Something went wrong'}`);
      }
    }
  };

  // Open form to edit airline
  const handleEdit = (airline) => {
    setEditAirline(airline);
    setShowForm(true);
  };

  // Handle form submission (add/edit)
  const handleFormSubmit = async (airlineData) => {
    try {
      if (editAirline) {
        // Update existing airline
        const res = await axios.put(`/api/airlines/${editAirline._id}`, airlineData);
        setAirlines(
          airlines.map(airline => 
            airline._id === editAirline._id ? res.data : airline
          )
        );
      } else {
        // Add new airline
        const res = await axios.post('/api/airlines', airlineData);
        setAirlines([...airlines, res.data]);
      }
      
      // Close form and reset
      setShowForm(false);
      setEditAirline(null);
    } catch (err) {
      console.error('Error saving airline:', err);
      alert(`Error: ${err.response?.data?.errors?.[0]?.msg || err.response?.data?.msg || 'Something went wrong'}`);
    }
  };

  // Handle form cancel
  const handleCancel = () => {
    setShowForm(false);
    setEditAirline(null);
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">Airline Management</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowForm(true)}
          disabled={showForm}
        >
          <i className="fas fa-plus"></i> Add Airline
        </button>
      </div>

      {showForm && (
        <AirlineForm 
          initialData={editAirline}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
        />
      )}

      {loading ? (
        <Spinner />
      ) : airlines.length > 0 ? (
        <div className="airlines">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Tracking URL Template</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {airlines.map(airline => (
                <AirlineItem 
                  key={airline._id} 
                  airline={airline} 
                  onDelete={handleDelete} 
                  onEdit={handleEdit} 
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No airlines found. Please add an airline.</p>
      )}
    </div>
  );
};

export default AirlineManager; 