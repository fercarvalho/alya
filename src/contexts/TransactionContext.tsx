import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Transaction } from '../types'
import { database } from '../lib/database'

interface TransactionContextType {
  transactions: Transaction[]
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  refreshTransactions: () => void
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined)

export const useTransactions = () => {
  const context = useContext(TransactionContext)
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider')
  }
  return context
}

interface TransactionProviderProps {
  children: ReactNode
}

export const TransactionProvider: React.FC<TransactionProviderProps> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const refreshTransactions = () => {
    setTransactions(database.getTransactions())
  }

  useEffect(() => {
    refreshTransactions()
  }, [])

  const addTransaction = (transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    database.addTransaction(transactionData)
    refreshTransactions()
  }

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    database.updateTransaction(id, updates)
    refreshTransactions()
  }

  const deleteTransaction = (id: string) => {
    database.deleteTransaction(id)
    refreshTransactions()
  }

  const value: TransactionContextType = {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refreshTransactions,
  }

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  )
}
