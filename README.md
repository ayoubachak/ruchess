# RU Chess - Tauri + React + TypeScript Chess Application

A modern chess application built with Tauri, React, and TypeScript.

## Prerequisites

Before running the project, ensure you have the following installed:

- Node.js and npm
- Rust and Cargo
- System dependencies for Tauri (see below)

## System Dependencies (Ubuntu/Debian)

For Ubuntu/Debian-based systems, run the following commands to install the required dependencies:

```bash
# Update system packages
sudo apt update

# Install Tauri dependencies
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev libjavascriptcoregtk-4.1-dev libsoup2.4-dev webkit2gtk-driver

# Create symbolic links for pkg-config files (Ubuntu 24.04+ specific)
sudo ln -s /usr/lib/x86_64-linux-gnu/pkgconfig/javascriptcoregtk-4.1.pc /usr/lib/x86_64-linux-gnu/pkgconfig/javascriptcoregtk-4.0.pc
sudo ln -s /usr/lib/x86_64-linux-gnu/pkgconfig/webkit2gtk-4.1.pc /usr/lib/x86_64-linux-gnu/pkgconfig/webkit2gtk-4.0.pc
sudo ln -s /usr/lib/x86_64-linux-gnu/pkgconfig/webkit2gtk-web-extension-4.1.pc /usr/lib/x86_64-linux-gnu/pkgconfig/webkit2gtk-web-extension-4.0.pc

# Create symbolic links for shared libraries (Ubuntu 24.04+ specific)
sudo ln -s /usr/lib/x86_64-linux-gnu/libwebkit2gtk-4.1.so /usr/lib/x86_64-linux-gnu/libwebkit2gtk-4.0.so
sudo ln -s /usr/lib/x86_64-linux-gnu/libjavascriptcoregtk-4.1.so /usr/lib/x86_64-linux-gnu/libjavascriptcoregtk-4.0.so

# Set PKG_CONFIG_PATH environment variable
export PKG_CONFIG_PATH=/usr/lib/x86_64-linux-gnu/pkgconfig:$PKG_CONFIG_PATH
```

## Running the Application

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Run the development server:
```bash
npm run tauri dev
```

This will start both the React frontend and the Tauri backend.

## Building for Production

To build the application for production:

```bash
npm run tauri build
```

This will create executable packages in the `src-tauri/target/release/bundle` directory.

## Project Structure

- `src/` - React frontend code
- `src-tauri/` - Rust backend code for Tauri
- `src-tauri/src/game/` - Chess game logic implementation

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
