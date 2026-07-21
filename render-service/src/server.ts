import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { enqueue, getJob, gcJobs } from './queue.js';
import { buildRenderTask } from './pipeline.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const SECRET = process.env.RENDER_SHARED_SECRET || '';

/** Autoriza con el header x-render-secret (el backend de Automata lo manda). */
function auth(req: Request, res: Response, next: NextFunction): void {
  if (!SECRET) return next(); // sin secreto configurado: modo dev abierto
  if (req.header('x-render-secret') === SECRET) return next();
  res.status(401).json({ error: 'No autorizado' });
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Encola un render. Devuelve el jobId de inmediato (202).
app.post('/video/render', auth, (req: Request, res: Response) => {
  const storyboard = req.body?.storyboard || req.body;
  if (!storyboard?.scenes?.length) {
    res.status(400).json({ error: 'Falta un storyboard con escenas.' });
    return;
  }
  const job = enqueue(buildRenderTask(storyboard));
  res.status(202).json({ jobId: job.id });
});

// Estado de un render (para hacer polling desde el front).
app.get('/video/render/:id', auth, (req: Request, res: Response) => {
  gcJobs();
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job no encontrado.' });
    return;
  }
  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    videoUrl: job.videoUrl,
    error: job.error,
  });
});

const port = Number(process.env.PORT || 3002);
app.listen(port, () => console.log(`Render service escuchando en :${port}`));
