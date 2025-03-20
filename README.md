# Jeopardy Grid

A React application that displays a Jeopardy-style grid of categories and questions. Users can click on tiles to reveal questions and answers.

## Features

- Jeopardy-style game board with categories and dollar values
- Interactive tiles that flip to reveal questions and answers
- Ability to load custom questions and categories from a URL
- J-Archive crawler to extract and store game data locally

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

## J-Archive Crawler

The repository includes a crawler script that can extract game data from J-Archive and store it locally as JSON files. This allows you to have a local cache of Jeopardy games to use with the application.

### Prerequisites

Before running the crawler, install the required dependencies:

```
npm install
```

### Crawling Games

The crawler provides several options for extracting data:

#### Crawl a single game

```
npm run crawl:game <gameId>
```

Example:
```
npm run crawl:game 7815
```

#### Crawl a range of games

```
npm run crawl:range <startId> <endId>
```

Example:
```
npm run crawl:range 7800 7850
```

#### Crawl all games from a specific season

```
npm run crawl:season <seasonId>
```

Example:
```
npm run crawl:season 38
```

#### Crawl multiple seasons

```
npm run crawl:seasons <startSeason> <endSeason>
```

Example:
```
npm run crawl:seasons 35 38
```

### Generating a Game Index

After crawling games, you can generate an index file that makes it easier to navigate the available games:

```
npm run generate-index
```

This will create a `game-index.json` file in the `public` directory that contains metadata for all crawled games.

### File Structure

- Crawled game data is stored in the `public/games` directory as JSON files
- Each game is stored in a file named `game_<gameId>.json`
- The index file is stored at `public/game-index.json`

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
- JSDOM for HTML parsing in the crawler