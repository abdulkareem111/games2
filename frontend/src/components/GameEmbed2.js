import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function GameEmbed2({ gameUrl: propGameUrl, heading: propHeading }) {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  let effectiveGameUrl = propGameUrl || params.get('gameUrl') || '';
  const effectiveHeading = propHeading || params.get('heading') || '';

  if (params.get('flow') === 'join') { // only update URL for join flow
    let userId = params.get('userId');
    if (!userId) {
      // fallback: take from localStorage currentUser
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        userId = currentUser && currentUser.id;
      } catch (e) {
        // ignore parse errors
      }
    }
    if (userId) {
      effectiveGameUrl += (effectiveGameUrl.includes('?') ? '&' : '?') + 'userId=' + userId;
    }
  }
  
  // Set page as non-scrollable when component mounts
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Go Home Button */}
      <button 
        style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}
        onClick={() => navigate('/games')}
      >
        Go Home
      </button>
      <iframe 
        src={effectiveGameUrl} 
        title={effectiveHeading || 'Game'} 
        style={{ width: '100%', height: '100%', border: 'none' }} 
      />
    </div>
  );
}

export default GameEmbed2;