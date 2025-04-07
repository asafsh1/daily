import React, { useState, useEffect } from 'react';
import axios from '../../utils/axiosConfig';
import { useParams } from 'react-router-dom';

const LegDebugger = () => {
  const { shipmentId } = useParams();
  const [debugData, setDebugData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    if (!shipmentId) return;
    
    const fetchDebugData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching debug data for shipment:', shipmentId);
        const response = await axios.get(`/api/shipment-legs/debug/${shipmentId}`);
        
        console.log('Debug data received:', response.data);
        setDebugData(response.data);
      } catch (err) {
        console.error('Error fetching debug data:', err);
        setError(err.message || 'Failed to fetch debug data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDebugData();
  }, [shipmentId]);
  
  if (loading) {
    return <div className="alert alert-info">Loading leg debug information...</div>;
  }
  
  if (error) {
    return <div className="alert alert-danger">Error: {error}</div>;
  }
  
  if (!debugData) {
    return <div className="alert alert-warning">No debug data available</div>;
  }
  
  const { methods, uniqueLegsCount, uniqueLegs, mongoDbConnectionState } = debugData;
  
  const foundAnyLegs = uniqueLegsCount > 0;
  
  return (
    <div className="leg-debugger border p-3 mb-4 bg-light">
      <h4 className="mb-3">
        Shipment Legs Diagnostics
        <button 
          className="btn btn-sm btn-outline-secondary ml-2"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide Details' : 'Show Details'}
        </button>
      </h4>
      
      <div className="alert alert-info">
        <strong>Shipment ID:</strong> {shipmentId}<br />
        <strong>Database Connection:</strong> {mongoDbConnectionState}<br />
        <strong>Legs Found:</strong> {uniqueLegsCount}<br />
        <strong>Status:</strong> {foundAnyLegs ? 
          <span className="text-success">Legs found in database</span> : 
          <span className="text-danger">No legs found in database</span>
        }
      </div>
      
      {expanded && (
        <div className="debug-details">
          <h5>Search Methods</h5>
          <div className="table-responsive">
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Success</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((method, idx) => (
                  <tr key={idx}>
                    <td>{method.method}</td>
                    <td>
                      {method.success ? 
                        <span className="text-success">✓</span> : 
                        <span className="text-danger">✗</span>
                      }
                    </td>
                    <td>
                      {method.error && <div className="text-danger">{method.error}</div>}
                      {method.count !== undefined && <div>Found: {method.count} legs</div>}
                      {method.details && (
                        <pre className="bg-light p-2" style={{fontSize: '0.8rem'}}>
                          {JSON.stringify(method.details, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {foundAnyLegs && (
            <>
              <h5 className="mt-3">Found Legs ({uniqueLegsCount})</h5>
              <div className="table-responsive">
                <table className="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Source</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueLegs.map((leg, idx) => (
                      <tr key={idx}>
                        <td>{leg._id?.toString() || 'No ID'}</td>
                        <td>{leg.source}</td>
                        <td>{leg.from || leg.origin || 'N/A'}</td>
                        <td>{leg.to || leg.destination || 'N/A'}</td>
                        <td>{leg.legOrder || leg.order || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-3">
                <h5>First Leg Raw Data</h5>
                <pre className="bg-light p-2" style={{fontSize: '0.8rem'}}>
                  {JSON.stringify(uniqueLegs[0], null, 2)}
                </pre>
              </div>
            </>
          )}
          
          <div className="mt-3">
            <h5>Full Response</h5>
            <div className="alert alert-secondary">
              <small>For brevity, the full leg details are omitted.</small>
            </div>
            <pre className="bg-light p-2" style={{fontSize: '0.8rem', maxHeight: '300px', overflow: 'auto'}}>
              {JSON.stringify({...debugData, uniqueLegs: '[omitted]', methods: debugData.methods.map(m => ({...m, legs: m.legs ? `[${m.legs.length} legs]` : undefined}))}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegDebugger; 