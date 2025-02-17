// Navbar.js
import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ currentUser, signOut }) {
  return (
    <nav 
      className="navbar navbar-expand-lg navbar-dark" 
      style={{ 
        background: 'linear-gradient(45deg, #b40101, #2a00ff, #6a00ff)', 
        padding: '0.5rem 1rem' // Reduce padding for a shorter navbar
      }}
    >
      <Link
        className="navbar-brand fw-bold"
        to="/games"
        style={{ letterSpacing: '1px' }}
      >
        Vnay
      </Link>
      <button
        className="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarSupportedContent"
        aria-controls="navbarSupportedContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
        style={{ borderColor: '#fff' }}
      >
        <span className="navbar-toggler-icon" />
      </button>
      <div className="collapse navbar-collapse" id="navbarSupportedContent">
        <ul className="navbar-nav me-auto mb-2 mb-lg-0">
          {currentUser && (
            <>
              <li className="nav-item">
                <Link className="nav-link" to="/games">
                  Games
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/stats">
                  Stats
                </Link>
              </li>
            </>
          )}
        </ul>
        <div className="d-flex align-items-center navbar-text">
          {currentUser ? (
            <>
              <span className="text-white me-3">
                Welcome, {currentUser.username} (<strong>{currentUser.coins} coins</strong>)
              </span>
              <button
                className="btn btn-sm btn-light me-2"
                onClick={signOut}
              >
                Sign Out
              </button>
              <button
                className="btn btn-md btn-custom"
                data-bs-toggle="modal"
                data-bs-target="#createGameModal"
              >
                Create Game
              </button>
            </>
          ) : (
            <>
              <Link
                className="btn btn-sm btn-light me-2"
                to="/login"
              >
                Login
              </Link>
              <Link
                className="btn btn-sm btn-info"
                to="/signup"
              >
                Signup
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
