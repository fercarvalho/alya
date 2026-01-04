import React, { useState } from 'react';
import { 
  Users, Settings, Activity, BarChart3, Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UserManagement from './admin/UserManagement';
import ModuleManagement from './admin/ModuleManagement';
import ActivityLog from './admin/ActivityLog';
import Statistics from './admin/Statistics';

type AdminTab = 'users' | 'modules' | 'activity' | 'statistics';

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  if (user?.role !== 'admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 text-lg">Acesso negado. Apenas administradores podem acessar este painel.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'users' as AdminTab, name: 'Usuários', icon: Users },
    { id: 'modules' as AdminTab, name: 'Módulos', icon: Settings },
    { id: 'activity' as AdminTab, name: 'Atividades', icon: Activity },
    { id: 'statistics' as AdminTab, name: 'Estatísticas', icon: BarChart3 }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-amber-600" />
          <h1 className="text-3xl font-bold text-amber-900">Painel Administrativo</h1>
        </div>
        <p className="text-gray-600">Gerencie usuários, módulos e visualize estatísticas do sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-amber-600'
              }`}
            >
              <Icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'modules' && <ModuleManagement />}
        {activeTab === 'activity' && <ActivityLog />}
        {activeTab === 'statistics' && <Statistics />}
      </div>
    </div>
  );
};

export default AdminPanel;



