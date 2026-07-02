import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';

const app = express();

app.use(helmet());

// Configure CORS
const clientUrl = process.env.CLIENT_URL;
const allowedOrigins = clientUrl ? clientUrl.split(',').map(url => url.trim()) : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(null, false);
      }
    },
    credentials: true,
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple health check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Kindred Backend is healthy.' });
});

// Mount routes
app.use('/api', routes);

// 404 Route handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ message: 'Resource not found' });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error Handler]', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    errors: err.errors || undefined,
  });
});

export default app;
