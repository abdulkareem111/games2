import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWrapper from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'animate.css/animate.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './App.css'; // Import the App.css file
import { GoogleOAuthProvider } from '@react-oauth/google';

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <AppWrapper />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
