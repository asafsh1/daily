  return (
    <div className="shipment-details">
      {/* ... other sections ... */}
      
      <div className="section">
        <h3>Change Log</h3>
        <div className="change-log">
          {changeLog.map((log, index) => (
            <div key={index} className="log-entry">
              <div className="log-header">
                <span className="log-timestamp">{new Date(log.timestamp).toLocaleString()}</span>
                <span className="log-user">{log.user}</span>
              </div>
              <div className="log-details">
                <p><strong>Action:</strong> {log.action}</p>
                {log.changes && (
                  <div className="log-changes">
                    {Object.entries(log.changes).map(([field, value]) => (
                      <p key={field}>
                        <strong>{field}:</strong> {JSON.stringify(value)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .change-log {
          margin-top: 1rem;
        }
        .log-entry {
          border: 1px solid #ddd;
          padding: 1rem;
          margin-bottom: 1rem;
          border-radius: 4px;
        }
        .log-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .log-timestamp {
          color: #666;
        }
        .log-user {
          font-weight: bold;
        }
        .log-details {
          margin-top: 0.5rem;
        }
        .log-changes {
          margin-top: 0.5rem;
          padding-left: 1rem;
          border-left: 2px solid #eee;
        }
      `}</style>
    </div>
  ); 