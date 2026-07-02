import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import { initSockets } from './sockets/socket.handler';

const startServer = async () => {
  // Connect to Database
  await connectDB();

  const server = http.createServer(app);

  // Initialize Sockets
  initSockets(server);

  const PORT = process.env.PORT || 5001;

  server.listen(PORT, () => {
    console.log(`================================================`);
    console.log(`🚀 Kindred Server running on port ${PORT}`);
    console.log(`🤖 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`================================================`);
  });
};

startServer().catch((error) => {
  console.error('Fatal error starting the server:', error);
  process.exit(1);
});
