import { z } from 'zod';
import { categoriasDisponiveis } from '../data/produtos.js';

/** Teto de itens por pagina: protege o servidor de um `?limit=9999999`. */
export const LIMITE_MAXIMO = 100;
export const LIMITE_PADRAO = 10;

/** Campos pelos quais e permitido ordenar. Whitelist, nunca o valor cru do cliente. */
export const CAMPOS_ORDENAVEIS = ['id', 'nome', 'preco', 'estoque', 'avaliacao', 'criadoEm'];

/** Aceita "true"/"false" vindos da query string e converte para boolean. */
const booleanoDeQuery = z
  .enum(['true', 'false'], { invalid_type_error: 'Use true ou false.' })
  .transform((valor) => valor === 'true');

/**
 * Schema da query string de GET /produtos.
 *
 * Decisoes de projeto:
 * - `limit` acima do teto NAO derruba a requisicao: e silenciosamente limitado a
 *   LIMITE_MAXIMO, e o valor efetivo aparece em `meta.itemsPerPage`.
 * - `sort` e validado contra uma whitelist, impedindo ordenacao por campo
 *   arbitrario (em um banco SQL, essa e a porta de entrada classica de injecao).
 * - `.strict()` recusa parametros desconhecidos, entao `?pagina=2` avisa o erro
 *   em vez de ser ignorado silenciosamente.
 */
export const listarProdutosQuerySchema = z
  .object({
    page: z.coerce
      .number({ invalid_type_error: 'page deve ser um numero.' })
      .int('page deve ser um numero inteiro.')
      .positive('page deve ser maior que 0.')
      .default(1),

    limit: z.coerce
      .number({ invalid_type_error: 'limit deve ser um numero.' })
      .int('limit deve ser um numero inteiro.')
      .positive('limit deve ser maior que 0.')
      .default(LIMITE_PADRAO)
      .transform((valor) => Math.min(valor, LIMITE_MAXIMO)),

    sort: z
      .enum(CAMPOS_ORDENAVEIS, {
        invalid_type_error: `sort deve ser um de: ${CAMPOS_ORDENAVEIS.join(', ')}.`
      })
      .default('id'),

    order: z
      .enum(['asc', 'desc'], { invalid_type_error: 'order deve ser asc ou desc.' })
      .default('asc'),

    categoria: z
      .enum(categoriasDisponiveis, {
        invalid_type_error: `categoria deve ser uma de: ${categoriasDisponiveis.join(', ')}.`
      })
      .optional(),

    ativo: booleanoDeQuery.optional(),

    search: z.string().trim().min(1, 'search nao pode ser vazio.').max(100).optional(),

    minPrice: z.coerce
      .number({ invalid_type_error: 'minPrice deve ser um numero.' })
      .nonnegative('minPrice nao pode ser negativo.')
      .optional(),

    maxPrice: z.coerce
      .number({ invalid_type_error: 'maxPrice deve ser um numero.' })
      .nonnegative('maxPrice nao pode ser negativo.')
      .optional()
  })
  .strict()
  .refine(
    (q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice,
    { path: ['minPrice'], message: 'minPrice nao pode ser maior que maxPrice.' }
  );
