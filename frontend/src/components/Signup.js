import React from 'react';
import { apiCall, API_BASE } from '../helpers';

class Signup extends React.Component {
  state = {
    email: '',
    username: '',
    password: '',
    error: ''
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiCall(`${API_BASE}/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.state.email,
          username: this.state.username,
          password: this.state.password
        })
      });
      this.props.changePage('login');
    } catch (err) {
      this.setState({ error: err.message });
    }
  };

  render() {
    return (
      <div className="container mt-5 animate__animated animate__fadeIn">
        <h2>Signup</h2>
        <form onSubmit={this.handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-control"
              required
              value={this.state.email}
              onChange={(e) => this.setState({ email: e.target.value, error: '' })}
            />
          </div>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              className="form-control"
              required
              value={this.state.username}
              onChange={(e) => this.setState({ username: e.target.value, error: '' })}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              required
              value={this.state.password}
              onChange={(e) => this.setState({ password: e.target.value, error: '' })}
            />
          </div>
          {this.state.error && (
            <div className="error-message">{this.state.error}</div>
          )}
          <button type="submit" className="btn btn-custom mt-3">
            Signup
          </button>
        </form>
      </div>
    );
  }
}

export default Signup;
