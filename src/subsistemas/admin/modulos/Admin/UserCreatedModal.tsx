import React, { useEffect } from 'react';
import { CheckCircle, User, Mail, Key, Copy, Check, X, UserPlus } from 'lucide-react';

interface UserCreatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAnother: () => void;
  userData: {
    username: string;
    email: string;
    role: string;
    inviteToken?: string;
    tempPassword?: string;
  };
}

const UserCreatedModal: React.FC<UserCreatedModalProps> = ({
  isOpen,
  onClose,
  onCreateAnother,
  userData
}) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

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

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Administrador';
      case 'admin': return 'Administrador';
      case 'user': return 'Usuário';
      case 'guest': return 'Convidado';
      default: return role;
    }
  };

  const inviteLink = userData.inviteToken
    ? `${window.location.origin}/login?invite=${userData.inviteToken}`
    : null;

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
        {/* Header com Animação de Sucesso */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 -mx-6 -mt-6 mb-6 px-6 py-8 text-center border-b border-green-400/50">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Usuário Criado com Sucesso!
          </h2>
          <p className="text-green-100">
            As credenciais foram geradas e o convite foi enviado
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Informações do Usuário */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Informações do Usuário
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Nome de usuário:</span>
                <span className="text-sm font-semibold text-gray-900">{userData.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">E-mail:</span>
                <span className="text-sm font-semibold text-gray-900">{userData.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Função:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {getRoleLabel(userData.role)}
                </span>
              </div>
            </div>
          </div>

          {/* Credenciais de Acesso */}
          {(userData.tempPassword || inviteLink) && (
            <div className="bg-amber-50 rounded-lg p-4 border-2 border-amber-200">
              <h3 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Credenciais de Acesso
              </h3>

              {/* Senha Temporária */}
              {userData.tempPassword && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-amber-800 mb-1">
                    Senha Temporária
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded text-sm font-mono text-amber-900">
                      {userData.tempPassword}
                    </code>
                    <button
                      onClick={() => copyToClipboard(userData.tempPassword!, 'password')}
                      className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-100 rounded transition-colors"
                      title="Copiar senha"
                    >
                      {copiedField === 'password' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Link de Convite */}
              {inviteLink && (
                <div>
                  <label className="block text-xs font-medium text-amber-800 mb-1">
                    Link de Convite
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded text-xs font-mono text-amber-900"
                    />
                    <button
                      onClick={() => copyToClipboard(inviteLink, 'link')}
                      className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-100 rounded transition-colors"
                      title="Copiar link"
                    >
                      {copiedField === 'link' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <p className="mt-3 text-xs text-amber-800">
                ⚠️ Guarde essas credenciais em local seguro. O usuário precisará delas para o primeiro acesso.
              </p>
            </div>
          )}

          {/* Email Enviado */}
          {userData.email && !userData.email.includes('@temp.local') && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    E-mail de Convite Enviado
                  </p>
                  <p className="text-xs text-blue-800">
                    Um e-mail foi enviado para <span className="font-semibold">{userData.email}</span> com as instruções de acesso e credenciais temporárias.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Email Não Enviado (Cadastro Simplificado) */}
          {userData.email && userData.email.includes('@temp.local') && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">⚠️</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900 mb-1">
                    E-mail Temporário
                  </p>
                  <p className="text-xs text-yellow-800">
                    Este usuário foi criado com cadastro simplificado. Edite o usuário para adicionar um e-mail válido e enviar o convite.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Próximos Passos */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              📋 Próximos Passos
            </h3>
            <ol className="space-y-2 text-xs text-gray-700">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span>O usuário deve acessar o link de convite ou fazer login com as credenciais</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span>No primeiro acesso, uma nova senha será gerada automaticamente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span>O usuário deve alterar a senha nas configurações do perfil</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="bg-gray-50 px-6 py-4 border-t flex flex-col sm:flex-row justify-between gap-3">
          <button
            onClick={onCreateAnother}
            className="flex items-center justify-center gap-2 px-4 py-2 text-amber-700 border-2 border-amber-500 rounded-lg hover:bg-amber-50 font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Criar Outro Usuário
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium transition-colors"
          >
            <Check className="w-4 h-4" />
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserCreatedModal;
