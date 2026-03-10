import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Users, TrendingUp, AlertTriangle, Clock, RefreshCw, XCircle, Globe, BarChart3, User, MapPin, Hash } from 'lucide-react';
import './AnomalyDashboard.css';

interface AnomalyStats {
  period: string;
  stats: {
    total: number;
    affectedUsers: number;
    avgScore: number;
    types: string[];
  };
  topUsers: Array<{
    user_id: string;
    username: string;
    anomaly_count: number;
    last_anomaly: string;
  }>;
  byType: Array<{
    type: string;
    count: number;
    avg_score: number;
  }>;
}

interface Anomaly {
  id: string;
  userId: string;
  username: string;
  type: string;
  score: number;
  details: any;
  ipAddress: string;
  timestamp: string;
}

interface UserBaseline {
  username: string;
  baseline: {
    countries: string[];
    avgHour: number;
    avgRequestsPerMinute: number;
    commonIPs: string[];
  };
  stats: {
    totalLogins: number;
    firstLogin: string;
    lastLogin: string;
  };
}

export default function AnomalyDashboard() {
  const [stats, setStats] = useState<AnomalyStats | null>(null);
  const [recent, setRecent] = useState<Anomaly[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userBaseline, setUserBaseline] = useState<UserBaseline | null>(null);
  const [severityFilter, setSeverityFilter] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, [days, severityFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, recentRes] = await Promise.all([
        axios.get(`/api/admin/anomalies/stats?days=${days}`),
        axios.get(`/api/admin/anomalies/recent?limit=50${severityFilter > 0 ? `&severity=${severityFilter}` : ''}`)
      ]);

      setStats(statsRes.data);
      setRecent(recentRes.data.anomalies || []);
    } catch (error: any) {
      console.error('Erro ao buscar dados:', error);
      setError(error.response?.data?.error || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBaseline = async (username: string) => {
    try {
      const { data } = await axios.get(`/api/admin/anomalies/baseline/${username}`);
      setUserBaseline(data);
      setSelectedUser(username);
    } catch (error: any) {
      console.error('Erro ao buscar baseline:', error);
      alert('Erro ao buscar dados do usuário: ' + (error.response?.data?.error || 'Erro desconhecido'));
    }
  };

  const getAnomalyTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      new_country: 'Novo País',
      unusual_hour: 'Horário Incomum',
      abnormal_volume: 'Volume Anormal',
      multiple_ips: 'Múltiplos IPs',
      multiple_devices: 'Múltiplos Dispositivos',
      brute_force: 'Brute Force'
    };
    return labels[type] || type;
  };

  const getSeverityLabel = (score: number): { label: string; color: string } => {
    if (score >= 90) return { label: 'CRÍTICA', color: '#d32f2f' };
    if (score >= 70) return { label: 'ALTA', color: '#f57c00' };
    if (score >= 50) return { label: 'MÉDIA', color: '#fbc02d' };
    return { label: 'BAIXA', color: '#388e3c' };
  };

  const getTimeAgo = (timestamp: string): string => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d atrás`;
    if (hours > 0) return `${hours}h atrás`;
    if (minutes > 0) return `${minutes}min atrás`;
    return 'Agora';
  };

  if (loading) {
    return (
      <div className="anomaly-dashboard">
        <div className="loading">
          <div className="spinner"></div>
          <p>Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="anomaly-dashboard">
        <div className="error-message">
          <h3><XCircle size={20} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }} />Erro</h3>
          <p>{error}</p>
          <button onClick={fetchData} className="btn-retry">
            <RefreshCw size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="anomaly-dashboard">Nenhum dado disponível</div>;
  }

  const highSeverityCount = recent.filter(a => a.score >= 70).length;

  return (
    <div className="anomaly-dashboard">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="h-8 w-8 text-amber-600" />
          <h1 className="text-3xl font-bold text-amber-900">Dashboard de Anomalias</h1>
        </div>
        <p className="text-gray-600">Monitoramento de comportamentos suspeitos detectados por ML</p>
      </div>

      {/* Filtros */}
      <div className="filters">
        <div className="filter-group">
          <label>Período:</label>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>Últimas 24 horas</option>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Severidade mínima:</label>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(Number(e.target.value))}>
            <option value={0}>Todas</option>
            <option value={50}>Média ou superior</option>
            <option value={70}>Alta ou superior</option>
            <option value={90}>Apenas críticas</option>
          </select>
        </div>
      </div>

      {/* Estatísticas Principais */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><BarChart3 size={40} color="#2196F3" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.stats.total}</div>
            <div className="stat-label">Total de Anomalias</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Users size={40} color="#2196F3" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.stats.affectedUsers}</div>
            <div className="stat-label">Usuários Afetados</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><TrendingUp size={40} color="#2196F3" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.stats.avgScore.toFixed(1)}</div>
            <div className="stat-label">Score Médio</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><AlertTriangle size={40} color="#F44336" /></div>
          <div className="stat-content">
            <div className="stat-value">{highSeverityCount}</div>
            <div className="stat-label">Alta Severidade</div>
          </div>
        </div>
      </div>

      {/* Anomalias por Tipo */}
      <div className="section">
        <h2>📊 Anomalias por Tipo</h2>
        <div className="chart-container">
          {stats.byType.map(item => {
            const percentage = (item.count / stats.stats.total) * 100;
            return (
              <div key={item.type} className="chart-bar">
                <div className="chart-label">
                  {getAnomalyTypeLabel(item.type)}
                  <span className="chart-count">({item.count})</span>
                </div>
                <div className="chart-bar-outer">
                  <div
                    className="chart-bar-inner"
                    style={{ width: `${percentage}%` }}
                  >
                    <span className="chart-bar-text">
                      Score: {item.avg_score.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Usuários */}
      <div className="section">
        <h2>👥 Usuários com Mais Anomalias</h2>
        <div className="top-users-list">
          {stats.topUsers.slice(0, 10).map((user, index) => (
            <div key={user.user_id} className="user-item">
              <div className="user-rank">#{index + 1}</div>
              <div className="user-info">
                <div className="user-name">{user.username}</div>
                <div className="user-stats">
                  {user.anomaly_count} anomalia{user.anomaly_count > 1 ? 's' : ''} •
                  Última: {getTimeAgo(user.last_anomaly)}
                </div>
              </div>
              <button
                onClick={() => fetchUserBaseline(user.username)}
                className="btn-view-baseline"
              >
                Ver Baseline
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Baseline do Usuário (Modal) */}
      {selectedUser && userBaseline && (
        <div className="modal-overlay" onClick={() => { setSelectedUser(null); setUserBaseline(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 Baseline: {userBaseline.username}</h3>
              <button
                className="modal-close"
                onClick={() => { setSelectedUser(null); setUserBaseline(null); }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="baseline-section">
                <h4><Globe size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />Países comuns:</h4>
                <p>{userBaseline.baseline.countries.join(', ')}</p>
              </div>
              <div className="baseline-section">
                <h4><Clock size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />Horário médio de acesso:</h4>
                <p>{userBaseline.baseline.avgHour}:00h</p>
              </div>
              <div className="baseline-section">
                <h4><BarChart3 size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />Requisições por minuto (média):</h4>
                <p>{userBaseline.baseline.avgRequestsPerMinute.toFixed(1)}</p>
              </div>
              <div className="baseline-section">
                <h4><Globe size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />IPs comuns:</h4>
                <p>{userBaseline.baseline.commonIPs.join(', ')}</p>
              </div>
              <div className="baseline-section">
                <h4><TrendingUp size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />Estatísticas:</h4>
                <p>Total de logins: {userBaseline.stats.totalLogins}</p>
                <p>Primeiro login: {new Date(userBaseline.stats.firstLogin).toLocaleString('pt-BR')}</p>
                <p>Último login: {new Date(userBaseline.stats.lastLogin).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Anomalias Recentes */}
      <div className="section">
        <h2>🚨 Anomalias Recentes</h2>
        {recent.length === 0 ? (
          <div className="empty-state">
            Nenhuma anomalia encontrada no período selecionado
          </div>
        ) : (
          <div className="anomalies-list">
            {recent.map(anomaly => {
              const severity = getSeverityLabel(anomaly.score);
              return (
                <div key={anomaly.id} className="anomaly-card">
                  <div className="anomaly-header">
                    <div className="anomaly-type">
                      {getAnomalyTypeLabel(anomaly.type)}
                    </div>
                    <div
                      className="anomaly-severity"
                      style={{ backgroundColor: severity.color }}
                    >
                      {severity.label}
                    </div>
                  </div>

                  <div className="anomaly-user">
                    <User size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                    Usuário: <strong>{anomaly.username}</strong>
                  </div>

                  <div className="anomaly-details">
                    {anomaly.type === 'new_country' && anomaly.details.baseline && (
                      <div>
                        <MapPin size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                        Usual: {anomaly.details.baseline.join(', ')} →
                        Detectado: {anomaly.details.detected}
                      </div>
                    )}
                    {anomaly.type === 'unusual_hour' && anomaly.details.detected !== undefined && (
                      <div>
                        <Clock size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                        Horário detectado: {anomaly.details.detected}:00h
                        {anomaly.details.avgHour && ` (usual: ${anomaly.details.avgHour}:00h)`}
                      </div>
                    )}
                    {anomaly.details.message && (
                      <div>{anomaly.details.message}</div>
                    )}
                  </div>

                  <div className="anomaly-footer">
                    <div className="anomaly-score">
                      <Hash size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                      Score: {anomaly.score}
                    </div>
                    <div className="anomaly-time">
                      <Clock size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                      {getTimeAgo(anomaly.timestamp)}
                    </div>
                    <div className="anomaly-ip">
                      <Globe size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                      {anomaly.ipAddress}
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
