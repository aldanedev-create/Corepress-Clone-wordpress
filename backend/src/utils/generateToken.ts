// backend/src/utils/generateToken.ts
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/env';

// Token payload interface
export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

// Generate JWT token
export const generateToken = (payload: TokenPayload): string => {
  try {
    const token = jwt.sign(
      {
        id: payload.id,
        email: payload.email,
        role: payload.role
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'corepress-cms',
        audience: 'corepress-api'
      }
    );
    return token;
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Failed to generate authentication token');
  }
};

// Generate refresh token (longer expiry)
export const generateRefreshToken = (payload: TokenPayload): string => {
  try {
    const token = jwt.sign(
      {
        id: payload.id,
        email: payload.email,
        role: payload.role
      },
      JWT_SECRET,
      {
        expiresIn: '7d',
        issuer: 'corepress-cms',
        audience: 'corepress-api'
      }
    );
    return token;
  } catch (error) {
    console.error('Refresh token generation error:', error);
    throw new Error('Failed to generate refresh token');
  }
};

// Generate temporary token (for password reset, email verification, etc.)
export const generateTemporaryToken = (
  payload: TokenPayload,
  expiresIn: string = '1h'
): string => {
  try {
    const token = jwt.sign(
      {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        type: 'temporary'
      },
      JWT_SECRET,
      {
        expiresIn,
        issuer: 'corepress-cms',
        audience: 'corepress-api'
      }
    );
    return token;
  } catch (error) {
    console.error('Temporary token generation error:', error);
    throw new Error('Failed to generate temporary token');
  }
};

// Verify token
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'corepress-cms',
      audience: 'corepress-api'
    }) as any;
    
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.error('Token expired:', error.message);
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error('Invalid token:', error.message);
    } else {
      console.error('Token verification error:', error);
    }
    return null;
  }
};

// Decode token without verification (for client-side use)
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded) return null;
    
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
};

// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Token expiration check error:', error);
    return true;
  }
};

// Get token expiration time
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) return null;
    
    return new Date(decoded.exp * 1000);
  } catch (error) {
    console.error('Token expiration time error:', error);
    return null;
  }
};

// Generate API key
export const generateApiKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const segments = [];
  
  for (let i = 0; i < 4; i++) {
    let segment = '';
    for (let j = 0; j < 8; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  
  return segments.join('-');
};

// Generate random password
export const generateRandomPassword = (length: number = 12): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specials = '!@#$%^&*()_+-=';
  
  const allChars = uppercase + lowercase + numbers + specials;
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += specials.charAt(Math.floor(Math.random() * specials.length));
  
  // Fill remaining length
  for (let i = 4; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

export default {
  generateToken,
  generateRefreshToken,
  generateTemporaryToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
  generateApiKey,
  generateRandomPassword
};