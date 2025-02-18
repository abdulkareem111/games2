import React, { useState } from 'react';

function CreateGameModal({ show, onClose }) {
  const [gameName, setGameName] = useState('');
  const [gameDescription, setGameDescription] = useState('');
  const [gameImage, setGameImage] = useState(null); // new: image state
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token'); // new: retrieve token
      const formData = new FormData();
      formData.append('name', gameName);
      formData.append('description', gameDescription);
      if (gameImage) formData.append('image', gameImage); // append image if provided

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/games/add-game`, { // changed line
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}) // new: add token if available
        },
        // Do not set Content-Type; browser sets multipart boundaries automatically
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creating game');
      }
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content" style={{ backgroundColor: '#fff', color: '#000' }}>
          <div className="modal-header" style={{ borderBottom: '1px solid #ddd', position: 'relative' }}>
            <h5 className="modal-title">Create Game</h5>
            <button
              type="button"
              className="close"
              onClick={onClose}
              style={{ 
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                lineHeight: '1',
                color: '#000'
              }}
            >
              &times;
            </button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="gameName" style={{ color: '#000' }}>Name</label>
                <input
                  type="text"
                  className="form-control"
                  id="gameName"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  required
                  style={{ backgroundColor: '#fff', color: '#000', border: '1px solid #ccc' }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="gameDescription" style={{ color: '#000' }}>Description</label>
                <textarea
                  className="form-control"
                  id="gameDescription"
                  value={gameDescription}
                  onChange={(e) => setGameDescription(e.target.value)}
                  required
                  rows="5" // Increased rows for description
                  style={{ backgroundColor: '#fff', color: '#000', border: '1px solid #ccc' }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="gameImage" style={{ color: '#000' }}>Image</label>
                <input
                  type="file"
                  className="form-control"
                  id="gameImage"
                  accept="image/*"
                  onChange={(e) => setGameImage(e.target.files[0])}
                  style={{ border: '1px solid #ccc' }}
                />
              </div>
              {error && <div className="error-message text-danger" style={{ marginTop: '0.5rem' }}>{error}</div>}
              <div className="modal-footer" style={{ borderTop: '1px solid #444' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Close
                </button>
                <button type="submit" className="btn btn-custom">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateGameModal;