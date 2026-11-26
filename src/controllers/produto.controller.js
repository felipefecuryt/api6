import { produtos, categoriasDisponiveis } from '../data/produtos.js';
import { consultar } from '../services/paginacao.js';
import { NotFoundError } from '../errors/index.js';
import { CAMPOS_ORDENAVEIS, LIMITE_MAXIMO, LIMITE_PADRAO } from '../schemas/produto.query.schema.js';

/**
 * GET /produtos
 * A query string chega aqui ja validada e com os valores padrao aplicados,
 * entao o controller nao precisa de nenhum if defensivo.
 */
export const listarProdutos = async (req, res) => {
  const { data, meta } = consultar({ lista: produtos, query: req.query, rotaBase: '/produtos' });
  return res.status(200).json({ data, meta });
};

/** GET /produtos/:id */
export const buscarProduto = async (req, res) => {
  const produto = produtos.find((p) => p.id === req.params.id);
  if (!produto) throw new NotFoundError(`Produto com id ${req.params.id} nao encontrado.`);
  return res.status(200).json({ data: produto });
};

/**
 * GET /produtos/meta/opcoes
 * Expoe o que o cliente pode usar em filtros e ordenacao, para que o frontend
 * monte os seletores sem precisar de valores chumbados no codigo.
 */
export const listarOpcoes = async (_req, res) =>
  res.status(200).json({
    data: {
      categorias: categoriasDisponiveis,
      ordenarPor: CAMPOS_ORDENAVEIS,
      order: ['asc', 'desc'],
      limitPadrao: LIMITE_PADRAO,
      limitMaximo: LIMITE_MAXIMO
    }
  });
