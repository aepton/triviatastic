import React from 'react';
import './Scoreboard.css';

function Scoreboard({ users }) {
  // Sort users by score in descending order
  const sortedUsers = [...users].sort((a, b) => b.score - a.score);

  return (
    <div className="scoreboard">
      <h3>Scoreboard</h3>
      <div className="scores-container">
        {sortedUsers.map(user => (
          <div 
            key={user.name} 
            className={`score-item ${user.score < 0 ? 'negative' : ''}`}
          >
            <span className="user-name">{user.name}</span>
            <span className="user-score">${user.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Scoreboard;