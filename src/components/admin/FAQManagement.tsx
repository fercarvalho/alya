import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, ChevronUp, ChevronDown, Eye, EyeOff,
  HelpCircle, Save, X, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';

interface FAQItem {
  id: string;
  pergunta: string;
  resposta: string;
  ativo: boolean;
  ordem: number;
  createdAt: string;
  updatedAt: string;
}

const FAQManagement: React.FC = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<FAQItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);
  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Fechar modais com ESC
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (deleteConfirm) { setDeleteConfirm(null); return; }
    if (showModal && !isSaving) { setShowModal(false); }
  }, [showModal, isSaving, deleteConfirm]);

  useEffect(() => {
    if (showModal || deleteConfirm) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal, deleteConfirm, handleKeyDown]);

  const loadItems = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/faq`, { headers: authHeaders });
      const result = await res.json();
      if (result.success) setItems(result.data);
    } catch (e) {
      console.error('Erro ao carregar FAQ:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditingItem(null);
    setPergunta('');
    setResposta('');
    setError('');
    setShowModal(true);
  };

  const openEdit = (item: FAQItem) => {
    setEditingItem(item);
    setPergunta(item.pergunta);
    setResposta(item.resposta);
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!pergunta.trim() || !resposta.trim()) {
      setError('Pergunta e resposta são obrigatórias.');
      return;
    }
    setIsSaving(true);
    try {
      const url = editingItem
        ? `${API_BASE_URL}/admin/faq/${editingItem.id}`
        : `${API_BASE_URL}/admin/faq`;
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify({ pergunta: pergunta.trim(), resposta: resposta.trim() }),
      });
      const result = await res.json();
      if (result.success) {
        setShowModal(false);
        loadItems();
      } else {
        setError(result.error || 'Erro ao salvar.');
      }
    } catch {
      setError('Erro de conexão.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAtivo = async (item: FAQItem) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/faq/${item.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ ativo: !item.ativo }),
      });
      const result = await res.json();
      if (result.success) loadItems();
    } catch (e) {
      console.error('Erro ao alterar status:', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/faq/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const result = await res.json();
      if (result.success) {
        setDeleteConfirm(null);
        loadItems();
      }
    } catch (e) {
      console.error('Erro ao deletar:', e);
    }
  };

  const handleMover = async (index: number, direcao: 'cima' | 'baixo') => {
    const novoArray = [...items];
    const troca = direcao === 'cima' ? index - 1 : index + 1;
    if (troca < 0 || troca >= novoArray.length) return;
    [novoArray[index], novoArray[troca]] = [novoArray[troca], novoArray[index]];
    setItems(novoArray);
    try {
      await fetch(`${API_BASE_URL}/admin/faq/ordem`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ faqIds: novoArray.map(i => i.id) }),
      });
    } catch (e) {
      console.error('Erro ao reordenar:', e);
      loadItems();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Carregando FAQ...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 rounded-xl p-2">
            <HelpCircle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Gerenciar FAQ</h2>
            <p className="text-sm text-gray-500">
              {items.length} {items.length === 1 ? 'item cadastrado' : 'itens cadastrados'}
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-xl font-semibold text-sm shadow hover:from-amber-500 hover:to-orange-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          Nova Pergunta
        </button>
      </div>

      {/* Lista de itens */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <HelpCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma pergunta cadastrada</p>
          <p className="text-gray-400 text-sm mt-1">Clique em "Nova Pergunta" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border-2 p-5 flex gap-4 items-start transition-all ${
                item.ativo ? 'border-gray-200' : 'border-gray-100 opacity-60'
              }`}
            >
              {/* Botões de ordem */}
              <div className="flex flex-col gap-1 flex-shrink-0 pt-0.5">
                <button
                  onClick={() => handleMover(index, 'cima')}
                  disabled={index === 0}
                  className="p-1 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Mover para cima"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleMover(index, 'baixo')}
                  disabled={index === items.length - 1}
                  className="p-1 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Mover para baixo"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-semibold text-gray-900 leading-snug">{item.pergunta}</p>
                  <span
                    className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      item.ativo
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-gray-500 text-sm line-clamp-2">{item.resposta}</p>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggleAtivo(item)}
                  className="p-2 rounded-xl text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                  title={item.ativo ? 'Desativar' : 'Ativar'}
                >
                  {item.ativo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => openEdit(item)}
                  className="p-2 rounded-xl text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                  title="Editar"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(item.id)}
                  className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Deletar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {showModal && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 pb-4 pt-[180px]"
          onClick={e => { if (e.target === e.currentTarget && !isSaving) setShowModal(false); }}
        >
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 w-full max-w-lg max-h-[calc(100vh-220px)] overflow-y-auto shadow-2xl border border-gray-200/50">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                  <HelpCircle className="w-6 h-6 text-amber-700" />
                  {editingItem ? 'Editar Pergunta' : 'Nova Pergunta'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                  className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-2 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Campos */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pergunta <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={pergunta}
                  onChange={e => setPergunta(e.target.value)}
                  placeholder="Ex: Como funciona o sistema de relatórios?"
                  disabled={isSaving}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Resposta <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={resposta}
                  onChange={e => setResposta(e.target.value)}
                  placeholder="Descreva a resposta de forma clara e objetiva..."
                  rows={5}
                  disabled={isSaving}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm resize-none disabled:opacity-50"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Botões */}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 mt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSaving}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 transition-all shadow-sm flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 pb-4 pt-[180px]"
          onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
        >
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-200/50 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirmar Exclusão</h3>
            <p className="text-gray-500 text-sm mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-sm"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQManagement;
