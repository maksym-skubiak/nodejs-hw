import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import pinoHttp from 'pino-http';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(
  pinoHttp({
    transport: {
      target: 'pino-pretty',
    },
  }),
);

app.get('/notes', (_req, res) => {
  res.status(200).json({ message: 'Retrieved all notes' });
});

app.get('/notes/:noteId', (req, res) => {
  res.status(200).json({
    message: `Retrieved note with ID: ${req.params.noteId}`,
  });
});

app.get('/test-error', () => {
  throw new Error('Simulated server error');
});

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  res.status(500).json({ message: err.message });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
