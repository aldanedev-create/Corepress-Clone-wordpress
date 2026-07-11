// backend/src/config/database.ts
import mongoose from 'mongoose';
import { MONGODB_URI, MONGODB_DB_NAME, NODE_ENV } from './env';

// Connection options
const connectionOptions: mongoose.ConnectOptions = {
  dbName: MONGODB_DB_NAME,
  autoIndex: true,
  maxPoolSize: 10,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4
};

// Database connection state
interface DatabaseState {
  isConnected: boolean;
  connectionAttempts: number;
  lastConnectionAttempt: Date | null;
  error: Error | null;
}

const state: DatabaseState = {
  isConnected: false,
  connectionAttempts: 0,
  lastConnectionAttempt: null,
  error: null,
};

// Logger function
const logDatabaseEvent = (message: string, level: 'info' | 'error' = 'info'): void => {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] [Database] ${message}`);
};

// Connect to MongoDB
export const connectDatabase = async (): Promise<void> => {
  try {
    // Prevent multiple connections
    if (state.isConnected) {
      logDatabaseEvent('Already connected to database');
      return;
    }

    // Increment connection attempts
    state.connectionAttempts += 1;
    state.lastConnectionAttempt = new Date();

    logDatabaseEvent(`Connecting to MongoDB... (Attempt ${state.connectionAttempts})`);

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, connectionOptions);

    // Update connection state
    state.isConnected = true;
    state.error = null;

    logDatabaseEvent('✅ MongoDB connected successfully');

    // Set up connection event handlers
    setupConnectionEventHandlers();

  } catch (error) {
    state.isConnected = false;
    state.error = error instanceof Error ? error : new Error('Unknown database error');

    logDatabaseEvent(
      `❌ MongoDB connection failed: ${state.error.message}`,
      'error'
    );

    // Throw error to handle upstream
    throw error;
  }
};

// Setup connection event handlers
const setupConnectionEventHandlers = (): void => {
  const connection = mongoose.connection;

  // Remove existing listeners to prevent duplicates
  connection.removeAllListeners('connected');
  connection.removeAllListeners('error');
  connection.removeAllListeners('disconnected');
  connection.removeAllListeners('reconnected');
  connection.removeAllListeners('reconnectFailed');

  // Connection success
  connection.on('connected', () => {
    state.isConnected = true;
    logDatabaseEvent('MongoDB connection established');
  });

  // Connection error
  connection.on('error', (error) => {
    state.isConnected = false;
    state.error = error;
    logDatabaseEvent(`MongoDB error: ${error.message}`, 'error');
  });

  // Disconnection
  connection.on('disconnected', () => {
    state.isConnected = false;
    logDatabaseEvent('MongoDB disconnected');
  });

  // Reconnection
  connection.on('reconnected', () => {
    state.isConnected = true;
    state.error = null;
    logDatabaseEvent('MongoDB reconnected successfully');
  });

  // Reconnection failed
  connection.on('reconnectFailed', () => {
    state.isConnected = false;
    logDatabaseEvent('MongoDB reconnection failed', 'error');
  });
};

// Disconnect from database
export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (!state.isConnected) {
      logDatabaseEvent('Not connected to database');
      return;
    }

    await mongoose.disconnect();
    state.isConnected = false;
    logDatabaseEvent('MongoDB disconnected successfully');
  } catch (error) {
    state.error = error instanceof Error ? error : new Error('Unknown error');
    logDatabaseEvent(`Failed to disconnect: ${state.error.message}`, 'error');
    throw error;
  }
};

// Get database connection state
export const getDatabaseState = (): DatabaseState => {
  return { ...state };
};

// Health check function
export const checkDatabaseHealth = async (): Promise<{
  isHealthy: boolean;
  message: string;
  details?: any;
}> => {
  try {
    // Check if connection is ready
    if (!state.isConnected) {
      return {
        isHealthy: false,
        message: 'Database not connected'
      };
    }

    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      return {
        isHealthy: false,
        message: `Mongoose connection state: ${mongoose.connection.readyState}`
      };
    }

    // Perform a simple read operation
    const admin = mongoose.connection.db?.admin();
    if (admin) {
      await admin.ping();
    }

    return {
      isHealthy: true,
      message: 'Database is healthy',
      details: {
        state: mongoose.connection.readyState,
        dbName: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        connections: mongoose.connection.connections.length
      }
    };
  } catch (error) {
    return {
      isHealthy: false,
      message: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Graceful shutdown function
export const gracefulShutdown = async (): Promise<void> => {
  try {
    logDatabaseEvent('Starting graceful shutdown...');
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logDatabaseEvent('Error during graceful shutdown', 'error');
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);