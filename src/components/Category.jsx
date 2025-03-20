import React from 'react';
import './Category.css';
import Tile from './Tile';

function Category({ category, categoryIndex, users, onScoreUpdate, tileStates, onTileStateChange }) {
  return (
    <div className="category">
      <div className="category-title">{category.title}</div>
      <div className="category-questions">
        {category.questions.map((question, questionIndex) => {
          const tileId = `${categoryIndex}-${questionIndex}`;
          const tileState = tileStates?.[tileId] || {
            isFlipped: false,
            isAnswerShown: false,
            isBlank: false
          };
          
          return (
            <Tile 
              key={questionIndex} 
              question={question}
              categoryIndex={categoryIndex}
              questionIndex={questionIndex}
              users={users}
              onScoreUpdate={onScoreUpdate}
              tileState={tileState}
              onTileStateChange={onTileStateChange}
            />
          );
        })}
      </div>
    </div>
  );
}

export default Category;