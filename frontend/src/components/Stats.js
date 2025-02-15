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
      <div className="container mt-5 animate__animated animate__fadeIn">
        <h2>Your Stats</h2>
        {this.state.error && (
          <div className="error-message">{this.state.error}</div>
        )}
        <p>
          <strong>Total Wins:</strong> {this.state.wins}
        </p>
        <h4>Game History</h4>
        {this.state.history.length > 0 ? (
          <ul className="list-group">
            {this.state.history.map((entry, idx) => (
              <li key={idx} className="list-group-item">
                <strong>{entry.game}</strong> – Score: {entry.score} on{' '}
                {new Date(entry.date).toLocaleString()}
              </li>
            ))}
          </ul>
        ) : (
          <p>No game history available.</p>
        )}
      </div>
    );
  }
}

export default Stats;
