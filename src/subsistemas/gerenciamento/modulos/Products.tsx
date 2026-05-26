// =============================================================================
// Products — módulo de Produtos (Fase 1.6.1 do alya)
// =============================================================================
//
// Extraído de App.tsx > renderProducts() (linhas ~5652-6027 antes da reorg).
// Comportamento 100% preservado — mesma estrutura, mesmas interações. Mudou
// só que agora vive em componente isolado, com props explícitas em vez de
// closure sobre o state do AppContent.
//
// Helpers de sort/filter (handleProductSort, getFilteredAndSortedProducts,
// etc) são usados em vários lugares do AppContent — continuam definidos lá
// e passam como prop pra cá. Mover eles inteiramente é trabalho maior que
// fica pra refactor futuro (ou pra Context).
// =============================================================================

import type React from 'react';
import { Package, Download, Plus, Filter, Edit, Trash2 } from 'lucide-react';

interface ProductFilters {
  category: string;
  stockFilter: string;
  soldFilter: string;
  costFilter: string;
}

interface ProductsProps {
  products: any[];
  setProducts: React.Dispatch<React.SetStateAction<any[]>>;
  productFilters: ProductFilters;
  setProductFilters: React.Dispatch<React.SetStateAction<ProductFilters>>;
  selectedProducts: Set<string>;
  selectAllProductsRef: React.RefObject<HTMLInputElement>;
  // Setters de modais (cross-module)
  setIsExportProdutosModalOpen: (v: boolean) => void;
  setIsImportExportModalOpen: (v: boolean) => void;
  setImportExportType: (v: 'transactions' | 'products') => void;
  setIsProductModalOpen: (v: boolean) => void;
  // Handlers de filtro/sort
  clearProductFilters: () => void;
  getFilteredAndSortedProducts: () => any[];
  handleSelectAllProducts: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectProduct: (id: string) => void;
  handleProductSort: (field: string) => void;
  getProductSortIcon: (field: string) => React.ReactNode;
  getProductSortAriaSort: (field: string) => 'ascending' | 'descending' | 'none';
  // Handlers de CRUD
  handleEditProduct: (p: any) => void;
  deleteProduct: (id: string) => Promise<boolean>;
  handleDeleteSelectedProducts: () => void;
}

export default function Products({
  products,
  setProducts,
  productFilters,
  setProductFilters,
  selectedProducts,
  selectAllProductsRef,
  setIsExportProdutosModalOpen,
  setIsImportExportModalOpen,
  setImportExportType,
  setIsProductModalOpen,
  clearProductFilters,
  getFilteredAndSortedProducts,
  handleSelectAllProducts,
  handleSelectProduct,
  handleProductSort,
  getProductSortIcon,
  getProductSortAriaSort,
  handleEditProduct,
  deleteProduct,
  handleDeleteSelectedProducts,
}: ProductsProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Package className="w-8 h-8 text-purple-600" />
          Produtos
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => setIsExportProdutosModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Download className="h-5 w-5" />
            Exportar PDF
          </button>
          <button
            onClick={() => {
              setImportExportType('products');
              setIsImportExportModalOpen(true);
            }}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Download className="h-5 w-5" />
            Importar/Exportar
          </button>
          <button
            onClick={() => setIsProductModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Plus className="h-5 w-5" />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Filtros de Produtos */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 p-4 rounded-lg border border-amber-200 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
          {/* Título */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
              FILTRE SEUS ITENS:
            </h2>
          </div>

          {/* Campos de Filtro */}
          <div className="flex items-end gap-1 sm:gap-2 md:gap-3 lg:gap-4 flex-1">
            {/* Filtro Categoria */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="product-category-filter" className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">
                Categoria
              </label>
              <input
                id="product-category-filter"
                name="product-category-filter"
                type="text"
                placeholder="Categoria..."
                value={productFilters.category}
                onChange={(e) =>
                  setProductFilters((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full"
              />
            </div>

            {/* Filtro Estoque */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="product-stock-filter" className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">
                Estoque
              </label>

              <select
                id="product-stock-filter"
                name="product-stock-filter"
                value={productFilters.stockFilter}
                onChange={(e) =>
                  setProductFilters((prev) => ({
                    ...prev,
                    stockFilter: e.target.value,
                  }))
                }
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full"
              >
                <option value="">Todos os estoques</option>
                <option value="inStock">Em estoque</option>
                <option value="outOfStock">Sem estoque</option>
              </select>
            </div>

            {/* Filtro Vendidos */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="product-sold-filter" className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">
                Vendidos
              </label>

              <select
                id="product-sold-filter"
                name="product-sold-filter"
                value={productFilters.soldFilter}
                onChange={(e) =>
                  setProductFilters((prev) => ({
                    ...prev,
                    soldFilter: e.target.value,
                  }))
                }
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full"
              >
                <option value="">Todos os vendidos</option>
                <option value="sold">Vendidos</option>
                <option value="notSold">Não vendidos</option>
              </select>
            </div>

            {/* Filtro Preço de Custo */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="product-cost-filter" className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">
                Preço de Custo
              </label>

              <select
                id="product-cost-filter"
                name="product-cost-filter"
                value={productFilters.costFilter}
                onChange={(e) =>
                  setProductFilters((prev) => ({
                    ...prev,
                    costFilter: e.target.value,
                  }))
                }
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full"
              >
                <option value="">Todos os custos</option>
                <option value="withCost">Com preço de custo</option>
                <option value="withoutCost">Sem preço de custo</option>
              </select>
            </div>
          </div>

          {/* Botão Limpar Filtros */}
          <div className="lg:ml-auto">
            <button
              onClick={clearProductFilters}
              className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm hover:bg-amber-700 transition-colors w-full lg:w-auto"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Produtos */}
      <div className="space-y-4">
        {products.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">Nenhum produto encontrado.</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
              Adicione seu primeiro produto clicando no botão "Novo Produto".
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Cabeçalho das Colunas */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/20 border-b border-amber-200 dark:border-amber-800/40 p-4">
              <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-3">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    ref={selectAllProductsRef}
                    checked={(() => {
                      const f = getFilteredAndSortedProducts();
                      return f.length > 0 && f.every((p) => selectedProducts.has(p.id));
                    })()}
                    onChange={handleSelectAllProducts}
                    className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                  />
                </div>
                <button
                  onClick={() => handleProductSort('name')}
                  aria-sort={getProductSortAriaSort('name')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-1 min-w-0"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
                    Nome
                  </p>
                  {getProductSortIcon('name')}
                </button>
                <button
                  onClick={() => handleProductSort('category')}
                  aria-sort={getProductSortAriaSort('category')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-20 sm:w-24"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide truncate">
                    Categoria
                  </p>
                  {getProductSortIcon('category')}
                </button>
                <button
                  onClick={() => handleProductSort('price')}
                  aria-sort={getProductSortAriaSort('price')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-20 sm:w-24"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
                    Preço
                  </p>
                  {getProductSortIcon('price')}
                </button>
                <button
                  onClick={() => handleProductSort('cost')}
                  aria-sort={getProductSortAriaSort('cost')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-16 sm:w-20"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
                    Custo
                  </p>
                  {getProductSortIcon('cost')}
                </button>
                <button
                  onClick={() => handleProductSort('stock')}
                  aria-sort={getProductSortAriaSort('stock')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-16 sm:w-20"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
                    Estoque
                  </p>
                  {getProductSortIcon('stock')}
                </button>
                <button
                  onClick={() => handleProductSort('sold')}
                  aria-sort={getProductSortAriaSort('sold')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-16 sm:w-20"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
                    Vendidos
                  </p>
                  {getProductSortIcon('sold')}
                </button>
                <div className="flex-shrink-0 w-16 sm:w-20 flex justify-center">
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
                    Ações
                  </p>
                </div>
              </div>
            </div>

            {getFilteredAndSortedProducts().length === 0 && products.length > 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Nenhum produto corresponde aos filtros aplicados.
              </div>
            )}
            {getFilteredAndSortedProducts().map((product, index, arr) => (
              <div
                key={product.id}
                className={`bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-4 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-all duration-200 ${
                  index === arr.length - 1 ? 'border-b-0' : ''
                }`}
              >
                <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-3">
                  {/* Checkbox */}
                  <div className="flex-shrink-0 text-left">
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                    />
                  </div>
                  {/* Nome */}
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                      {product.name}
                    </h3>
                  </div>

                  {/* Categoria */}
                  <div className="flex-shrink-0 w-20 sm:w-24 text-center">
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-0.5 sm:px-1 py-0.5 rounded-md truncate">
                      {product.category}
                    </span>
                  </div>

                  {/* Preço */}
                  <div className="flex-shrink-0 w-20 sm:w-24 text-center">
                    <p className="text-xs sm:text-sm md:text-lg font-bold text-green-600 truncate">
                      R${' '}
                      {(Number(product.price) || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  {/* Custo */}
                  <div className="flex-shrink-0 w-16 sm:w-20 text-center">
                    <p className="text-xs sm:text-sm md:text-lg font-bold text-orange-600 truncate">
                      R${' '}
                      {(Number(product.cost) || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  {/* Estoque */}
                  <div className="flex-shrink-0 w-16 sm:w-20 text-center">
                    <p
                      className={`text-xs sm:text-sm md:text-lg font-bold ${product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-yellow-600' : 'text-red-600'} truncate`}
                    >
                      {product.stock}
                    </p>
                  </div>

                  {/* Vendidos */}
                  <div className="flex-shrink-0 w-16 sm:w-20 text-center">
                    <p className="text-xs sm:text-sm md:text-lg font-bold text-blue-600 truncate">
                      {product.sold}
                    </p>
                  </div>

                  {/* Ações */}
                  <div className="flex-shrink-0 w-16 sm:w-20 flex gap-0.5 sm:gap-1 justify-center">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="p-0.5 sm:p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200"
                      title="Editar produto"
                    >
                      <Edit className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                    <button
                      onClick={async () => {
                        if (
                          confirm(
                            'Tem certeza que deseja excluir este produto?',
                          )
                        ) {
                          try {
                            const success = await deleteProduct(product.id);
                            if (success) {
                              setProducts((prev) =>
                                prev.filter((p) => p.id !== product.id),
                              );
                            }
                          } catch (error) {
                            console.error('Erro ao deletar produto:', error);
                          }
                        }
                      }}
                      className="p-0.5 sm:p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-all duration-200"
                      title="Excluir produto"
                    >
                      <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Botão de Deletar Selecionados */}
            {selectedProducts.size > 0 && (
              <div className="flex justify-end p-4 bg-red-50 border-t border-red-200">
                <button
                  onClick={handleDeleteSelectedProducts}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Trash2 className="h-4 w-4" />
                  Deletar Selecionado{selectedProducts.size > 1 ? 's' : ''} (
                  {selectedProducts.size})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
