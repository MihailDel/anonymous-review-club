const jwt = require("jsonwebtoken");

function optionalAuth(req, _res, next) {
  req.userId = null;

  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next();
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
  } catch {
    // ignore invalid tokens
  }

  next();
}

module.exports = { optionalAuth };
