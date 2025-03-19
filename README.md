# Jeopardy Grid

A React application that displays a Jeopardy-style grid of categories and questions. Users can click on tiles to reveal questions and answers.

## Features

- Jeopardy-style game board with categories and dollar values
- Interactive tiles that flip to reveal questions and answers
- Ability to load custom questions and categories from a URL

## Running the Application

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`

## Loading Custom Data

The application comes with default Jeopardy categories and questions, but you can load your own custom data by clicking the "Load Custom Questions" button and entering a URL that returns JSON in the correct format.

A sample JSON file is included at `/public/sample-data.json` to demonstrate the expected format.

### Data Format

The JSON data should be an array of category objects, each with a title and an array of questions. Each question should have a value, question text, and answer.

Example:

```json
[
  {
    "title": "CATEGORY NAME",
    "questions": [
      { "value": 200, "question": "Question text", "answer": "Answer text" },
      { "value": 400, "question": "Question text", "answer": "Answer text" },
      { "value": 600, "question": "Question text", "answer": "Answer text" },
      { "value": 800, "question": "Question text", "answer": "Answer text" },
      { "value": 1000, "question": "Question text", "answer": "Answer text" }
    ]
  },
  // More categories...
]
```

## Building for Production

To build the application for production:

```
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Technologies Used

- React
- Vite
- CSS for styling