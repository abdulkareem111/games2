// src/components/Games.js

import React from 'react';
import { apiCall, API_BASE, autoJoinSampleRoom } from '../helpers';

class Games extends React.Component {
  state = {
    games: [],
    error: ''
  };

  componentDidMount() {
    apiCall(`${API_BASE}/games`)
      .then((data) => this.setState({ games: data }))
      .catch((err) =>
        this.setState({ error: 'Error loading games: ' + err.message })
      );
  }

  selectGame = (game) => {
    // Notify parent by selecting the game; navigation happens in App.selectGame.
    this.props.selectGame(game);
  };

  render() {
    return (
      <div
        className="games-background animate__animated animate__fadeIn"
        style={{
          minHeight: '100vh',
          background: "url('remote.jpg') no-repeat center center/cover",
          paddingTop: '70px',
          paddingBottom: '70px'
        }}
      >
        <div className="container-fluid px-4">
          <h2 className="text-white mb-4">Available Games</h2>
          {this.state.error && (
            <div className="alert alert-danger">{this.state.error}</div>
          )}
          <div className="row">
            {this.state.games.map((game) => (
              <div key={game.id} className="col-md-3 col-sm-6 col-12">
                <div className="card shadow-sm mb-4 game-card">
                  <img
                    src={
                      game.image ||
                      'https://via.placeholder.com/400x200?text=Game+Image'
                    }
                    alt={game.name}
                    className="card-img-top"
                  />
                  <div className="card-body">
                    <h5 className="card-title">{game.name}</h5>
                    <p className="card-text">{game.description}</p>
                    <button
                      className="btn btn-custom"
                      onClick={() => this.selectGame(game)}
                    >
                      Join Game
                    </button>
                    <button
                      className="btn btn-secondary ms-2"
                      onClick={() => autoJoinSampleRoom(game)}
                    >
                      Run Demo Game
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default Games;
