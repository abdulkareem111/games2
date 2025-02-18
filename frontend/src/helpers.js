// src/helpers.js

import { BASE_URL } from './constants';

export const API_BASE = `${BASE_URL}/api`;

export async function apiCall(url, options = {}) {
  const token = localStorage.getItem('token');
  options.headers = { 
    ...options.headers, 
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const res = await fetch(url, options);
  if (!res.ok) {
    let error = {};
    try {
      error = await res.json();
    } catch (err) {
      // fallback
    }
    throw new Error(error.error || 'Error');
  }
  return res.json();
}

export async function autoJoinSampleRoom(game) {
  try {
    const token = localStorage.getItem('token');
    const roomName = 'Auto Room for ' + game.name;
    const payload = {
      gameId: game.id,
      roomName,
      maxPlayers: 2,
      buyIn: 1
    };

    const createRes = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    if (!createRes.ok) throw new Error('Failed to create room');
    const roomData = await createRes.json();
    const roomId = roomData.roomId || roomData.id;

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
      throw new Error('No current user found in localStorage');
    }
    await fetch(`${API_BASE}/rooms/join`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ roomId, userId: currentUser.id })
    });

    // Join a random user
    const randomUserRes = await fetch(
      `${API_BASE}/users/random?exclude=${currentUser.id}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    );
    if (!randomUserRes.ok) throw new Error('Failed to fetch random user');
    const randomUser = await randomUserRes.json();

    await fetch(`${API_BASE}/rooms/join`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ roomId, userId: randomUser.id })
    });

    // If your API returns game.htmlFileName, you can use that directly:
    //   const gameFile = game.htmlFileName || ...
    // Otherwise, build it:
    const gameFile =
      game.htmlFileName ||
      game.name
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('') + '.htm';

    // Replace hardcoded URL with env-based URL:
    const directGameUrl = `${BASE_URL}/games/${gameFile}?roomId=${roomId}`;

    // Build the embed route in React
    const embedRoute = `/embed?roomId=${roomId}&gameId=${game.id}` +
      `&userId=${currentUser.id}&userId2=${randomUser.id}` +
      `&gameUrl=${encodeURIComponent(directGameUrl)}` +
      `&heading=${encodeURIComponent(game.name)}` +
      `&flow=demo`; // added flow indicator for demo game

    // Update browser URL and navigate
    window.history.replaceState({}, '', embedRoute);
    window.location.href = embedRoute;

  } catch (err) {
    console.error(err);
    alert('Error joining room: ' + err.message);
  }
}
