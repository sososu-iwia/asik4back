const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Missing Authorization token' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
