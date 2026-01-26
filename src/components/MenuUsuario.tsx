import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Edit, Key, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UserProfileModal from './UserProfileModal';
import AlterarUsernameModal from './AlterarUsernameModal';
import AlterarSenhaModal from './AlterarSenhaModal';
import EditarPerfilModal from './EditarPerfilModal';
import LazyAvatar from './LazyAvatar';

interface MenuUsuarioProps {
  onLogout?: () => void;
}

const MenuUsuario: React.FC<MenuUsuarioProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      // Calcular posição do dropdown baseado na posição do botão
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right
        });
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  if (!user) return null;

  const handleMenuClick = () => {
    setShowMenu(!showMenu);
  };

  const handleProfileClick = () => {
    setShowProfileModal(true);
    setShowMenu(false);
  };

  const handleUsernameClick = () => {
    setShowUsernameModal(true);
    setShowMenu(false);
  };

  const handlePasswordClick = () => {
    setShowPasswordModal(true);
    setShowMenu(false);
  };

  const handleEditProfileClick = () => {
    setShowEditProfileModal(true);
    setShowMenu(false);
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.username || 'Usuário';
  };

  const dropdownContent = showMenu ? (
    <div
      ref={menuRef}
      className="fixed w-56 bg-white rounded-xl shadow-lg border border-amber-200/50 overflow-hidden z-[9999] transition-all duration-200"
      style={{
        top: `${dropdownPosition.top}px`,
        right: `${dropdownPosition.right}px`
      }}
    >
      <div className="py-2">
        <button
          onClick={handleProfileClick}
          className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-amber-50 transition-colors text-gray-700"
        >
          <User className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium">Ver Perfil</span>
        </button>

        <button
          onClick={handleUsernameClick}
          className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-amber-50 transition-colors text-gray-700"
        >
          <Edit className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium">Alterar Username</span>
        </button>

        <button
          onClick={handlePasswordClick}
          className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-amber-50 transition-colors text-gray-700 min-h-[44px]"
        >
          <Key className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium">Alterar Senha</span>
        </button>

        <button
          onClick={handleEditProfileClick}
          className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-amber-50 transition-colors text-gray-700 min-h-[44px]"
        >
          <Edit className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium">Editar Perfil</span>
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleMenuClick}
          className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 transition-colors shadow-sm overflow-hidden"
          title={getUserDisplayName()}
        >
          <LazyAvatar
            photoUrl={user.photoUrl}
            firstName={user.firstName}
            lastName={user.lastName}
            username={user.username}
            size="sm"
            className="w-full h-full"
          />
        </button>
      </div>

      {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}

      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      <AlterarUsernameModal
        isOpen={showUsernameModal}
        onClose={() => setShowUsernameModal(false)}
        currentUsername={user.username}
      />

      <AlterarSenhaModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      <EditarPerfilModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
      />
    </>
  );
};

export default MenuUsuario;
