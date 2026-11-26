import AppError from './AppError.js';

/** 400 - query string invalida (page, limit, sort, filtros fora do padrao). */
export class ValidationError extends AppError {
  constructor(details = [], message = 'Os parametros da requisicao sao invalidos.') {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/** 404 - recurso ou rota inexistente. */
export class NotFoundError extends AppError {
  constructor(message = 'Recurso nao encontrado.') {
    super(message, 404, 'NOT_FOUND');
  }
}

export { AppError };
