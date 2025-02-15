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
      <div className="container mt-5 animate__animated animate__fadeIn">
        <h2>Waiting Room</h2>
        <p>Room ID: {this.props.roomId}</p>
        <p>
          {currentPlayers} / {maxPlayers} players have joined.
        </p>
        <p>Status: {status}</p>
        {status === 'active' ? (
          <div className="alert alert-success">Game is starting...</div>
        ) : (
          <p>Waiting for more players...</p>
        )}
        <button className="btn btn-secondary" onClick={this.props.onLeave}>
          Leave Room
        </button>
      </div>
    );
  }
}

export default WaitingRoom;
