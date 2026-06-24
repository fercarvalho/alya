// Tipos compartilhados de Transação — extraídos de App.tsx na Fase 1.6.2
// para serem consumidos tanto pelo AppContent (que ainda gerencia o state)
// quanto pelo componente Transactions em src/subsistemas/financeiro/modulos/.

export type TransactionType =
  | 'Receita'
  | 'Despesa'
  | 'Transferência entre contas'
  | 'A confirmar'
  | 'Reforço de caixa'
  | 'Retirada de caixa';

// Movimentações de caixa: aporte (reforço) e sangria (retirada). Afetam o
// saldo/caixa (reforço soma, retirada subtrai), mas ficam FORA do DRE, das
// metas e dos cards de Receita/Despesa (não são operacionais).
export const CAIXA_TRANSACTION_TYPES: TransactionType[] = [
  'Reforço de caixa',
  'Retirada de caixa',
];

// Estilos por tipo (badge + valor + sinal):
//   - 'Transferência entre contas' (azul, neutro em DRE/Dashboard)
//   - 'A confirmar' (roxo — sinal universal de atenção pendente)
export const TRANSACTION_TYPE_STYLES: Record<
  TransactionType,
  { badge: string; valueText: string; sign: '+' | '-' | '' }
> = {
  Receita: {
    badge:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    valueText: 'text-green-600',
    sign: '+',
  },
  Despesa: {
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    valueText: 'text-red-600',
    sign: '-',
  },
  'Transferência entre contas': {
    badge:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    valueText: 'text-blue-600',
    sign: '',
  },
  'A confirmar': {
    badge:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    valueText: 'text-purple-600',
    sign: '',
  },
  'Reforço de caixa': {
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    valueText: 'text-teal-600',
    sign: '+',
  },
  'Retirada de caixa': {
    badge:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    valueText: 'text-orange-600',
    sign: '-',
  },
};
