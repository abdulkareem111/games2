// WaitingRoom.js
import React from 'react';

class WaitingRoom extends React.Component {
  state = {
    currentPlayers: 0,
    maxPlayers: 0,
    status: 'waiting'
  };

  componentDidMount() {
    const { roomId, currentUser, socket } = this.props;
    socket.emit('joinRoomSocket', { roomId, userId: currentUser.id });

    socket.on('roomUpdate', (data) => {
      this.setState({
        currentPlayers: data.currentPlayers,
        maxPlayers: data.maxPlayers,
        status: data.status
      });
    });

    socket.on('gameStart', (data) => {
      if (data.roomId === roomId && this.props.onGameStart) {
        this.props.onGameStart();
      }
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.status !== this.state.status && this.state.status === 'active') {
      if (this.props.onGameStart) {
        this.props.onGameStart();
      }
    }
  }

  componentWillUnmount() {
    const { socket } = this.props;
    socket.off('roomUpdate');
    socket.off('gameStart');
  }

  render() {
    const { currentPlayers, maxPlayers, status } = this.state;
    return (
      <div
        className="waiting-room-container animate__animated animate__fadeIn"
        style={{
          minHeight: '100vh',
          background: "url('remote.jpg') no-repeat center center/cover", // updated background
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <div className="card p-4" style={{ width: '400px', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
          <h2 className="text-center mb-3">Waiting Room</h2>
          <p className="lead text-center">
            Players: {currentPlayers} / {maxPlayers}
          </p>
          <p className="text-center">
            Status: <strong>{status}</strong>
          </p>
          {status === 'active' ? (
            <div className="alert alert-success text-center">Game is starting...</div>
          ) : (
            <p className="text-center">Waiting for more players...</p>
          )}
          <button className="btn btn-secondary w-100" onClick={this.props.onLeave}>
            Leave Room
          </button>
        </div>
      </div>
    );
  }
}

export default WaitingRoom;
