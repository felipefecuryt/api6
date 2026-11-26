import { ValidationError } from '../errors/index.js';

/**
 * Middleware fabrica de validacao.
 *
 * Roda ANTES do controller: se o schema reprovar a entrada, a requisicao e
 * barrada aqui e nunca chega ao banco de dados. Em caso de sucesso, o valor
 * ja sanitizado (trim, lowercase, defaults) substitui o original.
 *
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'params'|'query'} origem
 */
export const validate = (schema, origem = 'body') => (req, _res, next) => {
  const resultado = schema.safeParse(req[origem]);

  if (!resultado.success) {
    // Traduz o erro do Zod para o formato "details" do contrato de erro da API.
    const details = resultado.error.issues.map((issue) => ({
      field: issue.path.join('.') || origem,
      message: issue.message
    }));

    return next(new ValidationError(details));
  }

  req[origem] = resultado.data;
  return next();
};

export default validate;
