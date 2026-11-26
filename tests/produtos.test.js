import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { produtos } from '../src/data/produtos.js';

let server;
let base;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const get = async (rota) => {
  const res = await fetch(`${base}${rota}`);
  return { status: res.status, corpo: await res.json() };
};

describe('Parte 1 - paginacao basica', () => {
  test('sem query params usa page=1 e limit=10', async () => {
    const { status, corpo } = await get('/produtos');
    assert.equal(status, 200);
    assert.equal(corpo.data.length, 10);
    assert.equal(corpo.meta.currentPage, 1);
    assert.equal(corpo.meta.itemsPerPage, 10);
    assert.equal(corpo.meta.totalItems, 150);
    assert.equal(corpo.meta.totalPages, 15);
  });

  test('retorna apenas a fatia da pagina pedida', async () => {
    const { corpo } = await get('/produtos?page=2&limit=5');
    assert.equal(corpo.data.length, 5);
    assert.deepEqual(
      corpo.data.map((p) => p.id),
      [6, 7, 8, 9, 10]
    );
  });

  test('ultima pagina pode vir incompleta', async () => {
    const { corpo } = await get('/produtos?page=4&limit=40');
    assert.equal(corpo.meta.totalPages, 4);
    assert.equal(corpo.data.length, 150 - 3 * 40);
    assert.equal(corpo.meta.hasNextPage, false);
  });

  test('pagina alem do fim devolve lista vazia, nao erro', async () => {
    const { status, corpo } = await get('/produtos?page=999');
    assert.equal(status, 200);
    assert.equal(corpo.data.length, 0);
    assert.equal(corpo.meta.totalItems, 150);
  });

  test('limit acima do teto e reduzido a 100', async () => {
    const { corpo } = await get('/produtos?limit=9999999');
    assert.equal(corpo.data.length, 100);
    assert.equal(corpo.meta.itemsPerPage, 100);
  });

  test('page e limit invalidos retornam 400', async () => {
    for (const rota of ['/produtos?page=0', '/produtos?limit=-5', '/produtos?page=abc']) {
      const { status, corpo } = await get(rota);
      assert.equal(status, 400, rota);
      assert.equal(corpo.error, 'VALIDATION_ERROR');
    }
  });
});

describe('Parte 2 - ordenacao, filtros e metadados', () => {
  test('ordena por preco decrescente', async () => {
    const { corpo } = await get('/produtos?sort=preco&order=desc&limit=100');
    const precos = corpo.data.map((p) => p.preco);
    assert.deepEqual(precos, [...precos].sort((a, b) => b - a));
  });

  test('ordena por nome crescente', async () => {
    const { corpo } = await get('/produtos?sort=nome&order=asc&limit=20');
    const nomes = corpo.data.map((p) => p.nome);
    assert.deepEqual(nomes, [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  });

  test('sort fora da whitelist retorna 400', async () => {
    const { status } = await get('/produtos?sort=senha');
    assert.equal(status, 400);
  });

  test('filtra por categoria', async () => {
    const { corpo } = await get('/produtos?categoria=eletronicos&limit=100');
    assert.ok(corpo.data.length > 0);
    assert.ok(corpo.data.every((p) => p.categoria === 'eletronicos'));
    assert.equal(corpo.meta.totalItems, produtos.filter((p) => p.categoria === 'eletronicos').length);
  });

  test('filtra por ativo=true', async () => {
    const { corpo } = await get('/produtos?ativo=true&limit=100');
    assert.ok(corpo.data.every((p) => p.ativo === true));
    assert.equal(corpo.meta.totalItems, produtos.filter((p) => p.ativo).length);
  });

  test('combina filtros e a contagem reflete o filtro, nao a base inteira', async () => {
    const { corpo } = await get('/produtos?categoria=moveis&ativo=false&limit=100');
    const esperado = produtos.filter((p) => p.categoria === 'moveis' && !p.ativo).length;
    assert.equal(corpo.meta.totalItems, esperado);
    assert.notEqual(corpo.meta.totalItems, 150);
  });

  test('busca textual por nome', async () => {
    const { corpo } = await get('/produtos?search=Monitor&limit=100');
    assert.ok(corpo.data.every((p) => p.nome.toLowerCase().includes('monitor')));
  });

  test('meta traz o contrato completo de paginacao', async () => {
    const { corpo } = await get('/produtos?page=2&limit=10');
    for (const campo of ['totalItems', 'itemsPerPage', 'currentPage', 'totalPages']) {
      assert.ok(campo in corpo.meta, `meta.${campo} ausente`);
    }
    assert.equal(corpo.meta.totalPages, Math.ceil(corpo.meta.totalItems / corpo.meta.itemsPerPage));
  });
});

describe('Parte 3 - filtros de intervalo e HATEOAS', () => {
  test('filtra por intervalo de preco', async () => {
    const { corpo } = await get('/produtos?minPrice=100&maxPrice=500&limit=100');
    assert.ok(corpo.data.length > 0);
    assert.ok(corpo.data.every((p) => p.preco >= 100 && p.preco <= 500));
  });

  test('minPrice maior que maxPrice retorna 400', async () => {
    const { status, corpo } = await get('/produtos?minPrice=500&maxPrice=100');
    assert.equal(status, 400);
    assert.ok(corpo.details.some((d) => d.field === 'minPrice'));
  });

  test('prev e null na primeira pagina, next e null na ultima', async () => {
    const primeira = await get('/produtos?limit=10');
    assert.equal(primeira.corpo.meta.links.prev, null);
    assert.ok(primeira.corpo.meta.links.next);

    const ultima = await get('/produtos?page=15&limit=10');
    assert.equal(ultima.corpo.meta.links.next, null);
    assert.ok(ultima.corpo.meta.links.prev);
  });

  test('os links preservam filtros e ordenacao', async () => {
    const { corpo } = await get('/produtos?categoria=livros&sort=preco&order=desc&limit=5');
    for (const link of [corpo.meta.links.self, corpo.meta.links.next, corpo.meta.links.last]) {
      assert.ok(link.includes('categoria=livros'), link);
      assert.ok(link.includes('sort=preco'), link);
      assert.ok(link.includes('order=desc'), link);
    }
  });

  test('seguir meta.links.next chega na pagina seguinte', async () => {
    const primeira = await get('/produtos?limit=10');
    const segunda = await get(primeira.corpo.meta.links.next);
    assert.equal(segunda.status, 200);
    assert.equal(segunda.corpo.meta.currentPage, 2);
    assert.notDeepEqual(
      segunda.corpo.data.map((p) => p.id),
      primeira.corpo.data.map((p) => p.id)
    );
  });
});

describe('Erros e rotas auxiliares', () => {
  test('produto inexistente retorna 404 padronizado', async () => {
    const { status, corpo } = await get('/produtos/9999');
    assert.equal(status, 404);
    assert.equal(corpo.error, 'NOT_FOUND');
    assert.ok(corpo.timestamp);
  });

  test('parametro desconhecido na query retorna 400 explicando o erro', async () => {
    const { status, corpo } = await get('/produtos?pagina=2');
    assert.equal(status, 400);
    assert.ok(corpo.details[0].message.toLowerCase().includes('nao reconhecido'));
  });

  test('rota inexistente retorna 404 em JSON', async () => {
    const { status, corpo } = await get('/produto');
    assert.equal(status, 404);
    assert.equal(corpo.error, 'NOT_FOUND');
  });

  test('/produtos/meta/opcoes expoe filtros e campos ordenaveis', async () => {
    const { status, corpo } = await get('/produtos/meta/opcoes');
    assert.equal(status, 200);
    assert.equal(corpo.data.limitMaximo, 100);
    assert.ok(corpo.data.categorias.includes('eletronicos'));
  });
});
