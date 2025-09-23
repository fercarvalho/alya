import { DatabaseState, Transaction, Product } from '../types'

const STORAGE_KEY = 'alya-financial-data'

// Dados iniciais
const initialData: DatabaseState = {
  transactions: [
    {
      id: '1',
      date: '2025-09-23',
      description: 'Venda - Vela Aromática Lavanda',
      category: 'Vendas',
      amount: 89.90,
      type: 'receita',
      createdAt: '2025-09-23T10:00:00Z',
      updatedAt: '2025-09-23T10:00:00Z',
    },
    {
      id: '2',
      date: '2025-09-22',
      description: 'Compra - Cera de Soja',
      category: 'Matéria Prima',
      amount: 350.00,
      type: 'despesa',
      createdAt: '2025-09-22T14:30:00Z',
      updatedAt: '2025-09-22T14:30:00Z',
    },
    {
          id: '1',
          date: '2025-09-20',
          description: 'Venda - Kit 3 Velas Aromáticas',
          category: 'Vendas',
          amount: 234.90,
          type: 'receita',
          tipoReceita: 'varejo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          date: '2025-09-19',
          description: 'Compra - Cera de Soja Premium',
          category: 'Matéria Prima',
          amount: 450.00,
          type: 'despesa',
          tipoDespesa: 'variavel',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '3',
          date: '2025-09-18',
          description: 'Venda - Vela Decorativa Rose Gold',
          category: 'Vendas',
          amount: 124.90,
          type: 'receita',
          tipoReceita: 'atacado',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '4',
          date: '2025-09-17',
          description: 'Frete - Envio Pedidos',
          category: 'Logística',
          amount: 35.50,
          type: 'despesa',
          tipoDespesa: 'fixo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
    {
      id: '4',
      date: '2025-09-21',
      description: 'Frete - Correios',
      category: 'Logística',
      amount: 25.50,
      type: 'despesa',
      createdAt: '2025-09-21T09:15:00Z',
      updatedAt: '2025-09-21T09:15:00Z',
    },
  ],
  products: [
    {
      id: '1',
      name: 'Vela Aromática Lavanda',
      category: 'Aromática',
      price: 89.90,
      cost: 35.50,
      stock: 25,
      sold: 156,
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-09-23T10:00:00Z',
    },
    {
      id: '2',
      name: 'Vela Decorativa Rose Gold',
      category: 'Decorativa',
      price: 124.90,
      cost: 48.20,
      stock: 12,
      sold: 89,
      createdAt: '2025-02-01T11:30:00Z',
      updatedAt: '2025-09-20T15:20:00Z',
    },
    {
      id: '3',
      name: 'Kit 3 Velas Pequenas',
      category: 'Kit',
      price: 234.90,
      cost: 89.50,
      stock: 8,
      sold: 45,
      createdAt: '2025-03-10T14:00:00Z',
      updatedAt: '2025-09-18T12:10:00Z',
    },
    {
      id: '4',
      name: 'Vela Citronela Anti-Inseto',
      category: 'Funcional',
      price: 67.90,
      cost: 25.30,
      stock: 18,
      sold: 78,
      createdAt: '2025-04-05T09:45:00Z',
      updatedAt: '2025-09-22T18:30:00Z',
    },
  ],
}

class LocalDatabase {
  private getStoredData(): DatabaseState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error)
    }
    return initialData
  }

  private saveData(data: DatabaseState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }

  // Transactions
  getTransactions(): Transaction[] {
    return this.getStoredData().transactions
  }

  addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction {
    const data = this.getStoredData()
    const now = new Date().toISOString()
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    }
    data.transactions.unshift(newTransaction) // Add to beginning
    this.saveData(data)
    return newTransaction
  }

  updateTransaction(id: string, updates: Partial<Transaction>): Transaction | null {
    const data = this.getStoredData()
    const index = data.transactions.findIndex(t => t.id === id)
    if (index === -1) return null

    data.transactions[index] = {
      ...data.transactions[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    this.saveData(data)
    return data.transactions[index]
  }

  deleteTransaction(id: string): boolean {
    const data = this.getStoredData()
    const index = data.transactions.findIndex(t => t.id === id)
    if (index === -1) return false

    data.transactions.splice(index, 1)
    this.saveData(data)
    return true
  }

  // Products
  getProducts(): Product[] {
    return this.getStoredData().products
  }

  addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const data = this.getStoredData()
    const now = new Date().toISOString()
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    }
    data.products.push(newProduct)
    this.saveData(data)
    return newProduct
  }

  updateProduct(id: string, updates: Partial<Product>): Product | null {
    const data = this.getStoredData()
    const index = data.products.findIndex(p => p.id === id)
    if (index === -1) return null

    data.products[index] = {
      ...data.products[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    this.saveData(data)
    return data.products[index]
  }

  deleteProduct(id: string): boolean {
    const data = this.getStoredData()
    const index = data.products.findIndex(p => p.id === id)
    if (index === -1) return false

    data.products.splice(index, 1)
    this.saveData(data)
    return true
  }

  // Initialize with sample data if empty
  initializeData(): void {
    if (!localStorage.getItem(STORAGE_KEY)) {
      this.saveData(initialData)
    }
  }

  // Clear all data (for reset)
  clearData(): void {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export const database = new LocalDatabase()

// Initialize data on import
database.initializeData()
