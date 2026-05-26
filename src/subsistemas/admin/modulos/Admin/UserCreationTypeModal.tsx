import React, { useEffect } from 'react';
import { UserPlus, FileText, Zap, X } from 'lucide-react';

interface UserCreationTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSimple: () => void;
  onSelectComplete: () => void;
}

const UserCreationTypeModal: React.FC<UserCreationTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectSimple,
  onSelectComplete
}) => {
  // Fechar modal com ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center px-4 pb-4 pt-[180px] z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 w-full max-w-2xl max-h-[calc(100vh-220px)] overflow-y-auto shadow-2xl border border-gray-200/50">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 -mx-6 -mt-6 mb-6 px-6 py-4 border-b border-amber-200/50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-amber-700" />
              Criar Novo Usuário
            </h2>
            <button
              onClick={onClose}
              className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-2 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Opção 1: Cadastro Simples */}
          <button
            onClick={onSelectSimple}
            className="group relative overflow-hidden rounded-xl border-2 border-gray-200 p-6 text-left transition-all hover:border-amber-500 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                  <Zap className="w-6 h-6 text-amber-600 group-hover:text-white transition-colors" />
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Rápido
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Cadastro Simplificado
              </h3>

              <p className="text-sm text-gray-600 mb-4 flex-grow">
                Crie rapidamente um usuário com informações básicas. Ideal para acesso imediato ao sistema.
              </p>

              <div className="space-y-2 mb-4">
                <p className="text-xs font-semibold text-gray-700">Campos obrigatórios:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    Nome de usuário
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    Função (admin, user, guest)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    Status (ativo/inativo)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    Módulos de acesso
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500">
                  ⏱️ Tempo estimado: <span className="font-semibold text-gray-700">~1 minuto</span>
                </p>
              </div>
            </div>
          </button>

          {/* Opção 2: Cadastro Completo */}
          <button
            onClick={onSelectComplete}
            className="group relative overflow-hidden rounded-xl border-2 border-gray-200 p-6 text-left transition-all hover:border-amber-500 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                  <FileText className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Completo
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Cadastro Completo
              </h3>

              <p className="text-sm text-gray-600 mb-4 flex-grow">
                Cadastre todas as informações do usuário incluindo dados pessoais, contato e endereço.
              </p>

              <div className="space-y-2 mb-4">
                <p className="text-xs font-semibold text-gray-700">Campos adicionais:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Nome completo
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    E-mail, telefone, CPF
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Data de nascimento, gênero
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Cargo e endereço completo
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500">
                  ⏱️ Tempo estimado: <span className="font-semibold text-gray-700">~3-5 minutos</span>
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Info Footer */}
        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">💡</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 mb-1">Dica</p>
              <p className="text-xs text-amber-800">
                Você pode começar com o cadastro simplificado e depois editar o usuário para adicionar mais informações.
                Após criar um usuário completo, você terá a opção de criar outro rapidamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserCreationTypeModal;
