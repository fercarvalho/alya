import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Filter, RefreshCw, AlertCircle,
  HelpCircle, TrendingUp, Lightbulb, ThumbsDown,
  Clock, CheckCircle, MessageCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';
import FeedbackDetailModal from './FeedbackDetailModal';

export interface Feedback {
  id: string;
  categoria: 'duvida' | 'melhoria' | 'sugestao' | 'critica';
  descricao: string;
  imagemBase64: string | null;
  linkVideo: string | null;
  pagina: string | null;
  status: 'pendente' | 'respondido' | 'aceito';
  resposta: string | null;
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string;
  createdAt: string;
  updatedAt: string;
  roadmapItemId: string | null;
}

const CATEGORIA_CONFIG = {
  duvida: { label: 'Dúvida', icon: HelpCircle, bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  melhoria: { label: 'Melhoria', icon: TrendingUp, bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  sugestao: { label: 'Sugestão', icon: Lightbulb, bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  critica: { label: 'Crítica', icon: ThumbsDown, bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
};

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', icon: Clock, bg: 'bg-gray-100', text: 'text-gray-600' },
  respondido: { label: 'Respondido', icon: MessageCircle, bg: 'bg-blue-100', text: 'text-blue-700' },
  aceito: { label: 'Aceito', icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-700' },
};

const FeedbackManagement: React.FC = () => {
  const { token } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');

  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const carregarFeedbacks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await fetch(`${API_BASE_URL}/admin/feedbacks`, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.data);
      } else {
        setError(data.error || 'Erro ao carregar feedbacks.');
      }
    } catch {
      setError('Erro de conexão ao carregar feedbacks.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    carregarFeedbacks();
  }, [carregarFeedbacks]);

  const feedbacksFiltrados = feedbacks.filter(f => {
    if (filtroCategoria && f.categoria !== filtroCategoria) return false;
    if (filtroStatus && f.status !== filtroStatus) return false;
    return true;
  });

  const formatarData = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const contadores = {
    total: feedbacks.length,
    pendente: feedbacks.filter(f => f.status === 'pendente').length,
    respondido: feedbacks.filter(f => f.status === 'respondido').length,
    aceito: feedbacks.filter(f => f.status === 'aceito').length,
  };

  return (
    <div className="space-y-6">
      {/* Header com contadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: contadores.total, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
          { label: 'Pendentes', value: contadores.pendente, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
          { label: 'Respondidos', value: contadores.respondido, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
          { label: 'Aceitos', value: contadores.aceito, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} border ${card.border} rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>

          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-amber-400"
          >
            <option value="">Todas as categorias</option>
            {Object.entries(CATEGORIA_CONFIG).map(([id, cfg]) => (
              <option key={id} value={id}>{cfg.label}</option>
            ))}
          </select>

          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-amber-400"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_CONFIG).map(([id, cfg]) => (
              <option key={id} value={id}>{cfg.label}</option>
            ))}
          </select>

          <button
            onClick={carregarFeedbacks}
            disabled={isLoading}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-amber-300 hover:text-amber-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      ) : feedbacksFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-gray-100 rounded-full p-5 mb-4">
            <MessageSquare className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-600 font-semibold">Nenhum feedback encontrado</p>
          <p className="text-gray-400 text-sm mt-1">
            {filtroCategoria || filtroStatus ? 'Tente ajustar os filtros.' : 'Os feedbacks dos usuários aparecerão aqui.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacksFiltrados.map(feedback => {
            const cat = CATEGORIA_CONFIG[feedback.categoria];
            const CatIcon = cat.icon;
            const st = STATUS_CONFIG[feedback.status];
            const StIcon = st.icon;

            return (
              <button
                key={feedback.id}
                onClick={() => setSelectedFeedback(feedback)}
                className="w-full text-left bg-white border border-gray-200 hover:border-amber-300 rounded-2xl p-5 shadow-sm hover:shadow transition-all duration-150 group"
              >
                <div className="flex items-start gap-4">
                  {/* Ícone de categoria */}
                  <div className={`${cat.bg} ${cat.border} border rounded-xl p-2.5 shrink-0 mt-0.5`}>
                    <CatIcon className={`w-5 h-5 ${cat.text}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold ${cat.bg} ${cat.text}`}>
                        {cat.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold ${st.bg} ${st.text}`}>
                        <StIcon className="w-3 h-3" />
                        {st.label}
                      </span>
                      {feedback.roadmapItemId && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700">
                          No Roadmap
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 line-clamp-2 mb-2">{feedback.descricao}</p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span className="font-medium text-gray-500">{feedback.usuarioNome}</span>
                      <span>·</span>
                      <span>{formatarData(feedback.createdAt)}</span>
                      {feedback.pagina && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[160px]">{feedback.pagina}</span>
                        </>
                      )}
                      {feedback.imagemBase64 && (
                        <>
                          <span>·</span>
                          <span className="text-amber-600">📎 Imagem</span>
                        </>
                      )}
                      {feedback.linkVideo && (
                        <>
                          <span>·</span>
                          <span className="text-amber-600">🎥 Vídeo</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-gray-300 group-hover:text-amber-400 transition-colors text-lg shrink-0">›</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedFeedback && (
        <FeedbackDetailModal
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onAtualizar={() => {
            setSelectedFeedback(null);
            carregarFeedbacks();
          }}
        />
      )}
    </div>
  );
};

export default FeedbackManagement;
