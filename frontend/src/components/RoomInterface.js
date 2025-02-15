import React from 'react';
import WaitingRoom from './WaitingRoom';
import GameEmbed from './GameEmbed'; // <--- NEW import
import { apiCall, API_BASE } from '../helpers';

class RoomInterface extends React.Component {
  state = {
    rooms: [],
    error: '',
    roomName: '',
    maxPlayers: this.props.selectedGame ? this.props.selectedGame.max_players : 4,
    waitTime: '',
    buyIn: 1,
    createMessage: '',
    isWaiting: false,
    joinedRoomId: null,
    // NEW: We'll store the final gameUrl to show <GameEmbed>.
    gameUrl: ''
  };

  componentDidMount() {
    this.fetchRooms();
    this.refreshInterval = setInterval(this.fetchRooms, 5000);
  }

  componentWillUnmount() {
    clearInterval(this.refreshInterval);
  }

  fetchRooms = () => {
    const gameId = this.props.selectedGame.id;
    apiCall(`${API_BASE}/rooms?gameId=${gameId}`)
      .then((data) => this.setState({ rooms: data, error: '' }))
      .catch((err) => this.setState({ error: 'Error loading rooms: ' + err.message }));
  };

  handleCreateRoom = async (e) => {
    e.preventDefault();
    const { roomName, maxPlayers, waitTime, buyIn } = this.state;
    const payload = {
      gameId: this.props.selectedGame.id,
      roomName: roomName || null,
      maxPlayers: parseInt(maxPlayers, 10),
      buyIn: parseInt(buyIn, 10),
      ...(waitTime && { waitTime: parseInt(waitTime, 10) })
    };
    try {
      await apiCall(`${API_BASE}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.setState({
        createMessage: 'Room created successfully',
        roomName: '',
        maxPlayers: this.props.selectedGame.max_players,
        waitTime: '',
        buyIn: 1
      });
      this.fetchRooms();
    } catch (err) {
      this.setState({ createMessage: 'Error: ' + err.message });
    }
  };

  joinRoom = async (roomId) => {
    try {
      await apiCall(`${API_BASE}/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userId: this.props.currentUser.id
        })
      });
      this.setState({
        isWaiting: true,
        joinedRoomId: roomId
      });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  handleLeaveWaiting = () => {
    this.setState({ isWaiting: false, joinedRoomId: null });
    this.fetchRooms();
  };

  // UPDATED: Build the gameUrl, and set state so we render <GameEmbed>.
  handleGameStart = () => {
    const gameName = this.props.selectedGame.name;
    const gameFile =
      gameName
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('') + '.htm';

    // Example: If your backend runs on 198.199.83.48:2053
    const embedUrl = `http://localhost:2053/games/${gameFile}?roomId=${this.state.joinedRoomId}`;

    // We hide the waiting room and show <GameEmbed> instead.
    this.setState({
      isWaiting: false,
      gameUrl: embedUrl
    });
  };

  render() {
    // 1) If we have a gameUrl, show <GameEmbed> instead of the lobby/rooms.
    if (this.state.gameUrl) {
      return (
        <GameEmbed
          gameUrl={this.state.gameUrl}
          heading={`Playing: ${this.props.selectedGame.name}`}
        />
      );
    }

    // 2) If we're waiting for the second player (or game to start), show <WaitingRoom>.
    if (this.state.isWaiting && this.state.joinedRoomId) {
      return (
        <WaitingRoom
          roomId={this.state.joinedRoomId}
          gameId={this.props.selectedGame.id}
          currentUser={this.props.currentUser}
          socket={this.props.socket}
          onLeave={this.handleLeaveWaiting}
          onGameStart={this.handleGameStart}
        />
      );
    }

    // 3) Otherwise, render the normal lobby UI with "Create Room" and "Available Rooms."
    return (
      <div className="container mt-5 animate__animated animate__fadeIn">
        <h2>Room Lobby for: {this.props.selectedGame.name}</h2>
        <button
          className="btn btn-secondary mb-3"
          onClick={() => this.props.changePage('games')}
        >
          Back to Games
        </button>

        <div className="card mb-4">
          <div className="card-body">
            <h4>Create New Room</h4>
            <form onSubmit={this.handleCreateRoom}>
              <div className="form-group">
                <label>Room Name (optional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={this.state.roomName}
                  onChange={(e) => this.setState({ roomName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Max Players</label>
                <input
                  type="number"
                  className="form-control"
                  required
                  value={this.state.maxPlayers}
                  onChange={(e) => this.setState({ maxPlayers: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Wait Time (seconds, optional)</label>
                <input
                  type="number"
                  className="form-control"
                  value={this.state.waitTime}
                  onChange={(e) => this.setState({ waitTime: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Buy In</label>
                <input
                  type="number"
                  className="form-control"
                  required
                  value={this.state.buyIn}
                  onChange={(e) => this.setState({ buyIn: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-custom">
                Create Room
              </button>
              {this.state.createMessage && (
                <p className="mt-2">
                  <small>{this.state.createMessage}</small>
                </p>
              )}
            </form>
          </div>
        </div>

        <div className="mb-3">
          <h4>Available Rooms</h4>
          <button
            className="btn btn-secondary btn-sm mb-2"
            onClick={this.fetchRooms}
          >
            Refresh Rooms
          </button>

          {this.state.error && (
            <div className="error-message">{this.state.error}</div>
          )}

          {this.state.rooms.length > 0 ? (
            <table className="table table-bordered bg-dark">
              <thead className="thead-dark">
                <tr>
                  <th>Room ID</th>
                  <th>Room Name</th>
                  <th>Players</th>
                  <th>Max Players</th>
                  <th>Buy In</th>
                  <th>Status</th>
                  <th>Prize Pool</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {this.state.rooms.map((room) => (
                  <tr key={room.id}>
                    <td>{room.id}</td>
                    <td>{room.room_name || 'N/A'}</td>
                    <td>{room.current_players}</td>
                    <td>{room.max_players}</td>
                    <td>{room.buy_in}</td>
                    <td>{room.status}</td>
                    <td>{room.prize_pool}</td>
                    <td>
                      <button
                        className="btn btn-custom btn-sm me-2"
                        onClick={() => this.joinRoom(room.id)}
                      >
                        Join
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No rooms available. Create one!</p>
          )}
        </div>
      </div>
    );
  }
}

export default RoomInterface;
