import type { Cliente } from '@prisma/client';

export function apresentarCliente(cliente: Cliente) {
  return {
    id: cliente.id,
    nome: cliente.nome,
    documento: cliente.documento,
    email: cliente.email,
    telefone: cliente.telefone,
    criadoEm: cliente.criadoEm,
  };
}
