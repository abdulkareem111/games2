import React from 'react';

function GameEmbed({ gameUrl, heading }) {
  return (
    <div className="container mt-5">
      <button 
        className="btn btn-secondary mb-3" 
        onClick={() => window.appInstance && window.appInstance.goHome()}>
        Go Home
      </button>
      <h2>{heading}</h2>
      <iframe
        src={gameUrl}
        title={heading}
        style={{ width: '100%', height: '80vh', border: 'none' }}
      ></iframe>
    </div>
  );
}

export default GameEmbed;