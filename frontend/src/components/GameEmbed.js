import React, { useState, useEffect, useRef } from 'react';
import { autoJoinSampleRoom } from '../helpers';

// ⚠️ WARNING: Exposing your API key in frontend code is insecure.
// const OPENAI_API_KEY = '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';
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

function GameEmbed({ gameUrl, heading, gameId }) {
  // Chat state (each message is { role, content })
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Retrieve gameId from props or URL query params
  const effectiveGameId =
    gameId || new URLSearchParams(window.location.search).get('gameId');

  // Rotating loading messages for the overlay
  const loadingMessages = [
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

  // Refs to hold intervals/timeouts
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  // Go Home handler
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
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);

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

  // Call the game update API using a given description (brief prompt)
  const handleUpdateGame = async (description) => {
    setApiResponse(null); // Clear previous response if any
    startLoadingAnimation();

    try {
      const res = await fetch('http://localhost:2053/api/games/update-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: effectiveGameId, description }),
      });
      if (!res.ok) {
        throw new Error('Failed to update game');
      }
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

  // Send a chat message (and possibly trigger a function call)
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    // Add the user's message to the conversation
    const userMessage = { role: 'user', content: chatInput.trim() };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput('');

    // Include a system message to instruct the assistant on when to call a function
    const messagesToSend = [
      {
        role: 'system',
        content:
          'You are a helpful assistant. Only call the function "update_game" if the user is asking to update the game. Otherwise, reply normally.'
      },
      ...updatedMessages
    ];

    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o', // model that supports function calling
            messages: messagesToSend,
            // Define the function that the assistant can call
            functions: [
              {
                name: 'update_game',
                description:
                  'Update the game using a brief prompt for a game update',
                parameters: {
                  type: 'object',
                  properties: {
                    description: {
                      type: 'string',
                      description:
                        'A brief prompt that instructs how to update the game'
                    }
                  },
                  required: ['description']
                }
              }
            ],
            function_call: 'auto' // Let the model decide whether to call a function
          })
        }
      );

      const data = await response.json();
      const message = data.choices[0].message;

      // If the assistant wants to call a function…
      if (message.function_call) {
        const { name, arguments: args } = message.function_call;
        if (name === 'update_game') {
          const parsedArgs = JSON.parse(args);
          const description = parsedArgs.description;
          // Append a note to the conversation
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `Updating game...`
            }
          ]);
          // Call the update game function
          handleUpdateGame(description);
        }
      } else {
        // Otherwise, just append the assistant's reply
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: message.content }
        ]);
      }
    } catch (error) {
      console.error(error);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error: Unable to get response from AI.' }
      ]);
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
          {/* Left Column: Chat Interface */}
          <div className="col-md-3">
            <button className="btn btn-secondary w-100 mb-4" onClick={goHome}>
              Go Home
            </button>

            {/* Chat Conversation */}
            <div className="card mb-4">
              <div
                className="card-body"
                style={{ maxHeight: '300px', overflowY: 'auto' }}
              >
                {chatMessages.length === 0 ? (
                  <p className="text-muted">
                    Start chatting with the AI. Ask questions or mention "update
                    game" when ready.
                  </p>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        textAlign: msg.role === 'user' ? 'right' : 'left',
                        marginBottom: '0.5rem'
                      }}
                    >
                      <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong>{' '}
                      {msg.content}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat}>
              <div className="input-group mb-3">
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

          {/* Right Column: Game Display */}
          <div className="col-md-9">
            <div className="d-flex justify-content-end mb-3">
              <button
                className="btn btn-secondary"
                onClick={() => window.location.reload()}
              >
                Refresh Game
              </button>
            </div>
            <h2 className="mb-4">{heading}</h2>
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
            zIndex: 9999
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
            <p>{loadingMessages[loadingMessageIndex]}</p>
          </div>
        </div>
      )}
    </>
  );
}

export default GameEmbed;
