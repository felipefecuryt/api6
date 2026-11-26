import app from './app.js';
import logger from './config/logger.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Servidor ouvindo em http://localhost:${PORT}`);
});

/**
 * Rede de seguranca final: erros fora do ciclo de requisicao do Express.
 * Sao logados para investigacao em vez de derrubar a aplicacao silenciosamente.
 */
process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', { reason: reason instanceof Error ? reason.stack : reason });
});

process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', { name: err.name, message: err.message, stack: err.stack });
});

const encerrar = (sinal) => () => {
  logger.info(`${sinal} recebido, encerrando o servidor.`);
  server.close(() => process.exit(0));
};

process.on('SIGTERM', encerrar('SIGTERM'));
process.on('SIGINT', encerrar('SIGINT'));

export default server;
