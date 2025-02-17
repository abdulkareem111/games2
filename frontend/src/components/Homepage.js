// Homepage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './homepage.css';

function Homepage() {
  const navigate = useNavigate();
  return (
    <div className="homepage-hero">
      <div className="hero-content animate__animated animate__fadeIn">
        <h1>Welcome to Vnay Gaming</h1>
        <p>Discover amazing games and join epic battles.</p>
        <button
          className="btn btn-custom mt-3 animate__animated animate__pulse animate__infinite"
          onClick={() => navigate('/games')}
        >
          Explore Games
        </button>
      </div>
    </div>
  );
}

export default Homepage;
