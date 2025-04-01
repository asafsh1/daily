import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosConfig';
import { toast } from 'react-toastify';
import AirlineForm from './AirlineForm';
import AirlineItem from './AirlineItem';

const AirlineManager = () => {
  const [airlines, setAirlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAirline, setEditingAirline] = useState(null);

  useEffect(() => {
    fetchAirlines();
  }, []);

  const fetchAirlines = async () => {
    try {
      const res = await axios.get('/api/airlines');
      setAirlines(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching airlines:', err);
      toast.error('Failed to fetch airlines');
      setLoading(false);
    }
  };

  const handleAddAirline = async (airlineData) => {
    try {
      const res = await axios.post('/api/airlines', airlineData);
      setAirlines([...airlines, res.data]);
      setShowForm(false);
      toast.success('Airline added successfully');
    } catch (err) {
      console.error('Error adding airline:', err);
      toast.error(err.response?.data?.message || 'Failed to add airline');
    }
  };

  const handleUpdateAirline = async (airlineData) => {
    try {
      const res = await axios.put(`/api/airlines/${editingAirline._id}`, airlineData);
      setAirlines(airlines.map(airline => 
        airline._id === editingAirline._id ? res.data : airline
      ));
      setEditingAirline(null);
      toast.success('Airline updated successfully');
    } catch (err) {
      console.error('Error updating airline:', err);
      toast.error(err.response?.data?.message || 'Failed to update airline');
    }
  };

  const handleDeleteAirline = async (airlineId) => {
    try {
      await axios.delete(`/api/airlines/${airlineId}`);
      setAirlines(airlines.filter(airline => airline._id !== airlineId));
      toast.success('Airline deleted successfully');
    } catch (err) {
      console.error('Error deleting airline:', err);
      toast.error(err.response?.data?.message || 'Failed to delete airline');
    }
  };

  const handleEditAirline = (airline) => {
    setEditingAirline(airline);
    setShowForm(true);
  };

  if (loading) {
    return <div>Loading airlines...</div>;
  }

  return (
    <div className="airline-manager">
      <style>
        {`
          .airline-manager {
            padding: 20px;
          }
          .airline-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
          }
          .airline-title {
            color: #2c3e50;
            font-size: 20px;
            margin: 0;
          }
          .airline-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }
          .airline-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s;
          }
          .airline-card:hover {
            transform: translateY(-2px);
          }
          .airline-name {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 10px;
          }
          .airline-code {
            color: #6c757d;
            font-size: 14px;
            margin-bottom: 15px;
          }
          .airline-url {
            word-break: break-all;
            font-size: 13px;
            color: #495057;
            margin-bottom: 15px;
          }
          .airline-actions {
            display: flex;
            gap: 10px;
          }
          .btn-icon {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            transition: all 0.2s;
          }
          .btn-edit {
            background: #e3f2fd;
            color: #1976d2;
          }
          .btn-delete {
            background: #ffebee;
            color: #d32f2f;
          }
          .btn-icon:hover {
            opacity: 0.9;
          }
        `}
      </style>

      <div className="airline-header">
        <h2 className="airline-title">Airlines Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          <i className="fas fa-plus"></i> Add Airline
        </button>
      </div>

      {showForm && (
        <AirlineForm
          onSubmit={editingAirline ? handleUpdateAirline : handleAddAirline}
          onCancel={() => {
            setShowForm(false);
            setEditingAirline(null);
          }}
          initialData={editingAirline}
        />
      )}

      <div className="airline-list">
        {airlines.map(airline => (
          <div key={airline._id} className="airline-card">
            <div className="airline-name">{airline.name}</div>
            <div className="airline-code">Code: {airline.code}</div>
            <div className="airline-url">
              Tracking URL: {airline.trackingUrlTemplate}
            </div>
            <div className="airline-actions">
              <button 
                className="btn-icon btn-edit"
                onClick={() => handleEditAirline(airline)}
              >
                <i className="fas fa-edit"></i> Edit
              </button>
              <button 
                className="btn-icon btn-delete"
                onClick={() => handleDeleteAirline(airline._id)}
              >
                <i className="fas fa-trash"></i> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AirlineManager; 