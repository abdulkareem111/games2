import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
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

// Constants
import { BASE_URL } from './constants';

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

    const newSocket = io("http://localhost:2053");
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
        <Route path="/games" element={<Games currentUser={currentUser} selectGame={selectGame} />} />
        <Route path="/stats" element={<Stats currentUser={currentUser} />} />
        <Route path="/rooms" element={
          <RoomInterface 
            currentUser={currentUser} 
            selectedGame={selectedGame} 
            socket={socket} 
            navigate={navigate}
          />
        } />
        <Route path="/embed" element={<GameEmbed gameUrl={gameEmbedUrl} heading={gameEmbedHeading} />} />
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
