import { useState, useEffect } from 'react';
import axios from 'axios';
import { Lock, XCircle, RefreshCw } from 'lucide-react';
import './ActiveSessions.css';

interface Session {
  id: string;
  device: {
    type: string;
    name: string;
    browser: string;
    os: string;
  };
  location: {
    country: string;
    city: string;
    ipAddress: string;
  };
  activity: {
    createdAt: string;
    lastActivityAt: string;
    expiresAt: string;
  };
  isActive: boolean;
}

export default function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axios.get('/api/user/sessions');
      setSessions(data.sessions || []);
    } catch (error: any) {
      console.error('Erro ao buscar sessões:', error);
      setError(error.response?.data?.error || 'Erro ao carregar sessões');
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    if (!confirm('Deseja encerrar esta sessão? O dispositivo será desconectado imediatamente.')) {
      return;
    }

    try {
      await axios.delete(`/api/user/sessions/${sessionId}`);
      // Remover da lista localmente
      setSessions(sessions.filter(s => s.id !== sessionId));
      alert('✅ Sessão encerrada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao encerrar sessão:', error);
      alert('❌ Erro ao encerrar sessão: ' + (error.response?.data?.error || 'Erro desconhecido'));
    }
  };

  const logoutAll = async () => {
    if (!confirm('⚠️ Deseja encerrar TODAS as outras sessões?\n\nTodos os outros dispositivos serão desconectados imediatamente.')) {
      return;
    }

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await axios.post('/api/auth/logout-all', { refreshToken });
      alert('✅ Todas as outras sessões foram encerradas!');
      // Recarregar lista
      fetchSessions();
    } catch (error: any) {
      console.error('Erro ao encerrar todas as sessões:', error);
      alert('❌ Erro ao encerrar sessões: ' + (error.response?.data?.error || 'Erro desconhecido'));
    }
  };

  const getDeviceIcon = (type: string): string => {
    const typeMap: Record<string, string> = {
      mobile: '📱',
      desktop: '💻',
      tablet: '📱',
      unknown: '🖥️'
    };
    return typeMap[type.toLowerCase()] || '🖥️';
  };

  const getTimeAgo = (timestamp: string): string => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} dia${days > 1 ? 's' : ''} atrás`;
    if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
    if (minutes > 0) return `${minutes} minuto${minutes > 1 ? 's' : ''} atrás`;
    return 'Agora';
  };

  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="active-sessions">
        <div className="loading">
          <div className="spinner"></div>
          <p>Carregando sessões...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="active-sessions">
        <div className="error-message">
          <h3><XCircle size={20} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }} />Erro ao carregar sessões</h3>
          <p>{error}</p>
          <button onClick={fetchSessions} className="btn-retry">
            <RefreshCw size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="active-sessions">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="h-8 w-8 text-amber-600" />
            <h1 className="text-3xl font-bold text-amber-900">Sessões Ativas</h1>
          </div>
          <p className="text-gray-600">Gerencie os dispositivos conectados à sua conta</p>
        </div>
        <div className="empty-state">
          <p>Nenhuma sessão ativa encontrada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="active-sessions">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Lock className="h-8 w-8 text-amber-600" />
          <h1 className="text-3xl font-bold text-amber-900">Sessões Ativas</h1>
        </div>
        <p className="text-gray-600">Gerencie os dispositivos conectados à sua conta</p>
      </div>

      <div className="sessions-list">
        {sessions.map((session, index) => (
          <div key={session.id} className="session-card">
            <div className="session-header">
              <div className="device-icon-wrapper">
                <span className="device-icon">
                  {getDeviceIcon(session.device.type)}
                </span>
              </div>

              <div className="device-info">
                <div className="device-name">
                  <strong>{session.device.name}</strong>
                  {index === 0 && (
                    <span className="badge badge-current">Sessão Atual</span>
                  )}
                </div>
                <div className="device-browser">
                  {session.device.browser} • {session.device.os}
                </div>
              </div>

              {index !== 0 && (
                <button
                  onClick={() => revokeSession(session.id)}
                  className="btn-revoke"
                  title="Encerrar esta sessão"
                >
                  🗑️ Encerrar
                </button>
              )}
            </div>

            <div className="session-details">
              <div className="detail-item">
                <span className="detail-icon">📍</span>
                <span className="detail-text">
                  {session.location.city}, {session.location.country}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-icon">🕐</span>
                <span className="detail-text">
                  Última atividade: {getTimeAgo(session.activity.lastActivityAt)}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-icon">📅</span>
                <span className="detail-text">
                  Criada em: {formatDate(session.activity.createdAt)}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-icon">🌐</span>
                <span className="detail-text ip-address">
                  IP: {session.location.ipAddress}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-icon">⏰</span>
                <span className="detail-text">
                  Expira em: {formatDate(session.activity.expiresAt)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sessions.length > 1 && (
        <div className="actions-footer">
          <button onClick={logoutAll} className="btn-logout-all">
            🚫 Encerrar todas as outras sessões
          </button>
          <p className="footer-note">
            ⚠️ Isso desconectará todos os outros dispositivos imediatamente
          </p>
        </div>
      )}

      <div className="info-box">
        <h3>ℹ️ Sobre as Sessões</h3>
        <ul>
          <li>Cada sessão representa um dispositivo conectado à sua conta</li>
          <li>Sessões expiram automaticamente após 7 dias de inatividade</li>
          <li>Se você não reconhece algum dispositivo, encerre a sessão imediatamente</li>
          <li>Recomendamos encerrar sessões antigas regularmente</li>
        </ul>
      </div>
    </div>
  );
}
