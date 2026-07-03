// =============================================================================
// Transactions — módulo de Transações (Fase 1.6.2 do alya)
// =============================================================================
//
// Extraído de App.tsx > renderTransactions() (linhas ~4828-5353 antes da reorg).
// Comportamento 100% preservado.
//
// Esta é a maior extração da Fase 1.6 até agora (~32 props). Helpers como
// getFilteredAndSortedTransactions, handleSort, etc são usados em outros
// lugares do AppContent — continuam definidos lá e passam como prop pra cá.
// Os sub-renderers renderFilterCalendarFrom/To também são funções do AppContent
// (manipulam state local do calendário); passados como prop e chamados aqui.
// =============================================================================

import type React from 'react';
import {
  DollarSign,
  MoreHorizontal,
  Upload,
  Download,
  Settings,
  Plus,
  Filter,
  X,
  Calendar,
  Trash2,
  Edit,
  Link2,
} from 'lucide-react';
import PendingTransactionsBanner from '@/components/PendingTransactionsBanner';
import { type TransactionType, TRANSACTION_TYPE_STYLES } from '@/types/transactionType';

// Rótulo + estilo do badge de ORIGEM da transação (migration 026).
const SOURCE_LABELS: Record<string, { label: string; badge: string }> = {
  manual:      { label: 'Manual',   badge: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  import_xlsx: { label: 'Planilha', badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' },
  extrato:     { label: 'Extrato',  badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
  fatura:      { label: 'Fatura',   badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300' },
  nuvemshop:   { label: 'Nuvemshop', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  bling:       { label: 'Bling',    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  infinitepay: { label: 'InfinitePay', badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
};
const getSourceMeta = (s: string | null | undefined) => SOURCE_LABELS[s || 'manual'] || SOURCE_LABELS.manual;

interface TransactionFilters {
  type: string;
  category: string;
  dateFrom: string;
  dateTo: string;
  hasDateFilter: boolean;
  description: string;
  source: string;
}

interface TransactionsProps {
  // State
  transactions: any[];
  setTransactions: React.Dispatch<React.SetStateAction<any[]>>;
  transactionFilters: TransactionFilters;
  setTransactionFilters: React.Dispatch<React.SetStateAction<TransactionFilters>>;
  selectedTransactions: Set<string>;
  showHiddenTransactions: boolean;
  setShowHiddenTransactions: (v: boolean) => void;
  // Refs
  actionsMenuRef: React.RefObject<HTMLDivElement>;
  selectAllTransactionsRef: React.RefObject<HTMLInputElement>;
  // Action menu state
  isActionsMenuOpen: boolean;
  setIsActionsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  // Modal setters (cross-module)
  setImportType: (v: any) => void;
  setSelectedBank: (v: any) => void;
  setExtratoStep: React.Dispatch<React.SetStateAction<0 | 1 | 2 | 3>>;
  setExtratoFile: (v: any) => void;
  setIsImportExtratoModalOpen: (v: boolean) => void;
  setIsExportTransacoesModalOpen: (v: boolean) => void;
  setImportExportType: (v: 'transactions' | 'products') => void;
  setIsImportExportModalOpen: (v: boolean) => void;
  setIsRulesModalOpen: (v: boolean) => void;
  setIsManageSubcategoriesOpen: (v: boolean) => void;
  setIsTransactionModalOpen: (v: boolean) => void;
  setResolveTarget: (v: { id: string; description: string } | null) => void;
  // Calendar filter state
  isFilterCalendarFromOpen: boolean;
  isFilterCalendarToOpen: boolean;
  handleFilterCalendarFromToggle: () => void;
  handleFilterCalendarToToggle: () => void;
  renderFilterCalendarFrom: () => React.ReactNode;
  renderFilterCalendarTo: () => React.ReactNode;
  // Handlers
  clearTransactionFilters: () => void;
  getFilteredAndSortedTransactions: () => any[];
  handleSelectAllTransactions: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectTransaction: (id: string) => void;
  handleSort: (field: string) => void;
  getSortIcon: (field: string) => React.ReactNode;
  getTransactionSortAriaSort: (field: string) => 'ascending' | 'descending' | 'none';
  handleEditTransaction: (t: any) => void;
  handleDeleteSelectedTransactions: () => void;
  deleteTransaction: (id: string) => Promise<boolean>;
  // PM: vínculo a projeto
  projectsMap?: Record<string, string>;
  onLinkBulk?: () => void;
  // Helpers
  getCategoriesByType: (type: string) => string[];
  formatDateToDisplay: (date: string) => string;
}

const isReceita = (type: string) => /receita/i.test(type || '');

export default function Transactions({
  transactions,
  setTransactions,
  transactionFilters,
  setTransactionFilters,
  selectedTransactions,
  showHiddenTransactions,
  setShowHiddenTransactions,
  actionsMenuRef,
  selectAllTransactionsRef,
  isActionsMenuOpen,
  setIsActionsMenuOpen,
  setImportType,
  setSelectedBank,
  setExtratoStep,
  setExtratoFile,
  setIsImportExtratoModalOpen,
  setIsExportTransacoesModalOpen,
  setImportExportType,
  setIsImportExportModalOpen,
  setIsRulesModalOpen,
  setIsManageSubcategoriesOpen,
  setIsTransactionModalOpen,
  setResolveTarget,
  isFilterCalendarFromOpen,
  isFilterCalendarToOpen,
  handleFilterCalendarFromToggle,
  handleFilterCalendarToToggle,
  renderFilterCalendarFrom,
  renderFilterCalendarTo,
  clearTransactionFilters,
  getFilteredAndSortedTransactions,
  handleSelectAllTransactions,
  handleSelectTransaction,
  handleSort,
  getSortIcon,
  getTransactionSortAriaSort,
  handleEditTransaction,
  handleDeleteSelectedTransactions,
  deleteTransaction,
  getCategoriesByType,
  formatDateToDisplay,
  projectsMap = {},
  onLinkBulk,
}: TransactionsProps) {
  return (
    <div className="space-y-6">
      <PendingTransactionsBanner />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-600" />
          Transações
        </h1>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Dropdown "Ações" — agrupa importar/exportar/regras */}
          <div className="relative" ref={actionsMenuRef}>
            <button
              type="button"
              onClick={() => setIsActionsMenuOpen((o) => !o)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-white hover:bg-amber-50 text-amber-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-amber-300 font-semibold rounded-xl border-2 border-amber-500 hover:border-amber-600 dark:border-amber-400 shadow-sm transition-all duration-200"
              aria-haspopup="menu"
              aria-expanded={isActionsMenuOpen}
              title="Mais ações"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="hidden sm:inline">Ações</span>
            </button>

            {isActionsMenuOpen && (
              <div role="menu" className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-40 overflow-hidden">
                <button
                  role="menuitem"
                  onClick={() => {
                    setImportType(null);
                    setSelectedBank(null);
                    setExtratoStep(0);
                    setExtratoFile(null);
                    setIsImportExtratoModalOpen(true);
                    setIsActionsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Upload className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  Importar Extrato
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setIsExportTransacoesModalOpen(true); setIsActionsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  <Download className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  Exportar PDF
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setImportExportType('transactions');
                    setIsImportExportModalOpen(true);
                    setIsActionsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  <Download className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  Importar / Exportar Excel
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setIsRulesModalOpen(true); setIsActionsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors border-t border-gray-100 dark:border-gray-700"
                >
                  <Settings className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  Conjunto de Regras
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setIsManageSubcategoriesOpen(true); setIsActionsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors border-t border-gray-100 dark:border-gray-700"
                >
                  <Settings className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  Gerenciar Subcategorias
                </button>
              </div>
            )}
          </div>

          {/* Botão primário: Nova Transação */}
          <button
            onClick={() => setIsTransactionModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-semibold rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <Plus className="h-5 w-5" />
            Nova Transação
          </button>
        </div>
      </div>

      {/* Filtros de Transações */}
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
            {/* Busca por descrição */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="transaction-description-filter" className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">
                Buscar
              </label>
              <div className="relative">
                <input
                  id="transaction-description-filter"
                  name="transaction-description-filter"
                  type="text"
                  placeholder="Nome da transação..."
                  value={transactionFilters.description}
                  onChange={(e) =>
                    setTransactionFilters((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full pr-7"
                />
                {transactionFilters.description && (
                  <button
                    type="button"
                    onClick={() => setTransactionFilters((prev) => ({ ...prev, description: '' }))}
                    className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtro Tipo */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="transaction-type-filter" className="text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate truncate">
                Tipo
              </label>
              <select
                id="transaction-type-filter"
                name="transaction-type-filter"
                value={transactionFilters.type}
                onChange={(e) =>
                  setTransactionFilters((prev) => ({
                    ...prev,
                    type: e.target.value,
                    category: '', // Limpar categoria quando tipo mudar
                  }))
                }
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full"
              >
                <option value="">Todos os tipos</option>
                <option value="Receita">Receitas</option>
                <option value="Despesa">Despesas</option>
                <option value="Reforço de caixa">Reforço de caixa</option>
                <option value="Retirada de caixa">Retirada de caixa</option>
                <option value="Transferência entre contas">Transferências</option>
                <option value="A confirmar">A confirmar</option>
              </select>
            </div>

            {/* Filtro Origem */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="transaction-source-filter" className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">
                Origem
              </label>
              <select
                id="transaction-source-filter"
                name="transaction-source-filter"
                value={transactionFilters.source || ''}
                onChange={(e) => setTransactionFilters((prev) => ({ ...prev, source: e.target.value }))}
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full"
              >
                <option value="">Todas as origens</option>
                <option value="manual">Manual</option>
                <option value="import_xlsx">Planilha</option>
                <option value="extrato">Extrato</option>
                <option value="fatura">Fatura</option>
                <option value="nuvemshop">Nuvemshop</option>
                <option value="bling">Bling</option>
                <option value="infinitepay">InfinitePay</option>
              </select>
            </div>

            {/* Toggle: Mostrar ocultas (só aparece se houver alguma) */}
            {(() => {
              const hiddenCount = transactions.filter((t) => t.isHidden).length;
              if (hiddenCount === 0) return null;
              return (
                <div className="flex flex-col flex-shrink-0">
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate">&nbsp;</label>
                  <label className="flex items-center gap-2 px-3 py-2 border border-amber-300 dark:border-gray-600 rounded-md cursor-pointer bg-white dark:!bg-gray-700 text-xs sm:text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={showHiddenTransactions}
                      onChange={(e) => setShowHiddenTransactions(e.target.checked)}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    Mostrar ocultas ({hiddenCount})
                  </label>
                </div>
              );
            })()}

            {/* Filtro Categoria */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="transaction-category-filter" className="text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate truncate">
                Categoria
              </label>
              <select
                id="transaction-category-filter"
                name="transaction-category-filter"
                value={transactionFilters.category}
                onChange={(e) =>
                  setTransactionFilters((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 w-full"
              >
                <option value="">Todas as categorias</option>
                {transactionFilters.type ? (
                  getCategoriesByType(transactionFilters.type).map(
                    (category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ),
                  )
                ) : (
                  <>
                    {/* Opções para Receita */}
                    <optgroup label="Receita">
                      {getCategoriesByType('Receita').map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </optgroup>
                    {/* Opções para Despesa */}
                    <optgroup label="Despesa">
                      {getCategoriesByType('Despesa').map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
            </div>

            {/* Filtro Data Início */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="filter-date-from" className="text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate truncate">
                Data Início
              </label>
              <div className="relative">
                <input
                  id="filter-date-from"
                  name="filter-date-from"
                  type="text"
                  placeholder="Início"
                  value={
                    transactionFilters.dateFrom
                      ? formatDateToDisplay(transactionFilters.dateFrom)
                      : ''
                  }
                  readOnly
                  onClick={handleFilterCalendarFromToggle}
                  className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 cursor-pointer w-full"
                />
                <Calendar className="absolute right-1 sm:right-2 md:right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-amber-600 pointer-events-none" />
                {isFilterCalendarFromOpen && renderFilterCalendarFrom()}
              </div>
            </div>

            {/* Filtro Data Fim */}
            <div className="flex flex-col flex-1 min-w-0">
              <label htmlFor="filter-date-to" className="text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 truncate truncate">
                Data Fim
              </label>
              <div className="relative">
                <input
                  id="filter-date-to"
                  name="filter-date-to"
                  type="text"
                  placeholder="Fim"
                  value={
                    transactionFilters.dateTo
                      ? formatDateToDisplay(transactionFilters.dateTo)
                      : ''
                  }
                  readOnly
                  onClick={handleFilterCalendarToToggle}
                  className="px-1 sm:px-2 md:px-3 py-1 sm:py-2 border border-amber-300 dark:border-gray-600 rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:!bg-gray-700 dark:text-gray-100 cursor-pointer w-full"
                />
                <Calendar className="absolute right-1 sm:right-2 md:right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-amber-600 pointer-events-none" />
                {isFilterCalendarToOpen && renderFilterCalendarTo()}
              </div>
            </div>
          </div>

          {/* Botão Limpar Filtros */}
          <div className="lg:ml-auto">
            <button
              onClick={clearTransactionFilters}
              className="px-2 sm:px-3 md:px-4 py-1 sm:py-2 bg-amber-600 text-white rounded-md text-xs sm:text-sm hover:bg-amber-700 transition-colors w-full lg:w-auto"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Transações */}
      <div className="space-y-4">
        {transactions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">Nenhuma transação encontrada.</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
              Adicione sua primeira transação clicando no botão "Nova
              Transação".
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Ações (acima da lista) */}
            {selectedTransactions.size > 0 && (
              <div className="flex justify-end items-center gap-2 p-3 sm:p-4 bg-red-50 border-b border-red-200">
                {onLinkBulk && (
                  <button
                    onClick={onLinkBulk}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Link2 className="h-4 w-4" />
                    Vincular a projeto ({selectedTransactions.size})
                  </button>
                )}
                <button
                  onClick={handleDeleteSelectedTransactions}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Trash2 className="h-4 w-4" />
                  Deletar Selecionada{selectedTransactions.size > 1 ? 's' : ''}{' '}
                  ({selectedTransactions.size})
                </button>
              </div>
            )}

            {/* Cabeçalho das Colunas */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/20 border-b border-amber-200 dark:border-amber-800/40 p-4">
              <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-3 w-full">
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    ref={selectAllTransactionsRef}
                    checked={(() => {
                      const f = getFilteredAndSortedTransactions();
                      return f.length > 0 && f.every((t) => selectedTransactions.has(t.id));
                    })()}
                    onChange={handleSelectAllTransactions}
                    className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                  />
                </div>
                <button
                  onClick={() => handleSort('date')}
                  aria-sort={getTransactionSortAriaSort('date')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-20 sm:w-24"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide truncate">
                    Data
                  </p>
                  {getSortIcon('date')}
                </button>
                <button
                  onClick={() => handleSort('description')}
                  aria-sort={getTransactionSortAriaSort('description')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-1 min-w-0"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide truncate">
                    Descrição
                  </p>
                  {getSortIcon('description')}
                </button>
                <button
                  onClick={() => handleSort('type')}
                  aria-sort={getTransactionSortAriaSort('type')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-16 sm:w-20"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
                    Tipo
                  </p>
                  {getSortIcon('type')}
                </button>
                <button
                  onClick={() => handleSort('category')}
                  aria-sort={getTransactionSortAriaSort('category')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-20 sm:w-24"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide truncate">
                    Categoria
                  </p>
                  {getSortIcon('category')}
                </button>
                <button
                  onClick={() => handleSort('value')}
                  aria-sort={getTransactionSortAriaSort('value')}
                  className="flex items-center justify-center gap-1 hover:bg-amber-100 rounded px-1 sm:px-2 py-1 transition-colors flex-shrink-0 w-28 sm:w-32"
                >
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide whitespace-nowrap">
                    Valor
                  </p>
                  {getSortIcon('value')}
                </button>
                <div className="flex-shrink-0 w-16 sm:w-20 flex justify-center">
                  <p className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wide">
                    Ações
                  </p>
                </div>
              </div>
            </div>

            {getFilteredAndSortedTransactions().length === 0 && transactions.length > 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Nenhuma transação corresponde aos filtros aplicados.
              </div>
            )}
            {getFilteredAndSortedTransactions().map((transaction, index, arr) => {
              const txType = (transaction.type as TransactionType) in TRANSACTION_TYPE_STYLES
                ? (transaction.type as TransactionType)
                : (isReceita(transaction.type) ? 'Receita' : 'Despesa') as TransactionType;
              const style = TRANSACTION_TYPE_STYLES[txType];
              return (
                <div
                  key={transaction.id}
                  className={`bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-4 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-all duration-200 ${
                    index === arr.length - 1 ? 'border-b-0' : ''
                  } ${transaction.isHidden ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-3 w-full">
                    {/* Checkbox */}
                    <div className="flex-shrink-0 text-left">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.has(transaction.id)}
                        onChange={() => handleSelectTransaction(transaction.id)}
                        className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                      />
                    </div>

                    {/* Data */}
                    <div className="flex-shrink-0 w-20 sm:w-24 text-left">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                        {formatDateToDisplay(transaction.date)}
                      </p>
                    </div>

                    {/* Descrição */}
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                        {transaction.isHidden && (
                          <span
                            className="inline-block mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200"
                            title="Ocultada por regra"
                          >
                            OCULTA
                          </span>
                        )}
                        {transaction.description}
                      </h3>
                      {/* Origem da transação (migration 026) */}
                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${getSourceMeta(transaction.source).badge}`} title={`Origem: ${getSourceMeta(transaction.source).label}`}>
                        {getSourceMeta(transaction.source).label}
                      </span>
                      {/* PM: projeto vinculado */}
                      {transaction.project_id && (
                        <span className="inline-block mt-0.5 ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" title="Projeto vinculado">
                          {projectsMap[transaction.project_id] || 'Projeto'}
                        </span>
                      )}
                    </div>

                    {/* Tipo */}
                    <div className="flex-shrink-0 w-16 sm:w-20 text-center">
                      {transaction.type === 'A confirmar' ? (
                        <button
                          onClick={() =>
                            setResolveTarget({
                              id: transaction.id,
                              description: transaction.description,
                            })
                          }
                          className={`px-0.5 sm:px-1 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:ring-2 hover:ring-purple-400 ${style.badge}`}
                          title="Clique para confirmar esta transação"
                        >
                          {transaction.type}
                        </button>
                      ) : (
                        <span
                          className={`px-0.5 sm:px-1 py-0.5 rounded-full text-xs font-medium ${style.badge}`}
                          title={transaction.type}
                        >
                          {transaction.type}
                        </span>
                      )}
                    </div>

                    {/* Categoria */}
                    <div className="flex-shrink-0 w-20 sm:w-24 text-center">
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-0.5 sm:px-1 py-0.5 rounded-md truncate">
                        {transaction.category || <span className="italic text-gray-400 dark:text-gray-500">Sem categoria</span>}
                      </span>
                    </div>

                    {/* Valor */}
                    <div className="flex-shrink-0 w-28 sm:w-32 text-center">
                      <p
                        className={`text-xs sm:text-sm md:text-lg font-bold whitespace-nowrap ${style.valueText}`}
                      >
                        {style.sign}R${' '}
                        {(Number(transaction.value) || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex-shrink-0 w-16 sm:w-20 flex gap-0.5 sm:gap-1 justify-center">
                      <button
                        onClick={() => handleEditTransaction(transaction)}
                        className="p-0.5 sm:p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200"
                        title="Editar transação"
                      >
                        <Edit className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </button>
                      <button
                        onClick={async () => {
                          if (
                            confirm(
                              'Tem certeza que deseja excluir esta transação?',
                            )
                          ) {
                            try {
                              const success = await deleteTransaction(
                                transaction.id,
                              );
                              if (success) {
                                setTransactions((prev) =>
                                  prev.filter((t) => t.id !== transaction.id),
                                );
                              }
                            } catch (error) {
                              console.error('Erro ao deletar transação:', error);
                            }
                          }
                        }}
                        className="p-0.5 sm:p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-all duration-200"
                        title="Excluir transação"
                      >
                        <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
