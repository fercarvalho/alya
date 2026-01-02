import React, { useState, useEffect } from 'react';
import { 
  Download, Filter, X, Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useModules } from '../../hooks/useModules';

const API_BASE_URL = 'http://localhost:8001/api';

interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  details?: any;
  timestamp: string;
}

const ActivityLog: React.FC = () => {
  const { token } = useAuth();
  const { modules } = useModules();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    module: '',
    action: '',
    startDate: '',
    endDate: ''
  });
  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => {
    loadLogs();
  }, [filters, page]);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.userId) queryParams.append('userId', filters.userId);
      if (filters.module) queryParams.append('module', filters.module);
      if (filters.action) queryParams.append('action', filters.action);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      queryParams.append('limit', limit.toString());
      queryParams.append('page', page.toString());

      const response = await fetch(`${API_BASE_URL}/admin/activity-log?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (result.success) {
        setLogs(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    const data = logs.map(log => ({
      Usuário: log.username,
      Ação: log.action,
      Módulo: log.module,
      Tipo: log.entityType || '',
      Data: new Date(log.timestamp).toLocaleString(),
      Detalhes: JSON.stringify(log.details || {})
    }));

    if (format === 'csv') {
      const headers = Object.keys(data[0] || {});
      const csv = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    }
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      module: '',
      action: '',
      startDate: '',
      endDate: ''
    });
    setPage(1);
  };

  const actionLabels: Record<string, string> = {
    'create': 'Criar',
    'edit': 'Editar',
    'delete': 'Deletar',
    'login': 'Login',
    'permission_change': 'Mudança de Permissão'
  };

  const uniqueUsers = Array.from(new Set(logs.map(log => log.username)));
  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-amber-900">Histórico de Atividades</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Download className="h-5 w-5 mr-2" />
            Exportar CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Download className="h-5 w-5 mr-2" />
            Exportar JSON
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filtros</h3>
          <button
            onClick={clearFilters}
            className="ml-auto text-sm text-amber-600 hover:text-amber-800"
          >
            Limpar filtros
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
            <select
              value={filters.userId}
              onChange={(e) => {
                setFilters({ ...filters, userId: e.target.value });
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Todos</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Módulo</label>
            <select
              value={filters.module}
              onChange={(e) => {
                setFilters({ ...filters, module: e.target.value });
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Todos</option>
              {modules.map(mod => (
                <option key={mod.id} value={mod.key}>{mod.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ação</label>
            <select
              value={filters.action}
              onChange={(e) => {
                setFilters({ ...filters, action: e.target.value });
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Todas</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{actionLabels[action] || action}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                setFilters({ ...filters, startDate: e.target.value });
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                setFilters({ ...filters, endDate: e.target.value });
                setPage(1);
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-amber-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">Ação</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">Módulo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">Entidade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {log.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      log.action === 'create' ? 'bg-green-100 text-green-800' :
                      log.action === 'edit' ? 'bg-blue-100 text-blue-800' :
                      log.action === 'delete' ? 'bg-red-100 text-red-800' :
                      log.action === 'login' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.module}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.entityType || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && (
          <div className="text-center py-8 text-gray-500">Nenhum log encontrado</div>
        )}
        {logs.length > 0 && (
          <div className="px-6 py-4 border-t flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Mostrando {logs.length} registro(s)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-sm">Página {page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={logs.length < limit}
                className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;

