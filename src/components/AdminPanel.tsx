import React, { useState } from 'react';
import {
  Users, Settings, Activity, BarChart3, Shield, ShieldOff
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

  if (user?.role !== 'superadmin' && user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[300px] p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-10 text-center max-w-sm">
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 rounded-full p-4">
              <ShieldOff className="w-10 h-10 text-red-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-red-700 mb-2">Acesso Negado</h2>
          <p className="text-gray-500 text-sm">Apenas administradores podem acessar este painel.</p>
        </div>
      </div>
    );
  }

  const isSuperAdmin = user?.role === 'superadmin';

  const tabs = [
    { id: 'users' as AdminTab, name: 'Usuários', icon: Users },
    ...(isSuperAdmin ? [{ id: 'modules' as AdminTab, name: 'Módulos', icon: Settings }] : []),
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
      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-sm ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-300 hover:text-amber-600'
              }`}
            >
              <Icon className="h-4 w-4" />
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





