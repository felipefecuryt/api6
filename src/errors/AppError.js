/**
 * Erro base da aplicacao.
 *
 * Tudo que herda de AppError e considerado um erro "esperado" (operacional):
 * o handler global confia na mensagem e no status e pode devolve-los ao cliente.
 * Qualquer outro erro e tratado como inesperado e vira 500 com mensagem genarica.
 */
export default class AppError extends Error {
  /**
   * @param {string} message  Mensagem segura para o usuario final.
   * @param {number} status   Codigo HTTP.
   * @param {string} code     Codigo de erro estavel para o frontend (ex: VALIDATION_ERROR).
   * @param {Array<{field: string, message: string}>} details
   */
  constructor(message, status = 400, code = 'APP_ERROR', details = []) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
