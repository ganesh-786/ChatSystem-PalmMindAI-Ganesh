import express from 'express';
import usersRouter from './users.js';

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.use('/users', usersRouter);

export default router;
