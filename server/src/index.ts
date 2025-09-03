import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config.js';
import { router as api } from './routes/index';

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(morgan('dev'));

app.use('/api', api);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(config.port, () => {
    console.log(`server listening on http://localhost:${config.port}`);
});
