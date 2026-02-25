import React, { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, Save, X, Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SystemModule, useModules } from '../../hooks/useModules';
import { API_BASE_URL } from '../../config/api';

const ModuleManagement: React.FC = () => {
  const { token } = useAuth();
  const { modules, loadModules } = useModules();
  // const [isLoading, setIsLoading] = useState(false); // Reservado para uso futuro
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<SystemModule | null>(null);

  const [newModule, setNewModule] = useState({
    name: '',
    key: '',
    icon: 'Package',
    description: '',
    route: '',
    isActive: true
  });

  useEffect(() => {
    loadModules();
  }, []);

  const handleCreateModule = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/modules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newModule,
          route: newModule.route || null
        })
      });
      const result = await response.json();
      if (result.success) {
        setShowModuleModal(false);
        setNewModule({
          name: '',
          key: '',
          icon: 'Package',
          description: '',
          route: '',
          isActive: true
        });
        loadModules();
      } else {
        alert(result.error || 'Erro ao criar módulo');
      }
    } catch (error) {
      console.error('Erro ao criar módulo:', error);
      alert('Erro ao criar módulo');
    }
  };

  const handleUpdateModule = async (moduleId: string, updates: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/modules/${moduleId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      const result = await response.json();
      if (result.success) {
        loadModules();
      } else {
        alert(result.error || 'Erro ao atualizar módulo');
      }
    } catch (error) {
      console.error('Erro ao atualizar módulo:', error);
      alert('Erro ao atualizar módulo');
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Tem certeza que deseja deletar este módulo?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/modules/${moduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (result.success) {
        loadModules();
      } else {
        alert(result.error || 'Erro ao deletar módulo');
      }
    } catch (error) {
      console.error('Erro ao deletar módulo:', error);
      alert('Erro ao deletar módulo');
    }
  };

  const openEditModal = (module: SystemModule) => {
    setEditingModule(module);
    setNewModule({
      name: module.name,
      key: module.key,
      icon: module.icon,
      description: module.description || '',
      route: module.route || '',
      isActive: module.isActive
    });
    setShowModuleModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingModule) return;

    try {
      const updates = {
        name: newModule.name,
        key: newModule.key,
        icon: newModule.icon,
        description: newModule.description,
        route: newModule.route || null,
        isActive: newModule.isActive
      };

      await handleUpdateModule(editingModule.id, updates);
      setShowModuleModal(false);
      setEditingModule(null);
      setNewModule({
        name: '',
        key: '',
        icon: 'Package',
        description: '',
        route: '',
        isActive: true
      });
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
    }
  };

  const commonIcons = ['Home', 'DollarSign', 'Package', 'Users', 'BarChart3', 'Target', 'Shield', 'Settings', 'Activity', 'TrendingUp'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-amber-900">Gerenciar Módulos</h2>
        <button
          onClick={() => {
            setEditingModule(null);
            setNewModule({
              name: '',
              key: '',
              icon: 'Package',
              description: '',
              route: '',
              isActive: true
            });
            setShowModuleModal(true);
          }}
          className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Módulo
        </button>
      </div>

      {/* Lista de Módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => (
          <div
            key={module.id}
            className={`bg-white rounded-lg shadow p-6 border-2 ${module.isSystem ? 'border-amber-300' : 'border-gray-200'
              }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                {module.isSystem && <Shield className="h-5 w-5 text-amber-600" />}
                <h3 className="text-lg font-semibold text-gray-900">{module.name}</h3>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${module.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                {module.isActive ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Key:</span>
                <span className="ml-2 text-sm text-gray-900 font-mono">{module.key}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Ícone:</span>
                <span className="ml-2 text-sm text-gray-900">{module.icon}</span>
              </div>
              {module.description && (
                <div>
                  <span className="text-sm text-gray-600">{module.description}</span>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500">
                  {module.isSystem ? 'Módulo do Sistema' : 'Módulo Customizado'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleUpdateModule(module.id, { isActive: !module.isActive })}
                className="flex-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                {module.isActive ? 'Desativar' : 'Ativar'}
              </button>
              <button
                onClick={() => openEditModal(module)}
                className="px-3 py-2 text-sm text-amber-600 hover:text-amber-800"
                title="Editar"
              >
                <Edit className="h-4 w-4" />
              </button>
              {!module.isSystem && (
                <button
                  onClick={() => handleDeleteModule(module.id)}
                  className="px-3 py-2 text-sm text-red-600 hover:text-red-800"
                  title="Deletar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Criar/Editar Módulo */}
      {showModuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4 pb-4 pt-[180px]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[calc(100vh-220px)] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {editingModule ? 'Editar Módulo' : 'Novo Módulo'}
              </h3>
              <button
                onClick={() => {
                  setShowModuleModal(false);
                  setEditingModule(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  placeholder="Nome do módulo"
                  value={newModule.name}
                  onChange={(e) => setNewModule({ ...newModule, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key (única)</label>
                <input
                  type="text"
                  placeholder="key-do-modulo"
                  value={newModule.key}
                  onChange={(e) => setNewModule({ ...newModule, key: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  disabled={!!editingModule}
                />
                {editingModule && (
                  <p className="text-xs text-gray-500 mt-1">A key não pode ser alterada</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ícone (Lucide)</label>
                <select
                  value={newModule.icon}
                  onChange={(e) => setNewModule({ ...newModule, icon: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {commonIcons.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  placeholder="Descrição do módulo"
                  value={newModule.description}
                  onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rota (opcional)</label>
                <input
                  type="text"
                  placeholder="/rota-customizada"
                  value={newModule.route}
                  onChange={(e) => setNewModule({ ...newModule, route: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newModule.isActive}
                  onChange={(e) => setNewModule({ ...newModule, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Módulo ativo</label>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => {
                    setShowModuleModal(false);
                    setEditingModule(null);
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={editingModule ? handleSaveEdit : handleCreateModule}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                >
                  <Save className="inline h-4 w-4 mr-1" />
                  {editingModule ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleManagement;

