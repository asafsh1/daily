import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import AirlineForm from './AirlineForm';

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
      const response = await fetch('/api/airlines');
      const data = await response.json();
      setAirlines(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching airlines:', err);
      toast.error('Failed to fetch airlines');
      setLoading(false);
    }
  };

  const handleAddAirline = async (airlineData) => {
    try {
      const response = await fetch('/api/airlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(airlineData),
      });

      if (!response.ok) {
        throw new Error('Failed to add airline');
      }

      const newAirline = await response.json();
      setAirlines([...airlines, newAirline]);
      setShowForm(false);
      toast.success('Airline added successfully');
    } catch (err) {
      console.error('Error adding airline:', err);
      toast.error('Failed to add airline');
    }
  };

  const handleUpdateAirline = async (airlineData) => {
    try {
      const response = await fetch(`/api/airlines/${editingAirline._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(airlineData),
      });

      if (!response.ok) {
        throw new Error('Failed to update airline');
      }

      const updatedAirline = await response.json();
      setAirlines(airlines.map(airline => 
        airline._id === updatedAirline._id ? updatedAirline : airline
      ));
      setEditingAirline(null);
      toast.success('Airline updated successfully');
    } catch (err) {
      console.error('Error updating airline:', err);
      toast.error('Failed to update airline');
    }
  };

  const handleDeleteAirline = async (id) => {
    if (!window.confirm('Are you sure you want to delete this airline?')) {
      return;
    }

    try {
      const response = await fetch(`/api/airlines/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete airline');
      }

      setAirlines(airlines.filter(airline => airline._id !== id));
      toast.success('Airline deleted successfully');
    } catch (err) {
      console.error('Error deleting airline:', err);
      toast.error('Failed to delete airline');
    }
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(airlines.map(airline => ({
      name: airline.name,
      code: airline.code,
      trackingUrlTemplate: airline.trackingUrlTemplate,
      status: airline.status
    })));

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'airlines.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      complete: async (results) => {
        try {
          const response = await fetch('/api/airlines/bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(results.data),
          });

          if (!response.ok) {
            throw new Error('Failed to import airlines');
          }

          const importedAirlines = await response.json();
          setAirlines([...airlines, ...importedAirlines]);
          toast.success('Airlines imported successfully');
        } catch (err) {
          console.error('Error importing airlines:', err);
          toast.error('Failed to import airlines');
        }
      },
      header: true,
      skipEmptyLines: true,
      error: (error) => {
        console.error('Error parsing CSV:', error);
        toast.error('Failed to parse CSV file');
      },
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Loading airlines...</p>
      </div>
    );
  }

  return (
    <div className="airline-manager">
      <div className="airline-header">
        <h2 className="airline-title">Airlines Management</h2>
        <div className="airline-actions">
          <button 
            className="btn btn-success"
            onClick={handleExportCSV}
          >
            <i className="fas fa-file-export"></i> Export CSV
          </button>
          <label className="btn btn-secondary">
            <i className="fas fa-file-import"></i> Import CSV
            <input
              type="file"
              className="file-input"
              accept=".csv"
              onChange={handleImportCSV}
            />
          </label>
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            <i className="fas fa-plus"></i> Add Airline
          </button>
        </div>
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
        <table>
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
                <td>{airline.trackingUrlTemplate}</td>
                <td>
                  <span className={`status-badge status-${airline.status}`}>
                    {airline.status}
                  </span>
                </td>
                <td>
                  <button
                    className="btn-icon btn-edit"
                    onClick={() => {
                      setEditingAirline(airline);
                      setShowForm(true);
                    }}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => handleDeleteAirline(airline._id)}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
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

        .airline-actions {
          display: flex;
          gap: 10px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-primary {
          background: #0d6efd;
          color: white;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-success {
          background: #198754;
          color: white;
        }

        .airline-list table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        .airline-list th,
        .airline-list td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }

        .airline-list th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #495057;
        }

        .airline-list tr:hover {
          background-color: #f8f9fa;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-active {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .status-inactive {
          background: #ffebee;
          color: #c62828;
        }

        .btn-icon {
          padding: 6px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 4px;
          color: #6c757d;
        }

        .btn-edit {
          background: #e3f2fd;
          color: #1976d2;
        }

        .btn-delete {
          background: #ffebee;
          color: #d32f2f;
        }

        .file-input {
          display: none;
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: #6c757d;
        }

        .loading i {
          font-size: 24px;
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  );
};

export default AirlineManager; 