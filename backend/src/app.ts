import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import salesRouter from './routes/sales';
import withdrawalsRouter from './routes/withdrawals';
import usersRouter from './routes/users';
import devRouter from './routes/dev';
import { requireAuth } from './middleware/auth';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);

app.use('/api/sales', requireAuth, salesRouter);
app.use('/api/withdrawals', requireAuth, withdrawalsRouter);
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/dev', requireAuth, devRouter);

export default app;
