/**
 * Envolve um handler assincrono e encaminha qualquer rejeicao para o
 * tratamento global de erros. Sem isso, o Express 4 nao captura excecoes
 * lancadas dentro de funcoes async e o processo pode morrer com
 * unhandledRejection.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
