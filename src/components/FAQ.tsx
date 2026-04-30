import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Search, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface FAQItem {
  id: string;
  pergunta: string;
  resposta: string;
  ordem: number;
  visibility: 'todos' | 'usuarios' | 'admins';
}

const FAQ: React.FC = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<FAQItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}/faq`, { headers });
        const result = await res.json();
        if (result.success) setItems(result.data);
      } catch (e) {
        console.error('Erro ao carregar FAQ:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [token]);

  const itemsFiltrados = items.filter(item =>
    busca.trim() === '' ||
    item.pergunta.toLowerCase().includes(busca.toLowerCase()) ||
    item.resposta.toLowerCase().includes(busca.toLowerCase())
  );

  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id);

  return (
    <div className="px-6 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-400 rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 rounded-xl p-3">
            <HelpCircle className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Perguntas Frequentes</h1>
            <p className="text-white/80 text-sm mt-0.5">
              Encontre respostas para as dúvidas mais comuns sobre o sistema
            </p>
          </div>
        </div>
      </div>

      {/* Campo de busca */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar pergunta ou resposta..."
          className="w-full pl-11 pr-4 py-3 bg-white dark:!bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm outline-none dark:text-gray-100 dark:placeholder-gray-400"
        />
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-400">Carregando...</div>
        </div>
      ) : itemsFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <HelpCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {busca
              ? 'Nenhuma pergunta encontrada para a busca'
              : 'Nenhuma pergunta disponível'}
          </p>
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              Limpar busca
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {itemsFiltrados.map(item => (
            <div
              key={item.id}
              className={`rounded-2xl border shadow-sm overflow-hidden ${
                item.visibility === 'admins'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              <button
                onClick={() => toggle(item.id)}
                className={`w-full flex items-center justify-between gap-4 p-5 text-left transition-colors ${
                  item.visibility === 'admins'
                    ? 'hover:bg-red-100/60'
                    : 'hover:bg-amber-50/50'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-semibold text-gray-900 text-sm leading-snug">
                    {item.pergunta}
                  </span>
                  {item.visibility === 'admins' && (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      <ShieldCheck className="h-3 w-3" />
                      Admin
                    </span>
                  )}
                </div>
                {openId === item.id ? (
                  <ChevronUp className={`h-5 w-5 flex-shrink-0 ${item.visibility === 'admins' ? 'text-red-400' : 'text-amber-500'}`} />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {openId === item.id && (
                <div className={`px-5 pb-5 pt-0 border-t ${item.visibility === 'admins' ? 'border-red-200' : 'border-amber-100'}`}>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap pt-4">
                    {item.resposta}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-6">
          {itemsFiltrados.length} de {items.length}{' '}
          {items.length === 1 ? 'pergunta' : 'perguntas'}
        </p>
      )}
    </div>
  );
};

export default FAQ;
