// Categorias do sistema, por tipo de transação. Fonte única — consumida pelo
// getCategoriesByType (modais de transação) e pelo modal de Conjunto de Regras.
//
// Categoria é conceitualmente atrelada ao tipo (Receita vs Despesa). Nas Regras,
// onde uma regra pode categorizar sem definir tipo, exibimos todas agrupadas.
export const CATEGORIES_BY_TYPE: { Receita: string[]; Despesa: string[] } = {
  Receita: ['Atacado', 'Varejo', 'Investimentos', 'Outros'],
  Despesa: ['Fixo', 'Variável', 'Investimento', 'Mkt', 'Outros'],
};
