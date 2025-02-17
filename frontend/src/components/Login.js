// Login.js
import React from 'react';
import { apiCall, API_BASE } from '../helpers';
import { useNavigate } from 'react-router-dom';

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
      this.props.navigate('/games'); // navigate using react-router
    } catch (err) {
      this.setState({ error: err.message });
    }
  };

  render() {
    return (
      <div
        className="login-background animate__animated animate__fadeIn"
        style={{
          minHeight: '100vh',
          background: "url('remote.jpg') no-repeat center center/cover", // updated background
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div className="card login-card" style={{ width: '400px', backgroundColor: 'rgba(255, 255, 255, 0.85)' }}>
          <div className="card-body">
            <h2 className="text-center mb-4">Login</h2>
            <form onSubmit={this.handleSubmit}>
              <div className="form-group mb-3">
                <label>Email</label>
                <input
                  type="email"
                  className="form-control"
                  required
                  value={this.state.email}
                  onChange={(e) => this.setState({ email: e.target.value, error: '' })}
                />
              </div>
              <div className="form-group mb-3">
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
                <div className="alert alert-danger" role="alert">
                  {this.state.error}
                </div>
              )}
              <button type="submit" className="btn btn-custom w-100">
                Login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

// withNavigation HOC to inject navigate prop
export default function WithNavigation(props) {
  const navigate = useNavigate();
  return <Login {...props} navigate={navigate} />;
}
