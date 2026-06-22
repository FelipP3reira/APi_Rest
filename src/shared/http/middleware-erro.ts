import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import { ErroAplicacao } from '../erros/erros-aplicacao.js';
import { montarCorpoErro } from './resposta-erro.js';

export const rotaNaoEncontrada: RequestHandler = (req, res) => {
  res
    .status(404)
    .json(montarCorpoErro('NAO_ENCONTRADO', `Não há rota para ${req.method} ${req.path}.`));
};

export const middlewareErro: ErrorRequestHandler = (erro, _req, res, _next) => {
  if (erro instanceof ZodError) {
    res
      .status(400)
      .json(
        montarCorpoErro(
          'VALIDACAO',
          'Alguns campos não passaram na validação.',
          erro.flatten().fieldErrors,
        ),
      );
    return;
  }

  if (erro instanceof ErroAplicacao) {
    res.status(erro.status).json(montarCorpoErro(erro.codigo, erro.message, erro.detalhes));
    return;
  }

  console.error('Erro não tratado:', erro);
  res
    .status(500)
    .json(
      montarCorpoErro(
        'ERRO_INTERNO',
        'Algo quebrou aqui do nosso lado. Tenta de novo em instantes.',
      ),
    );
};
