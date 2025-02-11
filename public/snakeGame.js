const canvas = document.getElementById('snakeCanvas');
const ctx = canvas.getContext('2d');
let socket;
let currentUser;
let currentRoom;

// Local representation of the game state: multiple snakes, or single snake
// For demonstration, we'll store a single snake for each player.
// Example gameState:
// {
//   snakes: {
//     playerId: {
//       segments: [{ x, y }, ...],
//       direction: 'up'/'down'/'left'/'right'
//     }
//   },
//   food: { x, y },
//   roundNumber: 1
// }

let gameState = {
  snakes: {},
  food: { x: 0, y: 0 },
  roundNumber: 1
};

// 1) Get/Set current user from localStorage
currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
if (!currentUser || !currentUser.id) {
  const id = prompt('Enter your player id:');
  currentUser = { id };
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

// 2) Get roomId from URL
const params = new URLSearchParams(window.location.search);
currentRoom = params.get('roomId');
document.getElementById('roomIdLabel').textContent = currentRoom || 'N/A';

// Init socket using BASE_URL from constants.js
socket = io(BASE_URL);

socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
  // Join the room
  if (currentRoom) {
    socket.emit('joinRoomSocket', {
      roomId: currentRoom,
      playerId: currentUser.id
    });
  }
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});

socket.on('error', (err) => {
  console.error('Socket error:', err);
});

// newRound
socket.on('newRound', (data) => {
  console.log('Received newRound:', data);
  document.getElementById('roundNumber').textContent = data.roundNumber || 1;
  showMessage('Round ' + (data.roundNumber || 1) + ' started!', 'success');
});

// gameStateUpdate
socket.on('gameStateUpdate', (data) => {
  // data = { state, scores }
  if (data.state) {
    gameState = data.state;
  }
  updateScoreboard(data.scores);
  renderSnake();
});

// roundEnded
socket.on('roundEnded', (data) => {
  console.log('Received roundEnded:', data);
  showMessage('Round ended! Reason: ' + data.reason, 'error');
  updateScoreboard(data.scores);
});

// gameEnded
socket.on('gameEnded', (data) => {
  console.log('Received gameEnded:', data);

  // Build final results
  let html = '<p><strong>Reason:</strong> ' + data.reason + '</p>';
  if (data.standings && data.standings.length) {
    const winner = data.standings[0];
    html += '<p><strong>Winner:</strong> ' + (winner.playerData.username || winner.playerId) +
            ' (Score: ' + winner.score + ')</p>';
    if (data.standings.length > 1) {
      html += '<h5>Other Standings:</h5>';
      data.standings.slice(1).forEach((player) => {
        html += '<p>Player ' + player.playerId + ': ' + player.score + ' pts</p>';
      });
    }
  }
  document.getElementById('endGameDetails').innerHTML = html;

  // Show end game modal
  const endGameModal = new bootstrap.Modal(document.getElementById('endGameModal'));
  endGameModal.show();

  // Trigger finishRoom API if we have winners
  if (data.standings && data.standings.length) {
    const winner = data.standings[0];
    fetch('/api/rooms/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: currentRoom, winners: [winner.playerId] })
    })
    .then(response => response.json())
    .then(result => console.log('Finished room:', result))
    .catch(err => console.error('Finish room failed:', err));
  }
});

// gameStarting - show countdown timer
socket.on('gameStarting', (data) => {
  console.log('Received gameStarting event with countdown:', data.countdown);
  const timerEl = document.getElementById('countdownTimer');
  timerEl.style.display = 'flex';
  timerEl.textContent = data.countdown;
  const countdownInterval = setInterval(() => {
    let current = parseInt(timerEl.textContent, 10);
    if (current > 1) {
      timerEl.textContent = current - 1;
    } else {
      clearInterval(countdownInterval);
      timerEl.style.display = 'none';
    }
  }, 1000);
});

// Buttons
document.getElementById('moveUpBtn').addEventListener('click', () => emitMove('up'));
document.getElementById('moveDownBtn').addEventListener('click', () => emitMove('down'));
document.getElementById('moveLeftBtn').addEventListener('click', () => emitMove('left'));
document.getElementById('moveRightBtn').addEventListener('click', () => emitMove('right'));
document.getElementById('stopBtn').addEventListener('click', () => emitMove('stop'));

// Keyboard events
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    emitMove('up');
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    emitMove('down');
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    emitMove('left');
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    emitMove('right');
  }
});
document.addEventListener('keyup', (e) => {
  if (
    e.key === 'ArrowUp' ||
    e.key === 'ArrowDown' ||
    e.key === 'ArrowLeft' ||
    e.key === 'ArrowRight'
  ) {
    e.preventDefault();
    emitMove('stop');
  }
});

// Go Home button
document.getElementById('goHomeButton').addEventListener('click', () => {
  window.location.href = '/';
});

function emitMove(direction) {
  if (currentRoom && currentUser) {
    socket.emit('gameAction', {
      roomId: currentRoom,
      playerId: currentUser.id,
      action: {
        type: 'move',
        direction
      }
    });
  }
}

function showMessage(text, type) {
  const msg = document.getElementById('message');
  msg.textContent = text;
  msg.className = 'message ' + type;
  msg.style.display = 'block';
  setTimeout(() => {
    msg.style.display = 'none';
  }, 3000);
}

function updateScoreboard(scores) {
  const scoresList = document.getElementById('scoresList');
  if (!scores || Object.keys(scores).length === 0) {
    scoresList.innerHTML = '<p>No scores yet</p>';
    return;
  }
  let html = '';
  for (const [playerId, score] of Object.entries(scores)) {
    html += '<p>Player <strong>' + playerId + '</strong>: ' + score + ' pts</p>';
  }
  scoresList.innerHTML = html;
}

function renderSnake() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw food
  ctx.fillStyle = 'red';
  ctx.fillRect(gameState.food.x, gameState.food.y, 10, 10);

  // Draw each player's snake
  for (const snakeKey of Object.keys(gameState.snakes)) {
    const snake = gameState.snakes[snakeKey];
    ctx.fillStyle = snakeKey === currentUser.id ? 'lime' : 'blue';
    snake.segments.forEach(segment => {
      ctx.fillRect(segment.x, segment.y, 10, 10);
    });
  }
}
