// src/helpers.js
import { BASE_URL } from './constants';

export const API_BASE = `${BASE_URL}/api`;

// Generic helper for API calls:
export async function apiCall(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let error = {};
    try {
      error = await res.json();
    } catch (err) {
      // fallback
    }
    throw new Error(error.error || "Error");
  }
  return res.json();
}

// Example function that auto-creates a room and joins with a random user
export async function autoJoinSampleRoom(game) {
  document.getElementById('loaderOverlay').style.display = 'flex';
  try {
    // Create a room
    const roomName = "Auto Room for " + game.name;
    const payload = {
      gameId: game.id,
      roomName,
      maxPlayers: 2,
      buyIn: 1
    };
    const createRes = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!createRes.ok) throw new Error('Failed to create room');
    const roomData = await createRes.json();
    const roomId = roomData.roomId || roomData.id;

    // Join current user
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    await fetch(`${API_BASE}/rooms/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, userId: currentUser.id })
    });

    // Join random user
    const randomUserRes = await fetch(
      `${API_BASE}/users/random?exclude=${currentUser.id}`
    );
    if (!randomUserRes.ok) throw new Error('Failed to fetch random user');
    const randomUser = await randomUserRes.json();

    await fetch(`${API_BASE}/rooms/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, userId: randomUser.id })
    });

    // After successful join, modify the REAL browser URL so it displays
    // "?roomId=123&gameId=XYZ". Using 'replaceState' means we don't add a new
    // entry in the browser history.
    window.history.replaceState(
      {},
      '',
      `?roomId=${roomId}&gameId=${game.id}`
    );

    // Navigate to the embed view
    // (Feel free to also append these params to the embedUrl if needed.)
    const gameFile =
      game.name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('') + '.htm';
    const embedUrl = `http://localhost:2053/games/${gameFile}?roomId=${roomId}`;

    if (window.appInstance) {
      window.appInstance.goToGameEmbed(embedUrl, game.name);
    } else {
      window.location.href = embedUrl;
    }
  } catch (err) {
    console.error(err);
    alert("Error joining room: " + err.message);
  } finally {
    document.getElementById('loaderOverlay').style.display = 'none';
  }
}
