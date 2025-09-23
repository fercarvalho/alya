import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Product } from '../types'
import { database } from '../lib/database'

interface ProductContextType {
  products: Product[]
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateProduct: (id: string, updates: Partial<Product>) => void
  deleteProduct: (id: string) => void
  refreshProducts: () => void
}

const ProductContext = createContext<ProductContextType | undefined>(undefined)

export const useProducts = () => {
  const context = useContext(ProductContext)
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider')
  }
  return context
}

interface ProductProviderProps {
  children: ReactNode
}

export const ProductProvider: React.FC<ProductProviderProps> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([])

  const refreshProducts = () => {
    setProducts(database.getProducts())
  }

  useEffect(() => {
    refreshProducts()
  }, [])

  const addProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    database.addProduct(productData)
    refreshProducts()
  }

  const updateProduct = (id: string, updates: Partial<Product>) => {
    database.updateProduct(id, updates)
    refreshProducts()
  }

  const deleteProduct = (id: string) => {
    database.deleteProduct(id)
    refreshProducts()
  }

  const value: ProductContextType = {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    refreshProducts,
  }

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  )
}
