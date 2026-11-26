import logger from '../config/logger.js';
import { AppError } from '../errors/index.js';

/**
 * Monta o corpo de erro padronizado da API.
 * Todo erro - de validacao, de regra de negocio, 404 ou 500 - sai neste formato.
 */
const montarResposta = ({ status, code, message, details, path }) => ({
  status,
  error: code,
  message,
  details,
  path,
  timestamp: new Date().toISOString()
});

/**
 * Tratamento GLOBAL de excecoes (ultimo middleware da cadeia).
 *
 * Tres categorias:
 *  1. AppError  -> erro esperado: usa status/code/message/details da propria excecao.
 *  2. JSON malformado (SyntaxError do express.json) -> 400 BAD_JSON.
 *  3. Qualquer outro erro -> 500 com mensagem generica. O stack trace NUNCA sai
 *     na resposta: fica apenas no log interno do servidor.
 *
 * A assinatura precisa ter 4 parametros para o Express reconhecer o middleware
 * como handler de erro.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  const path = req.originalUrl;

  // 1. Erros operacionais previstos pela aplicacao.
  if (err instanceof AppError) {
    logger.warn(`${err.code} em ${req.method} ${path}: ${err.message}`);
    return res.status(err.status).json(
      montarResposta({
        status: err.status,
        code: err.code,
        message: err.message,
        details: err.details,
        path
      })
    );
  }

  // 2. Corpo da requisicao com JSON invalido.
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn(`JSON malformado em ${req.method} ${path}`);
    return res.status(400).json(
      montarResposta({
        status: 400,
        code: 'BAD_JSON',
        message: 'O corpo da requisicao nao e um JSON valido.',
        details: [{ field: 'body', message: 'Verifique virgulas, chaves e aspas do JSON enviado.' }],
        path
      })
    );
  }

  // 3. Erro inesperado: log completo para a infraestrutura, resposta generica
  //    para o cliente. Nada de nome de tabela, SQL ou caminho de arquivo.
  logger.error('Erro interno nao tratado', {
    method: req.method,
    path,
    name: err.name,
    message: err.message,
    stack: err.stack
  });

  return res.status(500).json(
    montarResposta({
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno no servidor. Tente novamente mais tarde.',
      details: [],
      path
    })
  );
};

export default errorHandler;
