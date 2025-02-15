import React from 'react';
import { apiCall, API_BASE } from '../helpers';

class Login extends React.Component {
  state = {
    email: '',
    password: '',
    error: ''
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await apiCall(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.state.email,
          password: this.state.password
        })
      });
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      this.props.onLogin(data.user);
      this.props.changePage('games');
    } catch (err) {
      this.setState({ error: err.message });
    }
  };

  render() {
    return (
      <div className="container mt-5 animate__animated animate__fadeIn">
        <h2>Login</h2>
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
            Login
          </button>
        </form>
      </div>
    );
  }
}

export default Login;
