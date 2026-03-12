import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, Shield, BarChart3, Clock, Globe, User, XCircle, RefreshCw, Filter } from 'lucide-react';
import './SecurityAlerts.css';

interface Alert {
  id: string;
  user_id: string;
  username: string;
  action: string;
  details: any;
  ip_address: string;
  created_at: string;
}

interface AlertStats {
  period: string;
  total: number;
  affectedUsers: number;
  byType: Array<{
    action: string;
    count: number;
    affected_users: number;
  }>;
}

export default function SecurityAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchData();
  }, [days, typeFilter, page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [alertsRes, statsRes] = await Promise.all([
        axios.get(`/api/admin/security-alerts?limit=${limit}&offset=${page * limit}${typeFilter ? `&type=${typeFilter}` : ''}`),
        axios.get(`/api/admin/security-alerts/stats?days=${days}`)
      ]);

      setAlerts(alertsRes.data.alerts || []);
      setStats(statsRes.data);
    } catch (error: any) {
      console.error('Erro ao buscar alertas:', error);
      setError(error.response?.data?.error || 'Erro ao carregar alertas');
    } finally {
      setLoading(false);
    }
  };

  const getAlertTypeLabel = (action: string): string => {
    const labels: Record<string, string> = {
      login_failed_suspicious: 'Login Suspeito',
      multiple_ips_detected: 'Múltiplos IPs',
      token_theft_detected: 'Roubo de Token',
      sql_injection_attempt: 'SQL Injection',
      xss_attempt: 'Tentativa XSS',
      brute_force_detected: 'Brute Force',
      new_country_login: 'Novo País',
      multiple_devices_detected: 'Múltiplos Dispositivos'
    };
    return labels[action] || action;
  };

  const getSeverityColor = (action: string): string => {
    const critical = ['token_theft_detected', 'sql_injection_attempt', 'brute_force_detected'];
    const high = ['xss_attempt', 'new_country_login'];
    const medium = ['multiple_ips_detected', 'multiple_devices_detected'];

    if (critical.includes(action)) return '#d32f2f';
    if (high.includes(action)) return '#f57c00';
    if (medium.includes(action)) return '#fbc02d';
    return '#388e3c';
  };

  const getSeverityLabel = (action: string): string => {
    const critical = ['token_theft_detected', 'sql_injection_attempt', 'brute_force_detected'];
    const high = ['xss_attempt', 'new_country_login'];
    const medium = ['multiple_ips_detected', 'multiple_devices_detected'];

    if (critical.includes(action)) return 'CRÍTICA';
    if (high.includes(action)) return 'ALTA';
    if (medium.includes(action)) return 'MÉDIA';
    return 'BAIXA';
  };

  const getTimeAgo = (timestamp: string): string => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const daysAgo = Math.floor(hours / 24);

    if (daysAgo > 0) return `${daysAgo}d atrás`;
    if (hours > 0) return `${hours}h atrás`;
    if (minutes > 0) return `${minutes}min atrás`;
    return 'Agora';
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="security-alerts">
        <div className="loading">
          <div className="spinner"></div>
          <p>Carregando alertas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="security-alerts">
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

  return (
    <div className="security-alerts">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="h-8 w-8 text-amber-600" />
          <h1 className="text-3xl font-bold text-amber-900">Portal de Alertas de Segurança</h1>
        </div>
        <p className="text-gray-600">Monitoramento de eventos de segurança em tempo real</p>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><Shield size={40} color="#2196F3" /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total de Alertas</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><User size={40} color="#2196F3" /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.affectedUsers}</div>
              <div className="stat-label">Usuários Afetados</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><BarChart3 size={40} color="#2196F3" /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.byType.length}</div>
              <div className="stat-label">Tipos Diferentes</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><Clock size={40} color="#2196F3" /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.period}</div>
              <div className="stat-label">Período</div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{
        background: 'linear-gradient(to right, #fffbeb, #ffedd5)',
        padding: '1rem',
        borderRadius: '0.5rem',
        border: '1px solid #fcd34d',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {/* Título */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={20} color="#d97706" />
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: 'bold',
              color: '#1f2937',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              FILTRE SEUS ITENS:
            </h2>
          </div>

          {/* Campos de Filtro */}
          <div style={{
            display: 'flex',
            alignItems: 'end',
            gap: '1rem',
            flex: 1,
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0%', minWidth: '150px' }}>
              <label style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.25rem'
              }}>
                Período
              </label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #fcd34d',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white',
                  width: '100%'
                }}
              >
                <option value={1}>Últimas 24 horas</option>
                <option value={7}>Últimos 7 dias</option>
                <option value={30}>Últimos 30 dias</option>
                <option value={90}>Últimos 90 dias</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0%', minWidth: '200px' }}>
              <label style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.25rem'
              }}>
                Tipo de Alerta
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #fcd34d',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white',
                  width: '100%'
                }}
              >
                <option value="">Todos</option>
                <option value="login_failed_suspicious">Login Suspeito</option>
                <option value="multiple_ips_detected">Múltiplos IPs</option>
                <option value="token_theft_detected">Roubo de Token</option>
                <option value="sql_injection_attempt">SQL Injection</option>
                <option value="xss_attempt">Tentativa XSS</option>
                <option value="brute_force_detected">Brute Force</option>
                <option value="new_country_login">Novo País</option>
                <option value="multiple_devices_detected">Múltiplos Dispositivos</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Distribuição por Tipo */}
      {stats && stats.byType.length > 0 && (
        <div className="section">
          <h2>📊 Distribuição por Tipo</h2>
          <div className="chart-container">
            {stats.byType.map(item => {
              const percentage = (item.count / stats.total) * 100;
              return (
                <div key={item.action} className="chart-bar">
                  <div className="chart-label">
                    {getAlertTypeLabel(item.action)}
                    <span className="chart-count">({item.count})</span>
                  </div>
                  <div className="chart-bar-outer">
                    <div
                      className="chart-bar-inner"
                      style={{
                        width: `${percentage}%`,
                        background: getSeverityColor(item.action)
                      }}
                    >
                      <span className="chart-bar-text">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de Alertas */}
      <div className="section">
        <h2>🚨 Alertas Recentes</h2>
        {alerts.length === 0 ? (
          <div className="empty-state">
            Nenhum alerta encontrado no período selecionado
          </div>
        ) : (
          <>
            <div className="alerts-list">
              {alerts.map(alert => (
                <div key={alert.id} className="alert-card">
                  <div className="alert-header">
                    <div className="alert-type">
                      {getAlertTypeLabel(alert.action)}
                    </div>
                    <div
                      className="alert-severity"
                      style={{ backgroundColor: getSeverityColor(alert.action) }}
                    >
                      {getSeverityLabel(alert.action)}
                    </div>
                  </div>

                  <div className="alert-user">
                    <User size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                    Usuário: <strong>{alert.username}</strong>
                  </div>

                  {alert.details && typeof alert.details === 'object' && (
                    <div className="alert-details">
                      {alert.details.message && <div>{alert.details.message}</div>}
                      {alert.details.attempts && (
                        <div>Tentativas: {alert.details.attempts}</div>
                      )}
                      {alert.details.country && (
                        <div>País: {alert.details.country}</div>
                      )}
                      {alert.details.payload && (
                        <div className="code-block">
                          Payload: <code>{JSON.stringify(alert.details.payload).substring(0, 100)}...</code>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="alert-footer">
                    <div className="alert-time">
                      <Clock size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                      {getTimeAgo(alert.created_at)}
                    </div>
                    <div className="alert-ip">
                      <Globe size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                      {alert.ip_address}
                    </div>
                    <div className="alert-date">
                      <Clock size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                      {new Date(alert.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            <div className="pagination">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-page"
              >
                ← Anterior
              </button>
              <span className="page-info">
                Página {page + 1}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={alerts.length < limit}
                className="btn-page"
              >
                Próxima →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
