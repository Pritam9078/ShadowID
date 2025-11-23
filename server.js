#!/usr/bin/env node
/**
 * ShadowID Backend Launcher for Render Deployment
 * This script starts the backend server from the root directory
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting ShadowID Backend...');
console.log('📂 Working directory:', process.cwd());

// Change to backend directory and start the server
const backendPath = path.join(__dirname, 'backend');
console.log('📂 Backend path:', backendPath);

process.chdir(backendPath);
console.log('📂 Changed to:', process.cwd());

// Start the server
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: { ...process.env }
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});