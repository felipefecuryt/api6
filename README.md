# API de Produtos — Paginacao, Ordenacao, Filtros e Metadados

API REST em Node.js/Express que mostra como entregar **grandes volumes de dados sem derrubar o
servidor**: paginacao por `page`/`limit`, ordenacao dinamica, filtros simples e de intervalo, e um
objeto `meta` com os metadados de navegacao (incluindo links HATEOAS).

> Atividade — Desenvolvimento de APIs e Backend, Semana 6 (APIs REST: Paginacao, Filtros e Metadados).

## Stack

| Item | Escolha |
|---|---|
| Runtime | Node.js 20+ (ES Modules) |
| Framework | Express |
| Validacao da query | Zod |
| Log | Winston |
| Testes | `node:test` nativo (23 testes) |

## Como rodar

```bash
npm install
npm start      # http://localhost:3000
npm test       # 23 testes
```

A base tem **150 produtos gerados de forma deterministica** (semente fixa), entao a pagina 3 traz
sempre os mesmos itens — isso e o que torna os testes de paginacao confiaveis.

## Estrutura

```
src/
├── app.js                            # Express + ordem dos middlewares
├── server.js
├── config/
│   ├── logger.js                     # Winston
│   └── zodPtBr.js                    # traduz as mensagens nativas do Zod
├── data/produtos.js                  # 150 produtos deterministicos
├── errors/                           # AppError, ValidationError, NotFoundError
├── middlewares/                      # validate, asyncHandler, notFound, errorHandler
├── schemas/
│   ├── produto.query.schema.js       # CONTRATO DA QUERY STRING
│   └── produto.params.schema.js
├── services/paginacao.js             # filtrar -> ordenar -> paginar -> meta
├── controllers/produto.controller.js
└── routes/produto.routes.js          # arquivo de rotas
```

## Endpoints

| Metodo | Rota | Descricao |
|---|---|---|
| `GET` | `/produtos` | Lista paginada, com ordenacao e filtros |
| `GET` | `/produtos/:id` | Busca um produto (404 se nao existir) |
| `GET` | `/produtos/meta/opcoes` | Categorias, campos ordenaveis e limites — o frontend monta os seletores a partir daqui |
| `GET` | `/health` | Disponibilidade |

### Query params de `GET /produtos`

| Param | Tipo | Padrao | Observacao |
|---|---|---|---|
| `page` | inteiro > 0 | `1` | Pagina atual |
| `limit` | inteiro > 0 | `10` | **Teto de 100** — valores maiores sao reduzidos, nao recusados |
| `sort` | enum | `id` | `id`, `nome`, `preco`, `estoque`, `avaliacao`, `criadoEm` |
| `order` | enum | `asc` | `asc` ou `desc` |
| `categoria` | enum | — | `eletronicos`, `moveis`, `livros`, `roupas`, `alimentos` |
| `ativo` | `true`/`false` | — | Filtro booleano |
| `search` | texto | — | Busca parcial no nome |
| `minPrice` | numero >= 0 | — | Limite inferior do intervalo de preco |
| `maxPrice` | numero >= 0 | — | Limite superior do intervalo de preco |

Toda paginacao, ordenacao e filtro vai por **query parameter** — nunca no corpo de um `GET`, como
manda a convencao REST. O recurso usa plural (`/produtos`).

## Parte 1 — Paginacao basica

`GET /produtos?page=2&limit=5` devolve exatamente 5 itens, e nao a base inteira:

```bash
curl "localhost:3000/produtos?page=2&limit=5"
```

A fatia sai de um `slice(offset, offset + limit)` com `offset = (page - 1) * limit` — o equivalente
em memoria do `LIMIT`/`OFFSET` do SQL. Pedir uma pagina alem do fim (`?page=999`) devolve `200`
com `data: []` e o `meta` correto: pagina vazia nao e erro do cliente.

## Parte 2 — Ordenacao, filtros e metadados

```bash
# ordenacao
curl "localhost:3000/produtos?sort=preco&order=desc"

# filtros combinados
curl "localhost:3000/produtos?categoria=eletronicos&ativo=true"
```

A ordem das operacoes e a mesma de um banco relacional — **filtrar, depois ordenar, depois
paginar** — porque `meta.totalItems` tem de refletir o resultado dos filtros, e nao a tabela
inteira. Se o filtro deixa 35 itens, `totalItems` e 35 e `totalPages` e calculado sobre 35.

### Resposta: `data` + `meta`

```json
{
  "data": [
    {
      "id": 6,
      "nome": "Monitor Premium 6",
      "categoria": "eletronicos",
      "preco": 1899.9,
      "estoque": 42,
      "ativo": true,
      "avaliacao": 4.3,
      "criadoEm": "2026-01-07T00:00:00.000Z"
    }
  ],
  "meta": {
    "totalItems": 150,
    "itemsPerPage": 5,
    "currentPage": 2,
    "totalPages": 30,
    "hasPrevPage": true,
    "hasNextPage": true,
    "links": {
      "self": "/produtos?page=2&limit=5&sort=id&order=asc",
      "first": "/produtos?page=1&limit=5&sort=id&order=asc",
      "prev": "/produtos?page=1&limit=5&sort=id&order=asc",
      "next": "/produtos?page=3&limit=5&sort=id&order=asc",
      "last": "/produtos?page=30&limit=5&sort=id&order=asc"
    }
  }
}
```

`hasPrevPage`/`hasNextPage` existem para o frontend desabilitar botoes sem fazer conta nenhuma.

## Parte 3 — Filtros de intervalo e HATEOAS

```bash
# range de preco
curl "localhost:3000/produtos?minPrice=100&maxPrice=500"
```

`minPrice` maior que `maxPrice` e recusado com `400` e a mensagem no campo certo — intervalo
impossivel e erro de quem chamou, nao uma busca vazia.

**HATEOAS:** os links em `meta.links` ja vem montados e **preservam os filtros e a ordenacao
atuais**. O cliente nao remonta query string: ele segue `meta.links.next`. Nas extremidades,
`prev` e `next` sao `null`. Um teste do projeto faz exatamente isso — pega `meta.links.next` da
primeira pagina, chama a URL devolvida e confere que caiu na pagina 2.

## Validacao da query string

O schema (`src/schemas/produto.query.schema.js`) e o contrato do endpoint:

- **`limit` tem teto de 100.** Um `?limit=9999999` nao derruba nada: vira 100, e o valor efetivo
  aparece em `meta.itemsPerPage`. Reduzir e melhor que recusar, porque o cliente continua recebendo
  resposta util.
- **`sort` e validado contra uma whitelist.** Em um banco SQL, interpolar o campo de ordenacao
  vindo do cliente e a porta de entrada classica de injecao; aqui qualquer valor fora da lista para
  no `400`.
- **`.strict()` recusa parametros desconhecidos.** `?pagina=2` (em vez de `page`) responde
  `"Parametro nao reconhecido: pagina. Confira a grafia."` em vez de ignorar em silencio e devolver
  a pagina 1 — que e o bug mais chato de diagnosticar do outro lado.

Erros seguem o mesmo contrato padronizado da Semana 5 (`status`, `error`, `message`, `details`,
`path`, `timestamp`).

## Nota sobre `OFFSET` em producao

`LIMIT/OFFSET` (ou `skip()`/`limit()` no MongoDB) e o suficiente aqui, mas **degrada em paginas
altas**: `OFFSET 100000` obriga o banco a varrer e descartar 100 mil linhas antes de devolver 10.
Para listas realmente grandes ou feeds infinitos, a saida e **cursor pagination** — paginar por
`WHERE id > ultimo_id ORDER BY id LIMIT 10`, usando o indice em vez de contar linhas. O preco e
perder o salto direto para "pagina 73". A estrutura deste projeto isola isso em
`services/paginacao.js`, entao a troca nao vazaria para os controllers.

## Parte 4 — Reflexao

### Por que uma API nunca deve retornar todos os registros de uma vez?

Um `SELECT *` sem `LIMIT` parece inofensivo em desenvolvimento, com 150 linhas de teste. Em
producao, com 2 milhoes, ele falha em quatro lugares ao mesmo tempo:

- **Memoria do servidor (OOM).** O processo precisa materializar o resultado inteiro para
  serializar o JSON. Um array de 2 milhoes de objetos consome bem mais RAM do que a soma dos dados
  "crus", por causa do overhead de cada objeto. Quando o Node estoura o heap, o processo e morto —
  e ele leva consigo **todas as outras requisicoes** que estavam em andamento, inclusive as que
  nada tinham a ver com essa consulta.
- **Rede e tempo de resposta.** Uma resposta de centenas de megabytes trava a conexao, estoura o
  timeout do proxy ou do load balancer e consome banda que era de todos. Em celular, isso e dado
  pago do usuario para renderizar uma tela que mostra 20 itens.
- **O banco.** A varredura completa invalida o cache de paginas, pode escalar para lock e disputa
  de I/O e desacelera consultas que estavam saudaveis. Um endpoint sem limite e, na pratica, um
  **negacao de servico que qualquer cliente pode disparar sem querer** — basta um refresh em loop.
- **Custo.** Em nuvem se paga por transferencia de dados, CPU e I/O. Esse endpoint transforma uma
  listagem em uma fatura.

Dai a decisao de projeto deste repositorio: nao existe caminho de codigo que devolva a base
inteira. O `limit` tem padrao (10) e **teto obrigatorio (100)**, aplicado no schema antes de
qualquer acesso aos dados. O cliente nao consegue optar por "me manda tudo".

### Como metadados consistentes melhoram a vida de quem consome a API?

Porque transformam paginacao em algo **generico**. Com `totalItems`, `itemsPerPage`, `currentPage`
e `totalPages` sempre nos mesmos nomes e no mesmo lugar, o frontend escreve **um** componente
`<Paginacao meta={meta} />` e reusa em produtos, pedidos, usuarios e em tudo que vier depois. Sem
esse padrao, cada endpoint exige um adaptador proprio e o time passa a manter N paginacoes
ligeiramente diferentes.

Na pratica, isso resolve problemas concretos:

- **Renderizar a interface antes de carregar tudo.** `totalPages` permite desenhar "1 2 3 ... 15" e
  `hasNextPage`/`hasPrevPage` dizem quais botoes ficam desabilitados — sem heuristica do tipo
  "se vieram menos itens que o `limit`, provavelmente acabou", que erra justamente quando o total
  e multiplo exato do `limit`.
- **Separar `data` de `meta`.** O array de itens nao fica contaminado com contadores, entao o
  cliente pode tipar a resposta uma vez (`{ data: T[], meta: Meta }`) e reaproveitar o tipo em
  todos os recursos.
- **Links prontos (HATEOAS) eliminam uma classe de bug.** Quem monta a URL da proxima pagina no
  cliente esquece de levar os filtros — e ai a pagina 2 mostra resultados sem filtro, o que o
  usuario le como "a busca quebrou". Seguindo `meta.links.next`, o estado da consulta e preservado
  pelo servidor, que e quem sabe quais parametros existem.
- **Contrato estavel permite cache e testes.** O cliente pode criar mocks confiaveis e testar o
  comportamento nas bordas (primeira pagina, ultima, resultado vazio) sem depender de dados reais.

Previsibilidade e o ponto: o frontend nao precisa descobrir como cada endpoint pagina, porque todos
paginam do mesmo jeito.

## Licenca

MIT
