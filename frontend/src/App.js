// src/App.js
import React from 'react';
import io from 'socket.io-client';

// Components
import Navbar from './components/Navbar';
import Login from './components/Login';
import Signup from './components/Signup';
import Games from './components/Games';
import Stats from './components/Stats';
import RoomInterface from './components/RoomInterface';
import GameEmbed from './components/GameEmbed';

// Constants
import { BASE_URL } from './constants';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentPage: 'login',
      currentUser: null,
      selectedGame: null,
      gameEmbedUrl: '',
      gameEmbedHeading: ''
    };
    // Socket server URL
    this.socket = io("http://localhost:2053");
  }

  componentDidMount() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const userObj = JSON.parse(storedUser);
      this.setState({
        currentUser: userObj,
        currentPage: 'games'
      });
    }
    // Expose app instance globally so we can call it in helpers
    window.appInstance = this;
  }

  goToGameEmbed = (url, heading) => {
    this.setState({
      gameEmbedUrl: url,
      gameEmbedHeading: heading,
      currentPage: 'gameEmbed'
    });
  };

  goHome = () => {
    this.setState({
      currentPage: 'games',
      gameEmbedUrl: '',
      gameEmbedHeading: ''
    });
  };

  changePage = (page) => {
    this.setState({ currentPage: page });
  };

  onLogin = (user) => {
    this.setState({ currentUser: user });
  };

  signOut = () => {
    localStorage.removeItem('currentUser');
    this.setState({
      currentUser: null,
      currentPage: 'login',
      selectedGame: null
    });
  };

  selectGame = (game) => {
    this.setState({ selectedGame: game });
  };

  renderContent() {
    const { currentPage, currentUser, selectedGame, gameEmbedUrl, gameEmbedHeading } = this.state;

    switch (currentPage) {
      case 'login':
        return <Login changePage={this.changePage} onLogin={this.onLogin} />;
      case 'signup':
        return <Signup changePage={this.changePage} />;
      case 'games':
        return (
          <Games
            currentUser={currentUser}
            changePage={this.changePage}
            selectGame={this.selectGame}
          />
        );
      case 'rooms':
        if (!selectedGame) {
          return (
            <div className="container mt-5">
              <p>Error: No game selected. Please go back and select a game.</p>
              <button
                className="btn btn-secondary"
                onClick={() => this.changePage('games')}
              >
                Back to Games
              </button>
            </div>
          );
        }
        return (
          <RoomInterface
            currentUser={currentUser}
            selectedGame={selectedGame}
            changePage={this.changePage}
            socket={this.socket}
          />
        );
      case 'stats':
        return <Stats currentUser={currentUser} />;
      case 'gameEmbed':
        return (
          <GameEmbed
            gameUrl={gameEmbedUrl}
            heading={`Playing: ${gameEmbedHeading}`}
          />
        );
      default:
        return <div>Page not found.</div>;
    }
  }

  render() {
    if (this.state.currentPage === 'gameEmbed') {
      // Full-screen game embed, no navbar
      return (
        <GameEmbed
          gameUrl={this.state.gameEmbedUrl}
          heading={this.state.gameEmbedHeading}
        />
      );
    }

    return (
      <>
        {/* Navbar, only render if not in game embed view */}
        <Navbar
          currentUser={this.state.currentUser}
          changePage={this.changePage}
          signOut={this.signOut}
        />

        {/* Main Content */}
        {this.renderContent()}

        {/* Create Game Modal */}
        <div
          className="modal fade text-dark"
          id="createGameModal"
          tabIndex="-1"
          role="dialog"
          aria-labelledby="createGameModalLabel"
          aria-hidden="true"
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="createGameModalLabel">
                  Create Game
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <form id="createGameForm">
                  <div className="form-group">
                    <label htmlFor="gameName">Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="gameName"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="gameDescription">Description</label>
                    <textarea
                      className="form-control"
                      id="gameDescription"
                      required
                    ></textarea>
                  </div>
                  <div className="error-message" id="createGameError"></div>
                </form>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-bs-dismiss="modal"
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-custom"
                  onClick={this.submitCreateGame}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modify Game Modal */}
        <div
          className="modal fade text-dark"
          id="modifyGameModal"
          tabIndex="-1"
          role="dialog"
          aria-labelledby="modifyGameModalLabel"
          aria-hidden="true"
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="modifyGameModalLabel">
                  Modify Game
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <form id="modifyGameForm">
                  <input type="hidden" id="modifyGameId" />
                  <div className="form-group">
                    <label htmlFor="modifyGameDescription">New Description</label>
                    <textarea
                      className="form-control"
                      id="modifyGameDescription"
                      required
                    ></textarea>
                  </div>
                  <div className="error-message" id="modifyGameError"></div>
                </form>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-bs-dismiss="modal"
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-custom"
                  onClick={this.submitModifyGame}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Same modal logic from your original code:

  async submitCreateGame() {
    document.getElementById('loaderOverlay').style.display = 'flex';

    const name = document.getElementById('gameName').value;
    const description = document.getElementById('gameDescription').value;
    const errorElement = document.getElementById('createGameError');

    try {
      const response = await fetch(`${BASE_URL}/api/games/add-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creating game');
      }
      // Hide modal
      window.$('#createGameModal').modal('hide');
      document.getElementById('createGameForm').reset();
      errorElement.textContent = '';
      // Reload
      window.location.reload();
    } catch (err) {
      errorElement.textContent = err.message;
    } finally {
      document.getElementById('loaderOverlay').style.display = 'none';
    }
  }

  async submitModifyGame() {
    document.getElementById('loaderOverlay').style.display = 'flex';

    const gameId = document.getElementById('modifyGameId').value;
    const description = document.getElementById('modifyGameDescription').value;

    try {
      await fetch(`${BASE_URL}/api/games/update-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, description })
      });
      // We ignore errors for the "modify" call
    } catch (err) {
      // Ignored in original snippet
    }
    window.$('#modifyGameModal').modal('hide');
    document.getElementById('modifyGameForm').reset();
    document.getElementById('loaderOverlay').style.display = 'none';
    window.location.reload();
  }
}

export default App;
