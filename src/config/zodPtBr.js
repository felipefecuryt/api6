import { z } from 'zod';

/**
 * Traduz as mensagens que o Zod gera por conta propria (valor fora do enum,
 * chave desconhecida, tipo errado). Sem isso, parte das respostas de erro sai
 * em ingles e o contrato da API fica inconsistente.
 *
 * Mensagens declaradas caso a caso no schema continuam tendo prioridade.
 */
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_enum_value:
      return { message: `Valor invalido. Use um de: ${issue.options.join(', ')}.` };
    case z.ZodIssueCode.unrecognized_keys:
      return {
        message: `Parametro nao reconhecido: ${issue.keys.join(', ')}. Confira a grafia.`
      };
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') return { message: 'Campo obrigatorio.' };
      return { message: `Tipo invalido: esperado ${issue.expected}.` };
    case z.ZodIssueCode.too_small:
      return { message: `Valor abaixo do minimo permitido (${issue.minimum}).` };
    case z.ZodIssueCode.too_big:
      return { message: `Valor acima do maximo permitido (${issue.maximum}).` };
    default:
      return { message: ctx.defaultError };
  }
});
