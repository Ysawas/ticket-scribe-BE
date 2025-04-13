import express from 'express';
import connectDB from './config/db.js';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import errorHandler from './utils/errorHandler.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import departmentRoutes from './routes/departments.js';
import topicRoutes from './routes/topics.js';
import ticketRoutes from './routes/tickets.js';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit'; //  Import express-rate-limit
dotenv.config();

// Connect to database
connectDB();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

// Apply the rate limiting middleware to all requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again in a minute',
  standardHeaders: true, // Return rate limit info in the headers
  legacyHeaders: false, // Don't use the `X-RateLimit-*` headers
  statusCode: 429
});
app.use(limiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/tickets', ticketRoutes);

// Basic route for API health check
app.get('/', (req, res) => {
  res.json({ message: 'Ticket Support System API' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));