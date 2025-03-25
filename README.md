# Chess Game

A modern chess application built with React and Tauri, featuring local gameplay, AI opponents, and multiplayer capabilities.

## Features

- **Local Game Mode**: Play chess with a friend on the same device
- **AI Mode** (Desktop version only): Challenge the computer with adjustable difficulty levels
- **Multiplayer Mode**: Play online against other players
- **Session Management**: Create and manage multiple game sessions

## Technology Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express, Socket.io
- **Desktop Application**: Tauri (Rust)

## Prerequisites

- Node.js 16+
- Rust (for desktop version)
- npm or yarn

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/ruchess.git
   cd ruchess
   ```

2. Install frontend dependencies:
   ```
   npm install
   ```

3. Install server dependencies:
   ```
   cd server
   npm install
   cd ..
   ```

## Running the Application

### Web Version (No AI capabilities)

To run the web version with multiplayer functionality:

```
npm run start-all
```

This will start both the React frontend on port 3000 and the multiplayer server on port 3002.

### Desktop Version (Full functionality)

To run the desktop version with AI capabilities:

```
npm run tauri dev
```

This will start the Tauri application with the full feature set including AI gameplay.

## Building for Production

### Web Version

```
npm run build
```

### Desktop Version

```
npm run tauri build
```

This will create executable applications for your operating system in the `src-tauri/target/release` directory.

## Game Modes

### Local Game

Play against another player on the same device, taking turns to make moves.

### AI Game (Desktop only)

Challenge the computer at three difficulty levels:
- **Easy**: Makes random valid moves
- **Medium**: Prioritizes captures and basic tactics
- **Hard**: Uses advanced evaluation and strategy

### Multiplayer

Create a new game and share the link with your opponent, or join an existing game with a room ID.

## Development

### Project Structure

- `/src` - React frontend
- `/src/services` - Game services and logic
- `/server` - Multiplayer server
- `/src-tauri` - Rust backend for desktop version

## License

MIT

## Credits

Created by [Your Name]
