import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import AirlineForm from './AirlineForm';
import axios from '../../utils/axiosConfig';
import { generateUniqueId, ID_PREFIXES } from '../../utils/idGenerator';

const AirlineManager = () => {
  const [airlines, setAirlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAirline, setEditingAirline] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAirlines();
  }, []);

  const fetchAirlines = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching airlines...');
      
      const response = await axios.get('/api/airlines');
      
      if (Array.isArray(response.data)) {
        console.log(`Successfully loaded ${response.data.length} airlines`);
        setAirlines(response.data);
      } else {
        console.warn('No airlines found or invalid data format');
        setAirlines([]);
        setError('No airlines found in database');
      }
    } catch (err) {
      console.error('Error fetching airlines:', err);
      setAirlines([]);
      
      // Set appropriate error message based on error type
      if (err.isDatabaseError) {
        setError('Database connection is currently unavailable. Please try again later.');
        toast.error('Database connection error. The data cannot be loaded at this time.');
      } else if (err.isNetworkError) {
        setError('Cannot connect to the server. Please check your internet connection.');
        toast.error('Network connection error. Please check your connection and try again.');
      } else {
        setError(`Failed to fetch airlines: ${err.message}`);
        toast.error(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddAirline = async (airlineData) => {
    try {
      const response = await axios.post('/api/airlines', airlineData);
      
      if (response.data) {
        const newAirline = response.data;
        setAirlines([...airlines, newAirline]);
        setShowForm(false);
        toast.success('Airline added successfully');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Error adding airline:', err);
      
      // Handle specific error types
      if (err.isDatabaseError) {
        toast.error('Database connection error. Your airline cannot be saved at this time.');
      } else if (err.isNetworkError) {
        toast.error('Network connection error. Please check your connection and try again.');
      } else {
        toast.error(`Failed to add airline: ${err.response?.data?.msg || err.message || 'Unknown error'}`);
      }
    }
  };

  const handleUpdateAirline = async (airlineData) => {
    try {
      if (!editingAirline || !editingAirline._id) {
        throw new Error('No airline selected for update');
      }
      
      const response = await axios.put(`/api/airlines/${editingAirline._id}`, airlineData);
      
      if (response.data) {
        const updatedAirline = response.data;
        
        // Update the local state with the API data
        const updatedAirlines = airlines.map(airline => 
          airline._id === updatedAirline._id ? updatedAirline : airline
        );
        
        setAirlines(updatedAirlines);
        setEditingAirline(null);
        setShowForm(false);
        toast.success('Airline updated successfully');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Error updating airline:', err);
      toast.error(`Failed to update airline: ${err.response?.data?.msg || err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteAirline = async (id) => {
    if (!window.confirm('Are you sure you want to delete this airline?')) {
      return;
    }

    try {
      await axios.delete(`/api/airlines/${id}`);
      
      // Update local state
      const updatedAirlines = airlines.filter(airline => airline._id !== id);
      setAirlines(updatedAirlines);
      
      toast.success('Airline deleted successfully');
    } catch (err) {
      console.error('Error deleting airline:', err);
      toast.error(`Failed to delete airline: ${err.message || 'Unknown error'}`);
    }
  };

  const handleExportCSV = () => {
    if (airlines.length === 0) {
      toast.warn('No airlines to export');
      return;
    }

    const csv = Papa.unparse(airlines);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'airlines.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          if (results.data.length === 0) {
            toast.warn('No data found in CSV file');
            return;
          }

          // Validate data format
          const validData = results.data.filter(airline => 
            airline.name && airline.code && airline.trackingUrlTemplate
          );

          if (validData.length === 0) {
            toast.error('No valid airline data found in CSV');
            return;
          }

          // Add missing required fields and prepare for bulk import
          const preparedData = validData.map(airline => ({
            name: airline.name,
            code: airline.code,
            trackingUrlTemplate: airline.trackingUrlTemplate,
            status: airline.status || 'active'
          }));

          // Bulk import through API
          const response = await axios.post('/api/airlines/bulk', preparedData);
          
          if (response.data && Array.isArray(response.data)) {
            toast.success(`Successfully imported ${response.data.length} airlines`);
            fetchAirlines(); // Refresh the list
          } else {
            throw new Error('Invalid response from server');
          }
        } catch (err) {
          console.error('Error importing airlines:', err);
          toast.error(`Failed to import airlines: ${err.message || 'Unknown error'}`);
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        toast.error(`Failed to parse CSV: ${error.message}`);
      }
    });

    // Clear the file input
    event.target.value = null;
  };

  return (
    <div className="airlines-section admin-section">
      <div className="section-header">
        <h2>Airlines</h2>
        <div>
          <input
            type="file"
            id="csv-upload"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleImportCSV}
          />
          <button 
            className="btn btn-secondary"
            onClick={() => document.getElementById('csv-upload').click()}
          >
            Import CSV
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleExportCSV}
          >
            Export CSV
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => { setShowForm(true); setEditingAirline(null); }}
          >
            Add Airline
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <i className="fas fa-spinner fa-spin"></i>
          <span>Loading airlines...</span>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
          <button 
            className="btn btn-primary"
            onClick={() => { setShowForm(true); setEditingAirline(null); }}
          >
            Add First Airline
          </button>
        </div>
      ) : airlines.length === 0 ? (
        <div className="text-center">
          <p>No airlines found. Add your first airline to get started.</p>
          <button 
            className="btn btn-primary"
            onClick={() => { setShowForm(true); setEditingAirline(null); }}
          >
            Add First Airline
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Tracking URL Template</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {airlines.map(airline => (
                <tr key={airline._id}>
                  <td>{airline.name}</td>
                  <td>{airline.code}</td>
                  <td>
                    <span className="url-preview" title={airline.trackingUrlTemplate}>
                      {airline.trackingUrlTemplate}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${airline.status}`}>
                      {airline.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => { setEditingAirline(airline); setShowForm(true); }}
                      title="Edit"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDeleteAirline(airline._id)}
                      title="Delete"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AirlineForm
          airline={editingAirline}
          onSubmit={editingAirline ? handleUpdateAirline : handleAddAirline}
          onCancel={() => { setShowForm(false); setEditingAirline(null); }}
        />
      )}
    </div>
  );
};

export default AirlineManager; 