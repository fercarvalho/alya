export interface Transaction {
  id: string
  date: string
  description: string
  category: string
  amount: number
  type: 'receita' | 'despesa'
  tipoReceita?: 'atacado' | 'varejo' | 'outros'
  tipoDespesa?: 'fixo' | 'variavel' | 'atacado' | 'varejo' | 'investimento' | 'mkt' | 'outros'
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  name: string
  category: string
  price: number
  cost: number
  stock: number
  sold: number
  createdAt: string
  updatedAt: string
}

export interface DatabaseState {
  transactions: Transaction[]
  products: Product[]
}
