import { NotFoundError } from '../errors/index.js';

/**
 * Captura qualquer requisicao que nao casou com nenhuma rota e a transforma
 * em um NotFoundError, para que o 404 saia no mesmo formato JSON dos outros
 * erros em vez da pagina HTML padrao do Express.
 */
export const notFoundHandler = (req, _res, next) =>
  next(new NotFoundError(`Rota ${req.method} ${req.originalUrl} nao encontrada.`));

export default notFoundHandler;
