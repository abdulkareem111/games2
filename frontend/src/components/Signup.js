// Signup.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, apiCall } from '../helpers'; // added import

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
      const data = await apiCall(`${API_BASE}/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.state.email,
          username: this.state.username,
          password: this.state.password
        })
      });
      // Save token and a minimal user object
      localStorage.setItem('token', data.token);
      localStorage.setItem('currentUser', JSON.stringify({
        id: data.userId,
        email: this.state.email,
        username: this.state.username,
        coins: 10 // Default coins if not provided
      }));
      this.props.navigate('/games');
    } catch (err) {
      this.setState({ error: err.message });
    }
  };

  render() {
    return (
      <div
        className="signup-background animate__animated animate__fadeIn"
        style={{
          minHeight: '100vh',
          background: "url('remote.jpg') no-repeat center center/cover", // updated background
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div className="card signup-card" style={{ width: '400px', backgroundColor: 'rgba(255, 255, 255, 0.85)' }}>
          <div className="card-body">
            <h2 className="text-center mb-4">Signup</h2>
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
                <label>Username</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={this.state.username}
                  onChange={(e) => this.setState({ username: e.target.value, error: '' })}
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
                Signup
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

export default function WithNavigation(props) {
  const navigate = useNavigate();
  return <Signup {...props} navigate={navigate} />;
}
