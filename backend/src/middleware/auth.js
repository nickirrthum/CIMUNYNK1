const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cashflow_jwt_secret_2024');
    req.usuario = decoded;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
};
