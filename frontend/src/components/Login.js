import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

class Login extends React.Component {
  state = {
    email: '',
    password: '',
    error: ''
  };

  handleEmailPasswordLogin = async (e) => {
    e.preventDefault();
    this.setState({ error: '' });
    try {
      const { data } = await axios.post(`${API_BASE}/users/login`, {
        email: this.state.email,
        password: this.state.password
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      if (this.props.onLogin) this.props.onLogin(data.user);

      this.props.navigate('/games');
    } catch (error) {
      this.setState({ error: error.response?.data?.error || error.message });
    }
  };

  handleGoogleSuccess = async (credentialResponse) => {
    const tokenId = credentialResponse.credential;
    if (!tokenId) return;
    try {
      const { data } = await axios.post(`${API_BASE}/auth/google`, { tokenId });

      localStorage.setItem('token', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      if (this.props.onLogin) this.props.onLogin(data.user);

      this.props.navigate('/games');
    } catch (error) {
      this.setState({ error: error.response?.data?.error || error.message });
    }
  };

  handleGoogleError = () => {
    this.setState({ error: 'Google Login Failed' });
  };

  handleFacebookResponse = async (response) => {
    const { accessToken } = response;
    if (!accessToken) {
      this.setState({ error: 'Facebook login failed or was canceled.' });
      return;
    }
    try {
      const { data } = await axios.post(`${API_BASE}/auth/facebook`, { accessToken });

      localStorage.setItem('token', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      if (this.props.onLogin) this.props.onLogin(data.user);

      this.props.navigate('/games');
    } catch (error) {
      this.setState({ error: error.response?.data?.error || error.message });
    }
  };

  render() {
    return (
      <div
        className="login-background"
        style={{
          minHeight: '100vh',
          background: "url('/remote.jpg') no-repeat center center/cover",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div className="card" style={{ width: '400px', backgroundColor: 'rgba(255, 255, 255, 0.85)' }}>
          <div className="card-body">
            <h2 className="text-center mb-4">Login</h2>
            <form onSubmit={this.handleEmailPasswordLogin}>
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
              <button type="submit" className="btn btn-primary w-100">
                Login
              </button>
            </form>

            <hr className="my-4" />

            <div className="d-grid gap-2">
              {/* Google Login button */}
              <GoogleLogin
                onSuccess={this.handleGoogleSuccess}
                onError={this.handleGoogleError}
              />

              {/* Facebook Login button */}
              {/* <FacebookLogin
                appId={process.env.REACT_APP_FACEBOOK_CLIENT_ID || 'YOUR_FACEBOOK_APP_ID'}
                fields="name,email"
                callback={this.handleFacebookResponse}
                render={(renderProps) => (
                  <button onClick={renderProps.onClick} className="btn btn-outline-primary">
                    Login with Facebook
                  </button>
                )}
              /> */}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default function WithNavigation(props) {
  const navigate = useNavigate();
  return <Login {...props} navigate={navigate} />;
}
