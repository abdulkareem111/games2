// src/components/GameEmbed.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { autoJoinSampleRoom } from '../helpers';

// WARNING: Exposing your API key in client-side code is insecure
const OPENAI_API_KEY = 'sk-XXXX-REDACTED';
const OPENAI_MODEL = 'gpt-4';

function GameEmbed({ gameUrl: propGameUrl, heading: propHeading, gameId: propGameId }) {
  const navigate = useNavigate();

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Loading
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  // If the parent passes a gameId OR read from URL
  const params = new URLSearchParams(window.location.search);
  const urlGameId = params.get('gameId');
  const effectiveGameId = propGameId || urlGameId;

  // Possibly read heading from param or prop
  const urlHeading = params.get('heading') || '';
  const effectiveHeading = propHeading || urlHeading;

  // Our gameUrl might come from a prop or from the query param
  const urlGameUrl = params.get('gameUrl');
  const effectiveGameUrl = propGameUrl || urlGameUrl || '';

  // Some random loading messages
  const loadingMessages = [
    'Initializing update process...',
    'Verifying game files...',
    'Compiling assets...',
    'Game update complete. Enjoy!'
  ];

  function goHome() {
    navigate('/');
  }

  function startLoadingAnimation() {
    setIsLoading(true);
    setProgress(0);
    setLoadingMessageIndex(0);

    let currentProgress = 0;
    intervalRef.current = setInterval(() => {
      currentProgress += 2; // increment faster if you like
      setProgress(currentProgress);
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);

      if (currentProgress >= 100) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 1500);

    timeoutRef.current = setTimeout(() => {
      stopLoadingAnimation(true);
    }, 180000);
  }

  async function stopLoadingAnimation(shouldJoinRoom = false) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setProgress(100);
    setIsLoading(false);

    if (shouldJoinRoom) {
      try {
        // autoJoin will push a new route to /embed?...
        await autoJoinSampleRoom({ id: effectiveGameId, name: effectiveHeading });
      } catch (error) {
        console.error('autoJoinSampleRoom failed:', error);
      }
    }
  }

  async function handleUpdateGame(description) {
    startLoadingAnimation();
    try {
      const res = await fetch('http://localhost:2053/api/games/update-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: effectiveGameId, description })
      });
      if (!res.ok) {
        throw new Error('Failed to update game');
      }
      stopLoadingAnimation(true);
    } catch (err) {
      console.error(err);
      alert('Error updating game: ' + err.message);
      stopLoadingAnimation(false);
    }
  }

  async function handleSendChat(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user', content: chatInput.trim() };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput('');

    const messagesToSend = [
      {
        role: 'system',
        content:
          'You are a helpful assistant. Only call "update_game" if the user explicitly wants to update the game.'
      },
      ...updatedMessages
    ];

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: messagesToSend,
          functions: [
            {
              name: 'update_game',
              description: 'Update the game with a short prompt',
              parameters: {
                type: 'object',
                properties: {
                  description: {
                    type: 'string',
                    description: 'Game update instructions'
                  }
                },
                required: ['description']
              }
            }
          ],
          function_call: 'auto'
        })
      });

      const data = await response.json();
      const message = data.choices?.[0]?.message;

      if (!message) {
        throw new Error('No message from OpenAI');
      }

      if (message.function_call) {
        const { name, arguments: args } = message.function_call;
        if (name === 'update_game') {
          const parsed = JSON.parse(args);
          const description = parsed.description;
          setChatMessages((prev) => [
            ...prev,
            { role: 'assistant', content: 'Updating game...' }
          ]);
          handleUpdateGame(description);
        }
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: message.content }
        ]);
      }
    } catch (error) {
      console.error(error);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error: Unable to get AI response.' }
      ]);
    }
  }

  // Cleanup intervals
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Prevent body scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Read user IDs from query
  const roomId = params.get('roomId') || '';
  const user1 = params.get('userId') || '1';
  const user2 = params.get('userId2') || '2';

  // The directGameUrl might already have "?roomId=..."
  // We'll just append &player=1&userId=.. or &player=2&userId=..
  const iframeUrl1 = effectiveGameUrl
    ? `${effectiveGameUrl}&player=1&userId=${user1}`
    : '';
  const iframeUrl2 = effectiveGameUrl
    ? `${effectiveGameUrl}&player=2&userId=${user2}`
    : '';

  return (
    <>
      {/* LEFT SIDEBAR (CHAT) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '300px',
          height: '100vh',
          background: '#f8f9fa',
          borderRight: '1px solid #dee2e6',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1100
        }}
      >
        <div style={{ padding: '15px', borderBottom: '1px solid #dee2e6' }}>
          <button className="btn btn-secondary mb-3 w-100" onClick={goHome}>
            &larr; Go Home
          </button>
          <h5 className="mb-0">Chat with AI</h5>
        </div>

        <div
          style={{
            flexGrow: 1,
            padding: '15px',
            overflowY: 'auto',
            background: '#fff'
          }}
        >
          {chatMessages.length === 0 ? (
            <p className="text-muted">
              Start chatting with the AI. Type "update game" if you want to see how it responds.
            </p>
          ) : (
            chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className="mb-2"
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  className="p-2 rounded"
                  style={{
                    backgroundColor: msg.role === 'user' ? '#d1ecf1' : '#fff3cd',
                    color: msg.role === 'user' ? '#0c5460' : '#856404',
                    maxWidth: '80%'
                  }}
                >
                  <small>
                    <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong>
                  </small>
                  <div>{msg.content}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '15px', borderTop: '1px solid #dee2e6' }}>
          <form onSubmit={handleSendChat}>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Type your message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button className="btn btn-primary" type="submit">
                Send
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT SIDE (2 IFRAMES) */}
      <div style={{ marginLeft: '300px' }}>
        <div className="row no-gutters">
          <div className="col-md-6">
            {iframeUrl1 ? (
              <iframe
                src={iframeUrl1}
                title={`${effectiveHeading} - Player 1`}
                style={{ width: '100%', height: '100vh', border: 'none' }}
              />
            ) : (
              <div style={{ color: '#fff', padding: '10px' }}>
                No valid gameUrl found.
              </div>
            )}
          </div>
          <div className="col-md-6">
            {iframeUrl2 ? (
              <iframe
                src={iframeUrl2}
                title={`${effectiveHeading} - Player 2`}
                style={{ width: '100%', height: '100vh', border: 'none' }}
              />
            ) : (
              <div style={{ color: '#fff', padding: '10px' }}>
                No valid gameUrl found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LOADING OVERLAY */}
      {isLoading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#fff',
            zIndex: 1200,
            padding: '20px'
          }}
        >
          <div className="bg-dark p-4 rounded text-center" style={{ minWidth: '300px' }}>
            <h4 className="mb-3">Updating Game</h4>
            <div className="progress mb-3" style={{ height: '25px' }}>
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
            <p className="mb-3">{loadingMessages[loadingMessageIndex]}</p>
          </div>
        </div>
      )}
    </>
  );
}

export default GameEmbed;
