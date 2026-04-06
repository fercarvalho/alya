import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  Plus, Edit2, Trash2, GripVertical, CheckCircle2,
  Clock, Rocket, FlaskConical, Code2, Archive, Map as MapIcon,
  Calendar, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface RoadmapItem {
  id: string;
  titulo: string;
  descricao: string | null;
  status: 'backlog' | 'doing' | 'em_testes' | 'em_beta' | 'lancado' | 'done';
  prioridade: 'baixa' | 'media' | 'alta';
  ordem: number;
  dataInicio: string | null;
  dependeDe: string | null;
  tempoAcumulado: number;
  emAndamento: boolean;
  ultimoInicio: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  createdByUsername: string | null;
}

type StatusKey = RoadmapItem['status'];
type PrioridadeKey = RoadmapItem['prioridade'];

const STATUS_CONFIG: Record<StatusKey, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  backlog:   { label: 'Backlog',    Icon: Code2,        color: '#6b7280', bg: '#f3f4f6' },
  doing:     { label: 'Doing',      Icon: Clock,        color: '#d97706', bg: '#fef3c7' },
  em_testes: { label: 'Em Testes',  Icon: FlaskConical, color: '#0891b2', bg: '#cffafe' },
  em_beta:   { label: 'Em Beta',    Icon: Rocket,       color: '#2563eb', bg: '#dbeafe' },
  lancado:   { label: 'Lançado',    Icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7' },
  done:      { label: 'Done',       Icon: Archive,      color: '#9ca3af', bg: '#f9fafb' },
};

const VISIBLE_STATUS_ORDER: StatusKey[] = ['backlog', 'doing', 'em_beta', 'lancado'];

const PRIORIDADE_CONFIG: Record<PrioridadeKey, { label: string; color: string; bg: string }> = {
  baixa: { label: 'Baixa', color: '#16a34a', bg: '#dcfce7' },
  media: { label: 'Média', color: '#d97706', bg: '#fef3c7' },
  alta:  { label: 'Alta',  color: '#dc2626', bg: '#fee2e2' },
};

const STATUS_ORDER: StatusKey[] = ['backlog', 'doing', 'em_testes', 'em_beta', 'lancado', 'done'];

// ============================================================
// Calendário personalizado (padrão do sistema)
// ============================================================
interface CalendarPickerProps {
  value: string;
  onChange: (v: string) => void;
}

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEK_DAYS = ['D','S','T','Q','Q','S','S'];

const CalendarPicker = ({ value, onChange }: CalendarPickerProps) => {
  const [open, setOpen] = useState(false);
  const [calDate, setCalDate] = useState(() => value ? new Date(value + 'T12:00:00') : new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navigateMonth = (dir: 'prev' | 'next') => {
    setCalDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
      return d;
    });
  };

  const handleSelect = (date: Date) => {
    onChange(date.toISOString().split('T')[0]);
    setOpen(false);
  };

  const days: Date[] = [];
  const first = new Date(calDate.getFullYear(), calDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay());
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  const today = new Date();
  const displayValue = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR')
    : '';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all shadow-sm hover:bg-white"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {displayValue || 'Selecionar data'}
        </span>
        <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 min-w-[300px]">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-amber-50 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-amber-600" />
            </button>
            <span className="text-sm font-semibold text-amber-800">
              {MONTH_NAMES[calDate.getMonth()]} {calDate.getFullYear()}
            </span>
            <button type="button" onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-amber-50 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 text-amber-600" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEK_DAYS.map((d, i) => (
              <div key={i} className="text-center text-xs font-semibold text-gray-500 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, i) => {
              const inMonth = date.getMonth() === calDate.getMonth();
              const isToday = date.toDateString() === today.toDateString();
              const isSelected = value === date.toISOString().split('T')[0];
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => handleSelect(date)}
                  className={`w-9 h-9 text-xs rounded-lg transition-all
                    ${inMonth ? 'text-gray-900' : 'text-gray-300'}
                    ${isSelected ? 'bg-amber-500 text-white font-semibold' : ''}
                    ${isToday && !isSelected ? 'bg-amber-100 text-amber-800 font-semibold' : ''}
                    ${!isSelected && !isToday ? 'hover:bg-amber-50' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              className="flex-1 px-3 py-2 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Limpar
            </button>
            <button type="button" onClick={() => handleSelect(new Date())}
              className="flex-1 px-3 py-2 text-xs text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors">
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Formulário de criação/edição
// ============================================================
interface FormProps {
  item: RoadmapItem | null;
  todasTarefas: RoadmapItem[];
  onSave: (dados: {
    titulo: string; descricao: string; status: string;
    prioridade: string; dataInicio?: string; dependeDe?: string | null;
  }) => void;
  onCancel: () => void;
}

const FormItemRoadmap = ({ item, todasTarefas, onSave, onCancel }: FormProps) => {
  const [titulo, setTitulo] = useState(item?.titulo || '');
  const [descricao, setDescricao] = useState(item?.descricao || '');
  const [status, setStatus] = useState<StatusKey>(item?.status || 'backlog');
  const [prioridade, setPrioridade] = useState<PrioridadeKey>(item?.prioridade || 'media');
  const [dependeDe, setDependeDe] = useState<string | null>(item?.dependeDe || null);

  const formatarDataParaInput = (data: string | null | undefined): string => {
    if (!data) return '';
    try {
      const d = new Date(data);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch { /* noop */ }
    return '';
  };

  const [dataInicio, setDataInicio] = useState(formatarDataParaInput(item?.dataInicio));

  useEffect(() => {
    if (item) {
      setDataInicio(formatarDataParaInput(item.dataInicio));
      setDependeDe(item.dependeDe || null);
    } else {
      setDataInicio('');
      setDependeDe(null);
    }
  }, [item?.id]);

  const tarefasDisponiveis = useMemo(
    () => todasTarefas.filter(t => !item || t.id !== item.id),
    [todasTarefas, item?.id]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) { alert('O título é obrigatório'); return; }
    if (!dataInicio) { alert('A data de início é obrigatória'); return; }
    onSave({ titulo: titulo.trim(), descricao: descricao.trim(), status, prioridade, dataInicio, dependeDe: dependeDe || null });
  };

  const inputCls = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:bg-white transition-all duration-200 shadow-sm';
  const labelCls = 'block text-sm font-semibold text-gray-700 mb-2';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Título <span className="text-red-500">*</span></label>
        <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
          placeholder="Ex: Implementar sistema de notificações"
          className={inputCls} required />
      </div>
      <div>
        <label className={labelCls}>Descrição <span className="text-gray-400 font-normal text-xs">(opcional)</span></label>
        <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
          placeholder="Descreva os detalhes desta tarefa..."
          rows={3} className={inputCls + ' resize-none'} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Status <span className="text-red-500">*</span></label>
          <select value={status} onChange={e => setStatus(e.target.value as StatusKey)} className={inputCls}>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Prioridade <span className="text-red-500">*</span></label>
          <select value={prioridade} onChange={e => setPrioridade(e.target.value as PrioridadeKey)} className={inputCls}>
            {Object.entries(PRIORIDADE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Data de Início <span className="text-red-500">*</span></label>
        <CalendarPicker value={dataInicio} onChange={setDataInicio} />
      </div>
      <div>
        <label className={labelCls}>Depende de <span className="text-red-500">*</span></label>
        <select value={dependeDe || ''} onChange={e => setDependeDe(e.target.value || null)} className={inputCls}>
          <option value="">Nenhuma (tarefa independente)</option>
          {tarefasDisponiveis.map(t => (
            <option key={t.id} value={t.id}>{t.titulo}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl transition-all text-sm">
          Cancelar
        </button>
        <button type="submit"
          className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-600 hover:to-orange-500 text-white font-semibold rounded-xl transition-all shadow-md text-sm">
          Salvar
        </button>
      </div>
    </form>
  );
};

// ============================================================
// Card individual
// ============================================================
interface CardProps {
  item: RoadmapItem;
  isSuperAdmin: boolean;
  isDragging: boolean;
  prioridade: number;
  totalColuna: number;
  tempoAtual?: number;
  formatarTempo: (s: number) => string;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, item: RoadmapItem) => void;
  onDragEnd: () => void;
  onIniciarTempo: (id: string) => void;
  onPausarTempo: (id: string) => void;
  onPararTempo: (id: string) => void;
  onAtualizarPrioridade: (id: string, prioridade: number) => void;
  onAvancar: (id: string) => void;
  onConcluir: (id: string) => void;
}

const RoadmapCard = ({
  item, isSuperAdmin, isDragging, prioridade, totalColuna, tempoAtual,
  formatarTempo, onEdit, onDelete, onDragStart, onDragEnd,
  onIniciarTempo, onPausarTempo, onPararTempo,
  onAtualizarPrioridade, onAvancar, onConcluir,
}: CardProps) => {
  const [prioridadeEditando, setPrioridadeEditando] = useState(prioridade.toString());
  useEffect(() => setPrioridadeEditando(prioridade.toString()), [prioridade]);

  const tempoTotal = item.tempoAcumulado + (tempoAtual || 0);
  const prioridadeCfg = PRIORIDADE_CONFIG[item.prioridade];

  const handlePrioridadeBlur = () => {
    const val = parseInt(prioridadeEditando.trim(), 10);
    if (!isNaN(val)) {
      const valido = Math.max(1, Math.min(val, totalColuna));
      if (valido !== prioridade) {
        setPrioridadeEditando(valido.toString());
        onAtualizarPrioridade(item.id, valido);
      } else {
        setPrioridadeEditando(prioridade.toString());
      }
    } else {
      setPrioridadeEditando(prioridade.toString());
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col gap-2 transition-all
        ${isDragging ? 'opacity-40 scale-95' : ''}
        ${isSuperAdmin ? 'cursor-grab active:cursor-grabbing' : ''}`}
      draggable={isSuperAdmin}
      onDragStart={isSuperAdmin ? e => onDragStart(e, item) : undefined}
      onDragEnd={isSuperAdmin ? onDragEnd : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1 text-gray-300 flex-shrink-0">
          {isSuperAdmin && <GripVertical size={14} />}
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => onEdit(item)}
              className="p-1 rounded text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors">
              <Edit2 size={13} />
            </button>
            <button onClick={() => onDelete(item.id)}
              className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Título e descrição */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 leading-tight">{item.titulo}</h3>
        {item.descricao && (
          <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{item.descricao}</p>
        )}
      </div>

      {/* Prioridade numérica — superadmin edita, admin visualiza */}
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <span>Prioridade:</span>
        {isSuperAdmin ? (
          <>
            <input
              type="number" min={1} max={totalColuna}
              value={prioridadeEditando}
              onChange={e => {
                const v = e.target.value;
                if (v === '' || /^\d*$/.test(v)) setPrioridadeEditando(v);
              }}
              onBlur={handlePrioridadeBlur}
              onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
              className="w-10 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <span className="text-gray-400">/ {totalColuna}</span>
          </>
        ) : (
          <span className="font-medium text-gray-700">{prioridade} / {totalColuna}</span>
        )}
      </div>

      {/* Data e tempo */}
      <div className="flex flex-col gap-1 text-xs text-gray-500">
        {item.dataInicio && (
          <span><strong>Início:</strong> {new Date(item.dataInicio).toLocaleDateString('pt-BR')}</span>
        )}
        <span><strong>Tempo:</strong> {formatarTempo(tempoTotal)}</span>
      </div>

      {/* Timer — apenas superadmin */}
      {isSuperAdmin && (
        <div className="flex flex-wrap gap-1">
          {item.emAndamento ? (
            <>
              <button onClick={() => onPausarTempo(item.id)}
                className="flex-1 text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors font-medium">
                ⏸ Pause
              </button>
              <button onClick={() => onPararTempo(item.id)}
                className="flex-1 text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors font-medium">
                ⏹ Stop
              </button>
            </>
          ) : (
            <button onClick={() => onIniciarTempo(item.id)}
              className="flex-1 text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors font-medium">
              ▶ Start
            </button>
          )}
          <button onClick={() => onAvancar(item.id)} disabled={item.status === 'done'}
            className="flex-1 text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed">
            ➡ Avançar
          </button>
          <button onClick={() => onConcluir(item.id)} disabled={item.status === 'done'}
            className="flex-1 text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed">
            ✓ Concluir
          </button>
        </div>
      )}

      {/* Rodapé */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-50">
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ color: prioridadeCfg.color, backgroundColor: prioridadeCfg.bg }}>
          {prioridadeCfg.label}
        </span>
        {item.createdByUsername && (
          <span className="text-xs text-gray-400 truncate">por {item.createdByUsername}</span>
        )}
      </div>
    </div>
  );
};

// ============================================================
// Modal simples inline
// ============================================================
interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const InlineModal = ({ title, onClose, children }: ModalProps) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm px-4 pb-4 pt-[180px]"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl w-full max-w-md flex flex-col border border-gray-200/50"
        style={{ maxHeight: 'calc(100vh - 220px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl px-6 py-4 border-b border-amber-200/50 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-amber-800 flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-amber-700" />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-2 rounded-full transition-all"
          >
            ✕
          </button>
        </div>
        {/* Conteúdo com scroll */}
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
};

// ============================================================
// Componente principal Roadmap
// ============================================================
const Roadmap = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  const [itens, setItens] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [itemEditando, setItemEditando] = useState<RoadmapItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<RoadmapItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [temposAtuais, setTemposAtuais] = useState<Record<string, number>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const itensRef = useRef<RoadmapItem[]>([]);

  useEffect(() => {
    carregarRoadmap();
    return () => {
      Object.values(timersRef.current).forEach(t => clearInterval(t));
      timersRef.current = {};
    };
  }, []);

  useEffect(() => {
    itensRef.current = itens;

    // Limpar timers de itens não mais em andamento
    const emAndamento = new Set(itens.filter(i => i.emAndamento && i.ultimoInicio).map(i => i.id));
    Object.keys(timersRef.current).forEach(id => {
      if (!emAndamento.has(id)) {
        clearInterval(timersRef.current[id]);
        delete timersRef.current[id];
      }
    });

    // Criar timers para itens em andamento
    itens.forEach(item => {
      if (item.emAndamento && item.ultimoInicio && !timersRef.current[item.id]) {
        const inicio = new Date(item.ultimoInicio).getTime();
        const decorrido = Math.floor((Date.now() - inicio) / 1000);
        setTemposAtuais(prev => prev[item.id] === undefined ? { ...prev, [item.id]: decorrido } : prev);

        timersRef.current[item.id] = setInterval(() => {
          const cur = itensRef.current.find(i => i.id === item.id);
          if (cur?.emAndamento && cur?.ultimoInicio) {
            const t = Math.floor((Date.now() - new Date(cur.ultimoInicio).getTime()) / 1000);
            setTemposAtuais(prev => prev[item.id] !== t ? { ...prev, [item.id]: t } : prev);
          } else {
            clearInterval(timersRef.current[item.id]);
            delete timersRef.current[item.id];
          }
        }, 1000);
      }
    });
  }, [itens]);

  const carregarRoadmap = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/admin/roadmap');
      setItens(prev => {
        if (prev.length !== data.length) return data;
        const prevMap = new Map(prev.map((i: RoadmapItem) => [i.id, i]));
        for (const item of data) {
          const p = prevMap.get(item.id);
          if (!p) return data;
          if (
            p.titulo !== item.titulo || p.status !== item.status ||
            p.ordem !== item.ordem || p.emAndamento !== item.emAndamento ||
            p.tempoAcumulado !== item.tempoAcumulado || p.ultimoInicio !== item.ultimoInicio
          ) return data;
        }
        return prev;
      });
    } catch (e) {
      console.error('Erro ao carregar roadmap:', e);
    } finally {
      setLoading(false);
    }
  };

  const getItensPorStatus = (status: string) =>
    itens.filter(i => i.status === status).sort((a, b) => a.ordem - b.ordem);

  const calcularPrioridade = (item: RoadmapItem) => {
    const col = getItensPorStatus(item.status);
    const idx = col.findIndex(i => i.id === item.id);
    return idx >= 0 ? idx + 1 : col.length + 1;
  };

  const formatarTempo = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
    if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`;
    return `${sec}s`;
  };

  // --- Salvar item ---
  const handleSalvar = async (dados: {
    titulo: string; descricao: string; status: string;
    prioridade: string; dataInicio?: string; dependeDe?: string | null;
  }) => {
    try {
      if (itemEditando) {
        await axios.put(`/api/admin/roadmap/${itemEditando.id}`, dados);
      } else {
        await axios.post('/api/admin/roadmap', dados);
      }
      setShowModal(false);
      setItemEditando(null);
      await carregarRoadmap();
    } catch (e) {
      console.error('Erro ao salvar item:', e);
      alert('Erro ao salvar item');
    }
  };

  // --- Deletar ---
  const handleDeletar = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este item?')) return;
    try {
      if (timersRef.current[id]) { clearInterval(timersRef.current[id]); delete timersRef.current[id]; }
      await axios.delete(`/api/admin/roadmap/${id}`);
      await carregarRoadmap();
    } catch (e) {
      console.error('Erro ao deletar item:', e);
      alert('Erro ao deletar item');
    }
  };

  // --- Timer ---
  const handleIniciarTempo = async (id: string) => {
    try {
      const item = itens.find(i => i.id === id);
      if (!item) return;
      const { data } = await axios.post(`/api/admin/roadmap/${id}/iniciar-tempo`);
      const ultimoInicio = data?.ultimoInicio || item.ultimoInicio || new Date().toISOString();
      setItens(prev => prev.map(i => i.id === id ? { ...i, emAndamento: true, ultimoInicio } : i));
      const decorrido = Math.floor((Date.now() - new Date(ultimoInicio).getTime()) / 1000);
      setTemposAtuais(prev => ({ ...prev, [id]: decorrido }));
      if (!timersRef.current[id]) {
        timersRef.current[id] = setInterval(() => {
          const cur = itensRef.current.find(i => i.id === id);
          if (cur?.emAndamento && cur?.ultimoInicio) {
            const t = Math.floor((Date.now() - new Date(cur.ultimoInicio).getTime()) / 1000);
            setTemposAtuais(prev => prev[id] !== t ? { ...prev, [id]: t } : prev);
          } else {
            clearInterval(timersRef.current[id]); delete timersRef.current[id];
          }
        }, 1000);
      }
    } catch (e) {
      console.error('Erro ao iniciar tempo:', e);
      await carregarRoadmap();
    }
  };

  const handlePausarTempo = async (id: string) => {
    try {
      if (timersRef.current[id]) { clearInterval(timersRef.current[id]); delete timersRef.current[id]; }
      setTemposAtuais(prev => { const n = { ...prev }; delete n[id]; return n; });
      await axios.post(`/api/admin/roadmap/${id}/pausar-tempo`);
      setItens(prev => prev.map(i => i.id === id ? { ...i, emAndamento: false } : i));
    } catch (e) {
      console.error('Erro ao pausar tempo:', e);
      await carregarRoadmap();
    }
  };

  const handlePararTempo = async (id: string) => {
    try {
      const item = itens.find(i => i.id === id);
      if (!item) return;
      let decorrido = 0;
      if (item.ultimoInicio) decorrido = Math.floor((Date.now() - new Date(item.ultimoInicio).getTime()) / 1000);
      if (timersRef.current[id]) { clearInterval(timersRef.current[id]); delete timersRef.current[id]; }
      setTemposAtuais(prev => { const n = { ...prev }; delete n[id]; return n; });
      const { data } = await axios.post(`/api/admin/roadmap/${id}/parar-tempo`, { tempoDecorrido: decorrido });
      setItens(prev => prev.map(i => i.id === id ? {
        ...i, emAndamento: false, ultimoInicio: null,
        tempoAcumulado: data?.tempoAcumulado ?? (i.tempoAcumulado + decorrido),
      } : i));
    } catch (e) {
      console.error('Erro ao parar tempo:', e);
      await carregarRoadmap();
    }
  };

  // --- Avançar / Concluir ---
  const mudarStatus = async (id: string, novoStatus: StatusKey) => {
    setItens(prev => prev.map(i => i.id === id ? { ...i, status: novoStatus } : i));
    try {
      await axios.put(`/api/admin/roadmap/${id}/status`, { status: novoStatus });
    } catch (e) {
      await carregarRoadmap();
    }
  };

  const handleAvancar = (id: string) => {
    const item = itens.find(i => i.id === id);
    if (!item) return;
    const idx = STATUS_ORDER.indexOf(item.status);
    if (idx === -1 || idx === STATUS_ORDER.length - 1) { alert('A tarefa já está na última coluna'); return; }
    mudarStatus(id, STATUS_ORDER[idx + 1]);
  };

  const handleConcluir = (id: string) => {
    const item = itens.find(i => i.id === id);
    if (!item || item.status === 'done') return;
    mudarStatus(id, 'done');
  };

  // --- Prioridade ---
  const handleAtualizarPrioridade = async (id: string, novaPrioridade: number) => {
    try {
      const item = itens.find(i => i.id === id);
      if (!item) return;
      const col = getItensPorStatus(item.status);
      const semItem = col.filter(i => i.id !== id);
      const pos = Math.max(0, Math.min(novaPrioridade - 1, semItem.length));
      semItem.splice(pos, 0, item);
      const atualizados = semItem.map((i, idx) => ({ id: i.id, ordem: idx }));
      setItens(prev => {
        const novos = [...prev];
        atualizados.forEach(({ id: aid, ordem }) => {
          const i = novos.findIndex(x => x.id === aid);
          if (i !== -1) novos[i] = { ...novos[i], ordem };
        });
        return novos;
      });
      await axios.put('/api/admin/roadmap/ordem', { itens: atualizados });
    } catch (e: any) {
      console.error('Erro ao atualizar prioridade:', e);
      await carregarRoadmap();
    }
  };

  // --- Drag and Drop ---
  const handleDragStart = (e: React.DragEvent, item: RoadmapItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDrop = async (e: React.DragEvent, novoStatus: string, targetIndex?: number) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedItem) return;

    try {
      const col = getItensPorStatus(novoStatus);
      if (draggedItem.status !== novoStatus) {
        setItens(prev => prev.map(i => i.id === draggedItem.id ? { ...i, status: novoStatus as StatusKey } : i));
        try {
          await axios.put(`/api/admin/roadmap/${draggedItem.id}/status`, { status: novoStatus });
        } catch { await carregarRoadmap(); }
      } else {
        const pos = col.findIndex(i => i.id === draggedItem.id);
        if (pos === -1) return;
        if (targetIndex !== undefined && targetIndex === pos) return;
        const semItem = col.filter(i => i.id !== draggedItem.id);
        const nova = targetIndex !== undefined ? Math.max(0, Math.min(targetIndex, semItem.length)) : pos;
        semItem.splice(nova, 0, draggedItem);
        const atualizados = semItem.map((i, idx) => ({ id: i.id, ordem: idx }));
        setItens(prev => {
          const novos = [...prev];
          atualizados.forEach(({ id, ordem }) => {
            const i = novos.findIndex(x => x.id === id);
            if (i !== -1) novos[i] = { ...novos[i], ordem };
          });
          return novos;
        });
        try {
          await axios.put('/api/admin/roadmap/ordem', { itens: atualizados });
        } catch { await carregarRoadmap(); }
      }
    } catch (e: any) {
      console.error('Erro ao mover item:', e);
      alert(`Erro ao mover item: ${e?.response?.data?.error || e?.message || 'Erro desconhecido'}`);
    } finally {
      setDraggedItem(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 shadow-md">
            <MapIcon size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-amber-800">Roadmap do Sistema</h1>
            <p className="text-xs text-amber-600/80">
              {isSuperAdmin ? 'Gerencie o desenvolvimento do sistema' : 'Acompanhe o desenvolvimento do sistema'}
            </p>
          </div>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => { setItemEditando(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 text-white text-sm font-semibold hover:from-amber-600 hover:to-orange-500 transition-all shadow-md">
            <Plus size={15} />
            Novo Item
          </button>
        )}
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">Carregando...</div>
      ) : (
        <div className="flex-1 p-4 overflow-auto">
          <div className="grid gap-4 h-full" style={{ gridTemplateColumns: `repeat(${VISIBLE_STATUS_ORDER.length}, minmax(0, 1fr))` }}>
            {VISIBLE_STATUS_ORDER.map(status => {
              const cfg = STATUS_CONFIG[status];
              const { Icon } = cfg;
              const col = getItensPorStatus(status);
              const isOver = dragOverColumn === status;

              return (
                <div
                  key={status}
                  className={`flex flex-col rounded-2xl border-2 transition-all min-h-0
                    ${isOver
                      ? 'border-amber-400 bg-amber-50/80 shadow-lg shadow-amber-100'
                      : 'border-gray-200/60 bg-white/60 shadow-sm'}`}
                  onDragOver={isSuperAdmin ? e => handleDragOver(e, status) : undefined}
                  onDragLeave={isSuperAdmin ? () => setDragOverColumn(null) : undefined}
                  onDrop={isSuperAdmin ? e => {
                    const colEl = e.currentTarget.querySelector('[data-col-content]');
                    let targetIndex: number | undefined;
                    if (colEl && draggedItem) {
                      const cards = Array.from(colEl.querySelectorAll('[data-card]'));
                      const rect = e.currentTarget.getBoundingClientRect();
                      const my = e.clientY - rect.top;
                      for (let i = 0; i < cards.length; i++) {
                        const cr = cards[i].getBoundingClientRect();
                        if (my < cr.top - rect.top + cr.height / 2) { targetIndex = i; break; }
                      }
                      if (targetIndex === undefined) targetIndex = cards.length;
                    }
                    handleDrop(e, status, targetIndex);
                  } : undefined}
                >
                  {/* Header da coluna */}
                  <div
                    className="flex items-center gap-2 px-4 py-3 rounded-t-2xl border-b"
                    style={{ backgroundColor: cfg.bg + 'cc', borderColor: cfg.color + '30' }}
                  >
                    <div className="p-1.5 rounded-lg bg-white/70 shadow-sm">
                      <Icon size={14} style={{ color: cfg.color }} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                    <span
                      className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-white/80 shadow-sm"
                      style={{ color: cfg.color }}
                    >
                      {col.length}
                    </span>
                  </div>

                  {/* Itens */}
                  <div
                    data-col-content
                    className="flex flex-col gap-2 p-3 overflow-y-auto flex-1"
                    style={{ maxHeight: 'calc(100vh - 260px)' }}
                  >
                    {col.map(item => (
                      <div key={item.id} data-card>
                        <RoadmapCard
                          item={item}
                          isSuperAdmin={isSuperAdmin}
                          isDragging={draggedItem?.id === item.id}
                          prioridade={calcularPrioridade(item)}
                          totalColuna={col.length}
                          tempoAtual={temposAtuais[item.id]}
                          formatarTempo={formatarTempo}
                          onEdit={i => { setItemEditando(i); setShowModal(true); }}
                          onDelete={handleDeletar}
                          onDragStart={handleDragStart}
                          onDragEnd={() => { setDraggedItem(null); setDragOverColumn(null); }}
                          onIniciarTempo={handleIniciarTempo}
                          onPausarTempo={handlePausarTempo}
                          onPararTempo={handlePararTempo}
                          onAtualizarPrioridade={handleAtualizarPrioridade}
                          onAvancar={handleAvancar}
                          onConcluir={handleConcluir}
                        />
                      </div>
                    ))}
                    {col.length === 0 && (
                      <div className="text-xs text-gray-400 text-center py-6 italic">Nenhum item</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de formulário */}
      {showModal && (
        <InlineModal
          title={itemEditando ? 'Editar Item do Roadmap' : 'Novo Item do Roadmap'}
          onClose={() => { setShowModal(false); setItemEditando(null); }}
        >
          <FormItemRoadmap
            item={itemEditando}
            todasTarefas={itens}
            onSave={handleSalvar}
            onCancel={() => { setShowModal(false); setItemEditando(null); }}
          />
        </InlineModal>
      )}
    </div>
  );
};

export default Roadmap;
