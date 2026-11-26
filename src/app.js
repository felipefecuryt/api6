import express from 'express';
import './config/zodPtBr.js';
import routes from './routes/index.js';
import notFoundHandler from './middlewares/notFoundHandler.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

app.use(express.json());
app.use(routes);

// A ordem importa: 404 primeiro, handler global de erros sempre por ultimo.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
