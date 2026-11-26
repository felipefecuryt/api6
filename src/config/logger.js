import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const consoleFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${ts}] ${level}: ${stack || message}${extra}`;
});

/**
 * Logger interno do servidor.
 * O que e logado aqui NUNCA vai para a resposta HTTP do cliente:
 * stack trace e detalhes de infraestrutura ficam apenas do lado do servidor.
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(errors({ stack: true }), timestamp(), json()),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), consoleFormat)
    }),
    // Arquivo dedicado para que a equipe de infraestrutura investigue erros 500.
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
  ]
});

export default logger;
