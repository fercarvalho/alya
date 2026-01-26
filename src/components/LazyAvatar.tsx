import React, { useState, useEffect, useRef } from 'react';
import { getUserInitials, getAvatarUrl, getAvatarColor } from '../utils/avatarUtils';

interface LazyAvatarProps {
  photoUrl?: string;
  firstName?: string;
  lastName?: string;
  username: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LazyAvatar: React.FC<LazyAvatarProps> = ({
  photoUrl,
  firstName,
  lastName,
  username,
  size = 'md',
  className = ''
}) => {
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Verificar se IntersectionObserver está disponível
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      // Fallback: carregar imediatamente se IntersectionObserver não estiver disponível
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px' // Começar a carregar um pouco antes de entrar na viewport
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const avatarUrl = getAvatarUrl(photoUrl);
  const initials = getUserInitials(firstName, lastName, username);
  const bgColor = getAvatarColor(username);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-24 h-24 sm:w-32 sm:h-32 text-xl sm:text-2xl'
  };

  const handleImageError = () => {
    setHasError(true);
  };

  // Se não há foto ou houve erro, mostrar avatar padrão
  if (!avatarUrl || hasError || !isInView) {
    return (
      <div
        ref={containerRef}
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-white ${className}`}
        style={{ backgroundColor: bgColor }}
      >
        {initials}
      </div>
    );
  }

  // Se há foto e está na viewport, carregar imagem
  return (
    <div ref={containerRef} className={`${sizeClasses[size]} rounded-full overflow-hidden ${className}`}>
      <img
        ref={imgRef}
        src={avatarUrl}
        alt={`${firstName || ''} ${lastName || ''}`.trim() || username}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={handleImageError}
      />
    </div>
  );
};

export default LazyAvatar;
