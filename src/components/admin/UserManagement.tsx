import React, { useState, useEffect } from 'react';
import {
  UserPlus, Trash2, Eye, EyeOff, Lock, Unlock, Search, X, Save, RefreshCw, AlertTriangle, Edit, LogIn
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useModules } from '../../hooks/useModules';
import { API_BASE_URL } from '../../config/api';
import CadastrarUsuarioModal from '../CadastrarUsuarioModal';
import EditarUsuarioModal from '../EditarUsuarioModal';
import UserCreationTypeModal from './UserCreationTypeModal';
import SimpleUserModal from './SimpleUserModal';
import UserCreatedModal from './UserCreatedModal';
import LazyAvatar from '../LazyAvatar';
import { applyPhoneMask } from '../../utils/phoneMask';

interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  role: string;
  modules?: string[];
  isActive?: boolean;
  lastLogin?: string;
  createdAt: string;
}

const UserManagement: React.FC = () => {
  const { user: currentUser, token, impersonate } = useAuth();
  const { modules } = useModules();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [isResettingIndividual, setIsResettingIndividual] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Novos estados para o fluxo de criação de usuários
  const [showCreationTypeModal, setShowCreationTypeModal] = useState(false);
  const [showSimpleUserModal, setShowSimpleUserModal] = useState(false);
  const [showUserCreatedModal, setShowUserCreatedModal] = useState(false);
  const [createdUserData, setCreatedUserData] = useState<any>(null);

  const [newUser, setNewUser] = useState({
    username: '',
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

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username;
  };

  const getDefaultModulesForRole = (role: string): string[] => {
    switch (role) {
      case 'superadmin':
        return modules.filter(m => m.isActive).map(m => m.key);
      case 'admin':
        return modules.filter(m => m.isActive && !['activeSessions', 'anomalies', 'securityAlerts'].includes(m.key)).map(m => m.key);
      case 'user':
        return ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas', 'dre'];
      case 'guest':
        return ['dashboard', 'metas', 'reports', 'dre'];
      default:
        return [];
    }
  };

  const handleUpdateUser = async (userId: string, updates: any) => {
    // Ao trocar role, atualizar módulos automaticamente
    if (updates.role) {
      updates.modules = getDefaultModulesForRole(updates.role);
    }

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

  const handleResetAllPasswords = async () => {
    setIsResetting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-all-passwords`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (result.success) {
        alert(`✅ ${result.message}\n\n${result.resetCount} usuário(s) precisarão fazer primeiro login novamente.`);
        setShowResetAllModal(false);
        loadUsers(); // Recarregar lista de usuários
      } else {
        alert(result.error || 'Erro ao resetar senhas');
      }
    } catch (error) {
      console.error('Erro ao resetar senhas:', error);
      alert('Erro ao resetar senhas');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetIndividualPassword = async () => {
    if (!userToReset) return;

    setIsResettingIndividual(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-first-login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: userToReset.username })
      });
      const result = await response.json();
      if (result.success) {
        alert(`✅ ${result.message}`);
        setUserToReset(null);
        loadUsers(); // Recarregar lista de usuários
      } else {
        alert(result.error || 'Erro ao resetar senha');
      }
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      alert('Erro ao resetar senha');
    } finally {
      setIsResettingIndividual(false);
    }
  };

  // Handlers para o fluxo de criação de usuários
  const handleSelectSimple = () => {
    setShowCreationTypeModal(false);
    setShowSimpleUserModal(true);
  };

  const handleSelectComplete = () => {
    setShowCreationTypeModal(false);
    setShowUserModal(true);
  };

  const handleUserCreatedFromSimple = (result: any) => {
    // Combinar dados do usuário com invite em um formato que o modal espera
    const userData = {
      username: result.data.username,
      email: result.data.email,
      role: result.data.role,
      inviteToken: result.invite?.token,
      tempPassword: result.invite?.tempPassword
    };
    setCreatedUserData(userData);
    setShowSimpleUserModal(false);
    setShowUserCreatedModal(true);
    loadUsers();
  };

  const handleUserCreatedFromComplete = (result: any) => {
    // Combinar dados do usuário com invite em um formato que o modal espera
    const userData = {
      username: result.data.username,
      email: result.data.email,
      role: result.data.role,
      inviteToken: result.invite?.token,
      tempPassword: result.invite?.tempPassword
    };
    setCreatedUserData(userData);
    setShowUserCreatedModal(true);
    loadUsers();
  };

  const handleCreateAnother = () => {
    setShowUserCreatedModal(false);
    setCreatedUserData(null);
    setShowCreationTypeModal(true);
  };

  const handleCloseUserCreatedModal = () => {
    setShowUserCreatedModal(false);
    setCreatedUserData(null);
  };

  const filteredUsers = users.filter(u => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      u.username.toLowerCase().includes(searchLower) ||
      (u.firstName && u.firstName.toLowerCase().includes(searchLower)) ||
      (u.lastName && u.lastName.toLowerCase().includes(searchLower)) ||
      (u.email && u.email.toLowerCase().includes(searchLower));
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && u.isActive !== false) ||
      (filterStatus === 'inactive' && u.isActive === false);

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-amber-900">Gerenciar Usuários</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowResetAllModal(true)}
            className="flex items-center px-4 py-2 bg-white border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium"
            title="Resetar senhas de todos os usuários"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Resetar Todas as Senhas
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <button
            onClick={() => setShowCreationTypeModal(true)}
            className="flex items-center px-5 py-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-xl hover:from-amber-500 hover:to-orange-500 shadow-lg transition-all font-semibold"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200 shadow-lg flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            id="user-search-filter"
            name="user-search-filter"
            type="text"
            placeholder="Buscar por nome, username ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <select
          id="user-role-filter"
          name="user-role-filter"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">Todas as funções</option>
          <option value="superadmin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="user">Usuário</option>
          <option value="guest">Convidado</option>
        </select>
        <select
          id="user-status-filter"
          name="user-status-filter"
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
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
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
                    <div className="flex items-center gap-3">
                      <LazyAvatar
                        photoUrl={u.photoUrl}
                        firstName={u.firstName}
                        lastName={u.lastName}
                        username={u.username}
                        size="sm"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getUserDisplayName(u)}
                        </div>
                        <div className="text-sm text-gray-500">@{u.username}</div>
                        {u.email && (
                          <div className="text-xs text-gray-400">{u.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${
                        u.role === 'superadmin' ? 'bg-violet-100 text-violet-700' :
                        u.role === 'admin' ? 'bg-amber-100 text-amber-700' :
                        u.role === 'user' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {u.role === 'superadmin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : u.role === 'user' ? 'Usuário' : 'Convidado'}
                      </span>
                      <select
                        id={`user-role-${u.id}`}
                        name={`user-role-${u.id}`}
                        value={u.role}
                        onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 text-gray-600"
                      >
                        {currentUser?.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                        <option value="admin">Admin</option>
                        <option value="user">Usuário</option>
                        <option value="guest">Convidado</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2 max-w-md">
                      {modules.filter(m => m.isActive).map((mod) => {
                        const superadminOnly = ['activeSessions', 'anomalies', 'securityAlerts'].includes(mod.key);
                        const isRestricted = superadminOnly && currentUser?.role !== 'superadmin';
                        const effectiveModules = u.role === 'superadmin'
                          ? modules.filter(m => m.isActive).map(m => m.key)
                          : (u.modules || []);
                        const hasAccess = effectiveModules.includes(mod.key);
                        return (
                          <button
                            key={mod.id}
                            onClick={() => !isRestricted && toggleModuleForUser(u.id, mod.key)}
                            title={isRestricted ? 'Apenas o super administrador pode gerenciar este módulo' : undefined}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              isRestricted
                                ? 'opacity-40 cursor-not-allowed ' + (hasAccess ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-700')
                                : hasAccess
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {mod.name}
                            {hasAccess ? (
                              <Eye className="inline ml-1 h-3 w-3" />
                            ) : (
                              <EyeOff className="inline ml-1 h-3 w-3" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${u.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
                      {u.isActive !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Nunca'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingUser(u); setShowEditModal(true); }}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                        title="Editar Usuário"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setUserToReset(u)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="Resetar Senha"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleUpdateUser(u.id, { isActive: !(u.isActive !== false) })}
                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-800 transition-colors"
                        title={u.isActive !== false ? 'Desativar' : 'Ativar'}
                      >
                        {u.isActive !== false ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </button>
                      {u.id !== currentUser?.id && currentUser?.role === 'superadmin' && u.role !== 'superadmin' && (
                        <button
                          onClick={() => impersonate(u.id)}
                          className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 hover:text-purple-800 transition-colors"
                          title={`Logar como ${u.username}`}
                        >
                          <LogIn className="h-4 w-4" />
                        </button>
                      )}
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors"
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4" />
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
          <div className="flex flex-col items-center gap-3 py-12">
            <Users className="w-12 h-12 text-gray-300" />
            <p className="text-gray-500 font-medium">Nenhum usuário encontrado</p>
            <p className="text-gray-400 text-sm">Tente ajustar os filtros</p>
          </div>
        )}
      </div>

      {/* Modal de Novo Usuário */}
      {/* Modal de Seleção do Tipo de Cadastro */}
      <UserCreationTypeModal
        isOpen={showCreationTypeModal}
        onClose={() => setShowCreationTypeModal(false)}
        onSelectSimple={handleSelectSimple}
        onSelectComplete={handleSelectComplete}
      />

      {/* Modal de Cadastro Simplificado */}
      <SimpleUserModal
        isOpen={showSimpleUserModal}
        onClose={() => setShowSimpleUserModal(false)}
        onSuccess={handleUserCreatedFromSimple}
        availableModules={modules}
      />

      {/* Modal de Cadastro Completo */}
      <CadastrarUsuarioModal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
        }}
        onSuccess={loadUsers}
        onUserCreated={handleUserCreatedFromComplete}
      />

      {/* Modal de Confirmação de Usuário Criado */}
      {createdUserData && (
        <UserCreatedModal
          isOpen={showUserCreatedModal}
          onClose={handleCloseUserCreatedModal}
          onCreateAnother={handleCreateAnother}
          userData={createdUserData}
        />
      )}

      {/* Modal de Editar Usuário */}
      <EditarUsuarioModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
        }}
        onSuccess={loadUsers}
        user={editingUser}
      />

      {/* Modal de Confirmação para Resetar Todas as Senhas */}
      {showResetAllModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 pb-4 pt-[180px]">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 max-w-md w-full mx-4 max-h-[calc(100vh-220px)] overflow-y-auto shadow-2xl border border-gray-200/50">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-red-200/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h3 className="text-xl font-bold text-red-800">Confirmar Reset de Senhas</h3>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Tem certeza que deseja resetar as senhas de <strong>todos os usuários</strong>?
              <br /><br />
              Todos os usuários precisarão fazer primeiro login novamente e receberão uma nova senha gerada automaticamente.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetAllModal(false)}
                disabled={isResetting}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetAllPasswords}
                disabled={isResetting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Resetando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Confirmar Reset
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Resetar Senha Individual */}
      {userToReset && (
        <div className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 pb-4 pt-[180px]">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 max-w-md w-full mx-4 max-h-[calc(100vh-220px)] overflow-y-auto shadow-2xl border border-gray-200/50">
            <div className="bg-gradient-to-r from-blue-50 to-amber-50 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-blue-200/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-blue-800">Confirmar Reset de Senha</h3>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Tem certeza que deseja resetar a senha do usuário <strong>{userToReset.username}</strong>?
              <br /><br />
              O usuário precisará fazer primeiro login novamente e receberá uma nova senha gerada automaticamente.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setUserToReset(null)}
                disabled={isResettingIndividual}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetIndividualPassword}
                disabled={isResettingIndividual}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center"
              >
                {isResettingIndividual ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Resetando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Confirmar Reset
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

