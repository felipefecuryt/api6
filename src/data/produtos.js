/**
 * Base de dados em memoria com 150 produtos.
 *
 * Os dados sao gerados de forma DETERMINISTICA (gerador congruencial linear com
 * semente fixa), para que os testes e a paginacao sejam reproduziveis: a pagina
 * 3 traz sempre os mesmos itens, em qualquer maquina.
 */
const CATALOGO = {
  eletronicos: ['Monitor', 'Fone', 'Teclado', 'Mouse', 'Notebook'],
  moveis: ['Cadeira', 'Mesa', 'Estante', 'Poltrona', 'Luminaria'],
  livros: ['Romance', 'Manual', 'Biografia', 'Atlas', 'Dicionario'],
  roupas: ['Jaqueta', 'Camiseta', 'Tenis', 'Mochila', 'Bone'],
  alimentos: ['Cafe', 'Chocolate', 'Azeite', 'Cha', 'Granola']
};

const CATEGORIAS = Object.keys(CATALOGO);
const QUALIFICADORES = ['Basico', 'Premium', 'Compacto', 'Pro', 'Max', 'Classico', 'Especial', 'Leve'];

/** LCG simples: previsivel de proposito, nao serve para nada criptografico. */
const criarRandom = (semente) => {
  let estado = semente;
  return () => {
    estado = (estado * 1103515245 + 12345) % 2147483648;
    return estado / 2147483648;
  };
};

const gerarProdutos = (quantidade = 150) => {
  const random = criarRandom(42);
  const base = Date.UTC(2026, 0, 1);

  return Array.from({ length: quantidade }, (_, indice) => {
    const id = indice + 1;
    const categoria = CATEGORIAS[Math.floor(random() * CATEGORIAS.length)];
    const nomes = CATALOGO[categoria];
    const substantivo = nomes[Math.floor(random() * nomes.length)];
    const qualificador = QUALIFICADORES[Math.floor(random() * QUALIFICADORES.length)];

    return {
      id,
      nome: `${substantivo} ${qualificador} ${id}`,
      categoria,
      preco: Math.round((20 + random() * 2980) * 100) / 100,
      estoque: Math.floor(random() * 200),
      ativo: random() > 0.25,
      avaliacao: Math.round(random() * 50) / 10,
      criadoEm: new Date(base + id * 86400000).toISOString()
    };
  });
};

export const produtos = gerarProdutos(150);
export const categoriasDisponiveis = CATEGORIAS;
