// Stats.js
import React from 'react';
import { apiCall, API_BASE } from '../helpers';

class Stats extends React.Component {
  state = {
    wins: 0,
    history: [],
    error: ''
  };

  componentDidMount() {
    if (!this.props.currentUser) return;
    apiCall(`${API_BASE}/stats?userId=${this.props.currentUser.id}`)
      .then((data) => this.setState({ wins: data.wins, history: data.history }))
      .catch((err) =>
        this.setState({ error: 'Error loading stats: ' + err.message })
      );
  }

  render() {
    return (
      <div
        className="stats-background animate__animated animate__fadeIn"
        style={{
          minHeight: '100vh',
          background: "url('https://example.com/stats-bg.jpg') no-repeat center center/cover",
          padding: '30px'
        }}
      >
        <div className="container stats">
          <h2 className="text-white mb-4">Your Stats</h2>
          <div className="card" style={{ borderRadius: '8px' }}>
            <div className="card-body">
              <h4 className="card-title">Wins: {this.state.wins}</h4>
              {this.state.history.length > 0 ? (
                <ul className="list-group mt-3">
                  {this.state.history.map((entry, idx) => (
                    <li
                      key={idx}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <strong>{entry.game}</strong>
                      <span>Score: {entry.score}</span>
                      <span>{new Date(entry.date).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3">No game history available.</p>
              )}
            </div>
          </div>
          {this.state.error && (
            <div className="alert alert-danger mt-3">{this.state.error}</div>
          )}
        </div>
      </div>
    );
  }
}

export default Stats;
