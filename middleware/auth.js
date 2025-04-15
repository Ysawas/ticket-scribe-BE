// middleware/auth.js
import jwt from 'jsonwebtoken';  //  ESM

export default (req, res, next) => {  //  ESM
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('AUTH MIDDLEWARE: Decoded token:', decoded);  //  Add this line
    req.user = decoded.user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};