import React from 'react';

function Navbar({ currentUser, changePage, signOut }) {
  return (
    <nav className="navbar navbar-expand-lg">
      <a className="navbar-brand" href="#home" onClick={() => changePage('games')}>
        Vnay
      </a>
      {/* Added responsive navbar toggler */}
      <button 
        className="navbar-toggler" 
        type="button" 
        data-bs-toggle="collapse" 
        data-bs-target="#navbarSupportedContent" 
        aria-controls="navbarSupportedContent" 
        aria-expanded="false" 
        aria-label="Toggle navigation"
      >
        <span className="navbar-toggler-icon"></span>
      </button>
      <div className="collapse navbar-collapse" id="navbarSupportedContent">
        <ul className="navbar-nav me-auto">
          {currentUser && (
            <>
              <li className="nav-item">
                <a
                  className="nav-link"
                  href="#games"
                  onClick={() => changePage('games')}
                >
                  Games
                </a>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link"
                  href="#stats"
                  onClick={() => changePage('stats')}
                >
                  Stats
                </a>
              </li>
            </>
          )}
        </ul>
        <span className="navbar-text">
          {currentUser ? (
            <>
              Welcome, {currentUser.username} (<strong>{currentUser.coins} coins</strong>)
              <button className="btn btn-sm btn-custom ms-2" onClick={signOut}>
                Sign Out
              </button>
              <button
                className="btn btn-sm btn-custom ms-2"
                data-bs-toggle="modal"
                data-bs-target="#createGameModal"
              >
                Create Game
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-sm btn-custom me-2"
                onClick={() => changePage('login')}
              >
                Login
              </button>
              <button
                className="btn btn-sm btn-custom"
                onClick={() => changePage('signup')}
              >
                Signup
              </button>
            </>
          )}
        </span>
      </div>
    </nav>
  );
}

export default Navbar;
