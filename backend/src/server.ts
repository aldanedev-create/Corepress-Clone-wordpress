// backend/src/server.ts
import app from './app';
import { connectDatabase, disconnectDatabase, getDatabaseState } from './config/database';
import { PORT, NODE_ENV } from './config/env';

// Server instance
let server: any;

// Graceful shutdown function
const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Close server
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('HTTP server closed');
        resolve();
      });
    });
  }
  
  // Disconnect database
  await disconnectDatabase();
  
  console.log('Graceful shutdown completed');
  process.exit(0);
};

// Handle uncaught exceptions
const handleUncaughtException = (error: Error): void => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(error.name, error.message, error.stack);
  
  // Log error to file or monitoring service
  // ...
  
  // Exit process
  process.exit(1);
};

// Handle unhandled rejections
const handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(reason);
  
  // Log error to file or monitoring service
  // ...
  
  // Exit process
  process.exit(1);
};

// Set up process event listeners
process.on('uncaughtException', handleUncaughtException);
process.on('unhandledRejection', handleUnhandledRejection);
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected successfully');
    
    // Start HTTP server
    server = app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🚀 CorePress CMS Server Started Successfully          ║
║                                                          ║
║   Environment: ${NODE_ENV.padEnd(40)}║
║   Port: ${String(PORT).padEnd(44)}║
║   URL: http://localhost:${PORT}${' '.padEnd(24)}║
║                                                          ║
║   📚 API Documentation: http://localhost:${PORT}/api${' '.padEnd(16)}║
║   🏥 Health Check: http://localhost:${PORT}/api/health${' '.padEnd(12)}║
║                                                          ║
║   ⚡ Press Ctrl+C to stop the server                     ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
      `);
    });
    
    // Server error handling
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error;
      }
      
      const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;
      
      // Handle specific listen errors
      switch (error.code) {
        case 'EACCES':
          console.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();

// Export for testing
export { server, app };