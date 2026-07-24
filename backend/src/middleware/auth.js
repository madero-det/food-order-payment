import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token;
  
  if (!authHeader && !queryToken) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = authHeader ? authHeader.replace('Bearer ', '') : queryToken;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
