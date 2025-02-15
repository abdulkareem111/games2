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
    // Update the browser URL to include ?gameId=XYZ
    window.history.pushState({}, '', `?gameId=${game.id}`);

    // Then continue your existing flow
    this.props.selectGame(game);
    this.props.changePage('rooms');
  };

  render() {
    return (
      <div className="container mt-5 animate__animated animate__fadeIn">
        <h2>Available Games</h2>
        {this.state.error && (
          <div className="error-message">{this.state.error}</div>
        )}
        <div className="row">
          {this.state.games.map((game) => (
            <div key={game.id} className="col-md-4">
              <div className="card shadow-sm mb-3">
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
                    className="btn btn-custom ms-2"
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
    );
  }
}

export default Games;
