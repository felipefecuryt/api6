/**
 * Camada de paginacao, ordenacao e filtros.
 *
 * Em memoria usamos filter/sort/slice. A ordem das operacoes e a mesma de um
 * banco relacional - WHERE, depois ORDER BY, depois LIMIT/OFFSET - porque a
 * contagem total precisa refletir os filtros, e nao a tabela inteira.
 */

/** WHERE: aplica todos os filtros presentes na query. */
export const filtrar = (lista, { categoria, ativo, search, minPrice, maxPrice }) =>
  lista.filter((item) => {
    if (categoria !== undefined && item.categoria !== categoria) return false;
    if (ativo !== undefined && item.ativo !== ativo) return false;
    if (minPrice !== undefined && item.preco < minPrice) return false;
    if (maxPrice !== undefined && item.preco > maxPrice) return false;
    if (search !== undefined && !item.nome.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

/** ORDER BY: `sort` ja vem validado contra a whitelist do schema. */
export const ordenar = (lista, sort, order) => {
  const direcao = order === 'desc' ? -1 : 1;

  return [...lista].sort((a, b) => {
    const x = a[sort];
    const y = b[sort];

    if (typeof x === 'string' && typeof y === 'string') {
      return x.localeCompare(y, 'pt-BR') * direcao;
    }
    if (x === y) return (a.id - b.id) * direcao; // desempate estavel
    return (x > y ? 1 : -1) * direcao;
  });
};

/** LIMIT/OFFSET: devolve apenas a fatia da pagina pedida. */
export const paginar = (lista, page, limit) => {
  const offset = (page - 1) * limit;
  return lista.slice(offset, offset + limit);
};

/**
 * Monta a URL de uma pagina preservando todos os filtros e a ordenacao atuais.
 * E o que permite ao cliente seguir `meta.next` sem remontar a query string.
 */
const montarLink = (rotaBase, query, page) => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(query.limit));

  for (const chave of ['sort', 'order', 'categoria', 'ativo', 'search', 'minPrice', 'maxPrice']) {
    if (query[chave] !== undefined) params.set(chave, String(query[chave]));
  }

  return `${rotaBase}?${params.toString()}`;
};

/**
 * Metadados de paginacao + links de navegacao (HATEOAS).
 *
 * `next` e `prev` sao null nas extremidades, para que o frontend possa
 * desabilitar os botoes sem fazer nenhuma conta.
 */
export const montarMeta = ({ totalItems, page, limit, rotaBase, query }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    totalItems,
    itemsPerPage: limit,
    currentPage: page,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
    links: {
      self: montarLink(rotaBase, query, page),
      first: montarLink(rotaBase, query, 1),
      prev: page > 1 ? montarLink(rotaBase, query, page - 1) : null,
      next: page < totalPages ? montarLink(rotaBase, query, page + 1) : null,
      last: montarLink(rotaBase, query, totalPages)
    }
  };
};

/** Orquestra as tres etapas e devolve `data` + `meta` prontos. */
export const consultar = ({ lista, query, rotaBase }) => {
  const filtrados = filtrar(lista, query);
  const ordenados = ordenar(filtrados, query.sort, query.order);
  const data = paginar(ordenados, query.page, query.limit);

  return {
    data,
    meta: montarMeta({ totalItems: filtrados.length, page: query.page, limit: query.limit, rotaBase, query })
  };
};
