import { Router } from 'express';
import produtoRoutes from './produto.routes.js';

const routes = Router();

routes.get('/health', (_req, res) => res.json({ status: 200, uptime: process.uptime() }));
routes.use('/produtos', produtoRoutes);

export default routes;
