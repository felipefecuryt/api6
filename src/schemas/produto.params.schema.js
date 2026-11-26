import { z } from 'zod';

/** O id de rota precisa ser um inteiro positivo. */
export const idParamSchema = z.object({
  id: z.coerce.number().int('O id deve ser um numero inteiro.').positive('O id deve ser maior que 0.')
});
