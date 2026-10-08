const express = require('express');

// Create a simple Express app
const app = express();
const PORT = 3000;

// Basic route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// POST route for testing
app.post('/test', (req, res) => {
  res.json({ message: 'POST request received' });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Test GET endpoint: http://localhost:${PORT}/`);
  console.log(`Test POST endpoint: http://localhost:${PORT}/test`);
}).on('error', (error) => {
  console.error('Server startup error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please free the port and try again.`);
  }
  process.exit(1);
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});