import 'dotenv/config';
import express from 'express';
import cors    from 'cors';
import path    from 'path';
import { fileURLToPath } from 'url';
import plantsRouter from './routes/plants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app       = express();
const PORT      = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

// API routes -- companions/active lives at /api/plants/companions/active
app.use('/api/plants', plantsRouter);

// Serve the frontend (index.html) as a static file so the app and API
// are on the same origin with no CORS issues.
app.use(express.static(path.join(__dirname, '..')));

// Catch-all: serve index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🌱 Garden Planner API running at http://localhost:${PORT}`);
  console.log(`   Open the app:  http://localhost:${PORT}`);
  console.log(`   Plant list:    http://localhost:${PORT}/api/plants\n`);
});
