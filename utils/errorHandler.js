import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Custom error handler
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorHandler = (err, req, res, next) => {
  // Log error for server-side debugging
  console.error(err.stack); // Log the full error stack!

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      error: 'Validation Error',
      details: messages
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    let field = Object.keys(err.keyValue)[0];
    let value = err.keyValue[field];
    return res.status(400).json({
      error: 'Duplicate Key Error',
      details: `A record with that ${field} "${value}" already exists.`
    });
  }

  // Mongoose cast error (invalid ID)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID',
      details: `Resource not found with id: ${err.value}`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid Token',
      details: 'Authorization failed'
    });
  }

  // JWT expiration error
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token Expired',
      details: 'Please log in again'
    });
  }

  // Multer file upload error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File Too Large',
      details: 'File size must be less than 10MB'
    });
  }

  // Default server error
  return res.status(500).json({
    error: 'Server Error',
    details: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
};

export default errorHandler;