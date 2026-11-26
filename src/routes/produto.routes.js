import { Router } from 'express';
import validate from '../middlewares/validate.js';
import asyncHandler from '../middlewares/asyncHandler.js';
import { listarProdutosQuerySchema } from '../schemas/produto.query.schema.js';
import { idParamSchema } from '../schemas/produto.params.schema.js';
import * as controller from '../controllers/produto.controller.js';

const router = Router();

// Paginacao, ordenacao e filtros chegam SEMPRE por query params (convencao REST
// para GET), nunca no corpo da requisicao.
router.get('/', validate(listarProdutosQuerySchema, 'query'), asyncHandler(controller.listarProdutos));

// Declarada antes de "/:id" para nao ser capturada pelo parametro dinamico.
router.get('/meta/opcoes', asyncHandler(controller.listarOpcoes));

router.get('/:id', validate(idParamSchema, 'params'), asyncHandler(controller.buscarProduto));

export default router;
