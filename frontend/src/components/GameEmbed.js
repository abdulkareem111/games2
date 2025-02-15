import React, { useState, useEffect, useRef } from 'react';
import { autoJoinSampleRoom } from '../helpers';

function GameEmbed({ gameUrl, heading, gameId }) {
  const [prompt, setPrompt] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Retrieve gameId from URL query params if not provided
  const effectiveGameId =
    gameId || new URLSearchParams(window.location.search).get('gameId');

  // Rotating loading messages
  const messages = [
    'Initializing update process...',
    'Checking system requirements...',
    'Verifying game files...',
    'Applying security patches...',
    'Downloading update files...',
    'Extracting update package...',
    'Allocating memory...',
    'Compiling shaders...',
    'Loading assets...',
    'Generating textures...',
    'Generating terrain...',
    'Rendering world...',
    'Creating game engine...',
    'Optimizing performance...',
    'Testing physics engine...',
    'Refining collision detection...',
    'Generating NPC behavior...',
    'Balancing game mechanics...',
    'Configuring in-game economy...',
    'Encrypting save files...',
    'Synchronizing cloud saves...',
    'Configuring input controls...',
    'Testing controller support...',
    'Calibrating audio system...',
    'Compressing audio files...',
    'Finalizing voice-over implementation...',
    'Building user interface...',
    'Polishing UI animations...',
    'Creating character models...',
    'Testing animations...',
    'Applying special effects...',
    'Loading particle effects...',
    'Implementing lighting effects...',
    'Rendering shadows...',
    'Configuring camera angles...',
    'Assembling level design...',
    'Analyzing performance metrics...',
    'Adjusting frame rate settings...',
    'Applying optimization tweaks...',
    'Debugging scripting errors...',
    'Finalizing game balance...',
    'Encrypting network traffic...',
    'Establishing network connection...',
    'Preparing multiplayer lobby...',
    'Synchronizing data...',
    'Testing online features...',
    'Configuring localization settings...',
    'Compiling localization files...',
    'Preloading essential assets...',
    'Applying final touches...',
    'Initiating launch sequence...',
    'Game update complete. Enjoy!'
];


  // We'll store intervals/timeouts in refs so we can clear them if needed
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  // Go Home function
  const goHome = () => {
    if (window.appInstance) {
      window.appInstance.goHome();
    }
  };

  // Start the loading animation
  const startLoadingAnimation = () => {
    setIsLoading(true);
    setProgress(0);
    setLoadingMessageIndex(0);

    let currentProgress = 0;
    intervalRef.current = setInterval(() => {
      currentProgress += 1;
      setProgress(currentProgress);

      // Rotate through messages
      setLoadingMessageIndex((prev) => (prev + 1) % messages.length);

      if (currentProgress >= 100) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 1800);

    // Fallback after 3 minutes
    timeoutRef.current = setTimeout(() => {
      stopLoadingAnimation(true);
    }, 180000);
  };

  // Stop the loading animation
  const stopLoadingAnimation = async (shouldJoinRoom = false) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setProgress(100);
    setIsLoading(false);

    if (shouldJoinRoom) {
      try {
        await autoJoinSampleRoom({ id: effectiveGameId, name: heading });
      } catch (error) {
        console.error('autoJoinSampleRoom failed:', error);
      }
    }
  };

  // Handle Update Game
  const handleUpdateGame = async () => {
    setApiResponse(null); // Clear previous response if any
    startLoadingAnimation();

    try {
      const res = await fetch('http://localhost:2053/api/games/update-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: effectiveGameId, description: prompt }),
      });
      if (!res.ok) {
        throw new Error('Failed to update game');
      }

      // Parse server response (assuming JSON)
      const data = await res.json();
      if (data && data.response) {
        setApiResponse(data.response);
      }

      // Stop loader early and join room
      stopLoadingAnimation(true);
    } catch (err) {
      console.error(err);
      alert('Error updating game: ' + err.message);
      stopLoadingAnimation(false);
    }
  };

  // Cleanup intervals/timeouts on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Prevent scrolling while overlay is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <>
      <div className="container-fluid m-5">
        <div className="row">
          {/* Left Column */}
          <div className="col-md-3">
            {/* Go Home Button */}
            <button className="btn btn-secondary w-100 mb-4" onClick={goHome}>
              Go Home
            </button>

            {/* Response Card (always present, but conditionally filled) */}
            <div className="card mb-4" style={{ minHeight: '200px' }}>
              <div className="card-body">
                <h5 className="card-title">Prompt Response</h5>
                {apiResponse ? (
                  <p className="card-text">{apiResponse}</p>
                ) : (
                  <p className="card-text text-muted">
                    The response will appear here once the update is complete.
                  </p>
                )}
              </div>
            </div>

            {/* Prompt Card */}
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Your Prompt</h5>
                <textarea
                  className="form-control"
                  placeholder="Write your prompt here..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                />
                <button
                  className="btn btn-primary mt-3 w-100"
                  onClick={handleUpdateGame}
                >
                  Update Game
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-md-9">
            {/* Refresh Button */}
            <div className="d-flex justify-content-end mb-3">
              <button
                className="btn btn-secondary"
                onClick={() => window.location.reload()}
              >
                Refresh Game
              </button>
            </div>

            {/* Heading */}
            <h2 className="mb-4">{heading}</h2>

            {/* Iframe */}
            <iframe
              src={gameUrl}
              title={heading}
              style={{ width: '100%', height: '70vh', border: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#fff',
            zIndex: 9999,
          }}
        >
          <div className="bg-dark p-4 rounded">
            <h4 className="mb-3">Updating Game</h4>
            <div
              className="progress"
              style={{ width: '300px', marginBottom: '1rem' }}
            >
              <div
                className="progress-bar progress-bar-striped progress-bar-animated"
                role="progressbar"
                style={{ width: `${progress}%` }}
                aria-valuenow={progress}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                {progress}%
              </div>
            </div>
            <p>{messages[loadingMessageIndex]}</p>
          </div>
        </div>
      )}
    </>
  );
}

export default GameEmbed;
