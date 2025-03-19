import React from 'react';
import './Category.css';
import Tile from './Tile';

function Category({ category }) {
  return (
    <div className="category">
      <div className="category-title">{category.title}</div>
      <div className="category-questions">
        {category.questions.map((question, index) => (
          <Tile key={index} question={question} />
        ))}
      </div>
    </div>
  );
}

export default Category;
