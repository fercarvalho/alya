import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Edit, Trash2, Eye, EyeOff, Lock, Unlock, Search, X, Save
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useModules } from '../../hooks/useModules';
import { API_BASE_URL } from '../../config/api';

interface User {
  id: string;
  username: string;
  role: string;
  modules?: string[];
  isActive?: boolean;
  lastLogin?: string;
  createdAt: string;
}

const UserManagement: React.FC = () => {
  const { user: currentUser, token } = useAuth();
  const { modules } = useModules();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user',
    modules: [] as string[],
    isActive: true
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      });
      const result = await response.json();
      if (result.success) {
        setShowUserModal(false);
        setNewUser({
          username: '',
          password: '',
          role: 'user',
          modules: [],
          isActive: true
        });
        loadUsers();
      } else {
        alert(result.error || 'Erro ao criar usuário');
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      alert('Erro ao criar usuário');
    }
  };

  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      const result = await response.json();
      if (result.success) {
        loadUsers();
      } else {
        alert(result.error || 'Erro ao atualizar usuário');
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      alert('Erro ao atualizar usuário');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (result.success) {
        loadUsers();
      } else {
        alert(result.error || 'Erro ao deletar usuário');
      }
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      alert('Erro ao deletar usuário');
    }
  };

  const toggleModuleForUser = (userId: string, moduleKey: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const currentModules = user.modules || [];
    const newModules = currentModules.includes(moduleKey)
      ? currentModules.filter(m => m !== moduleKey)
      : [...currentModules, moduleKey];
    
    handleUpdateUser(userId, { modules: newModules });
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && u.isActive !== false) ||
      (filterStatus === 'inactive' && u.isActive === false);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-amber-900">Gerenciar Usuários</h2>
        <button
          onClick={() => setShowUserModal(true)}
          className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Novo Usuário
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Buscar por username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">Todas as funções</option>
          <option value="admin">Admin</option>
          <option value="user">Usuário</option>
          <option value="guest">Convidado</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-amber-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">Função</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">Módulos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">Último Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{u.username}</div>
                      <div className="text-sm text-gray-500">Criado em {new Date(u.createdAt).toLocaleDateString()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                      className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="admin">Admin</option>
                      <option value="user">Usuário</option>
                      <option value="guest">Convidado</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2 max-w-md">
                      {modules.filter(m => m.isActive).map((mod) => (
                        <button
                          key={mod.id}
                          onClick={() => toggleModuleForUser(u.id, mod.key)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            (u.modules || []).includes(mod.key)
                              ? 'bg-amber-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {mod.name}
                          {(u.modules || []).includes(mod.key) ? (
                            <Eye className="inline ml-1 h-3 w-3" />
                          ) : (
                            <EyeOff className="inline ml-1 h-3 w-3" />
                          )}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      u.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {u.isActive !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Nunca'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateUser(u.id, { isActive: !(u.isActive !== false) })}
                        className="text-amber-600 hover:text-amber-800"
                        title={u.isActive !== false ? 'Desativar' : 'Ativar'}
                      >
                        {u.isActive !== false ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                      </button>
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Deletar"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">Nenhum usuário encontrado</div>
        )}
      </div>

      {/* Modal de Novo Usuário */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Novo Usuário</h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  placeholder="Username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  placeholder="Senha (mínimo 6 caracteres)"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="admin">Admin</option>
                  <option value="user">Usuário</option>
                  <option value="guest">Convidado</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateUser}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                >
                  <Save className="inline h-4 w-4 mr-1" />
                  Criar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

