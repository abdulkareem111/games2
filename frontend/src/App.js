import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import io from 'socket.io-client';

// Components
import Navbar from './components/Navbar';
import Homepage from './components/Homepage';
import Login from './components/Login';
import Signup from './components/Signup';
import Games from './components/Games';
import Stats from './components/Stats';
import RoomInterface from './components/RoomInterface';
import GameEmbed from './components/GameEmbed';
import GameEmbed2 from './components/GameEmbed2'; // new import

// Constants
import { BASE_URL } from './constants';

function ProtectedRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
}

function EmbedWrapper({ gameUrl, heading }) {
  const params = new URLSearchParams(window.location.search);
  const flow = params.get('flow');
  return flow === 'join'
    ? <GameEmbed2 gameUrl={gameUrl} heading={heading} />
    : <GameEmbed gameUrl={gameUrl} heading={heading} />;
}

function App() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameEmbedUrl, setGameEmbedUrl] = useState('');
  const [gameEmbedHeading, setGameEmbedHeading] = useState('');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) setCurrentUser(JSON.parse(storedUser));

    const token = localStorage.getItem('token');
    const socketUrl = process.env.REACT_APP_SOCKET_URL;
    const newSocket = io(socketUrl, {
      auth: { token }
    });
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  const onLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    navigate('/games');
  };

  const signOut = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    setCurrentUser(null);
    setSelectedGame(null);
    navigate('/');
  };

  const selectGame = (game) => {
    setSelectedGame(game);
    navigate('/rooms');
  };

  const goToGameEmbed = (url, heading) => {
    setGameEmbedUrl(url);
    setGameEmbedHeading(heading);
    navigate('/embed');
  };

  return (
    <>
      <Navbar currentUser={currentUser} signOut={signOut} />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<Login onLogin={onLogin} />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/games" element={<ProtectedRoute><Games currentUser={currentUser} selectGame={selectGame} /></ProtectedRoute>} />
        <Route path="/stats" element={<ProtectedRoute><Stats currentUser={currentUser} /></ProtectedRoute>} />
        <Route path="/rooms" element={<ProtectedRoute>
            <RoomInterface 
              currentUser={currentUser} 
              selectedGame={selectedGame} 
              socket={socket} 
              navigate={navigate}
            />
          </ProtectedRoute>} />
        <Route path="/embed" element={<ProtectedRoute><EmbedWrapper gameUrl={gameEmbedUrl} heading={gameEmbedHeading} /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

export default function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
