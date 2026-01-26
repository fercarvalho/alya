/**
 * Gera iniciais do usuário baseado no nome, sobrenome ou username
 * @param firstName Primeiro nome (opcional)
 * @param lastName Sobrenome (opcional)
 * @param username Username (obrigatório como fallback)
 * @returns String com iniciais (máximo 2 caracteres)
 */
export function getUserInitials(
  firstName?: string,
  lastName?: string,
  username: string = ''
): string {
  if (firstName && lastName) {
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  }
  
  if (firstName) {
    const initials = firstName.substring(0, 2).toUpperCase();
    return initials.length === 1 ? initials + initials : initials;
  }
  
  if (lastName) {
    const initials = lastName.substring(0, 2).toUpperCase();
    return initials.length === 1 ? initials + initials : initials;
  }
  
  // Fallback para username
  if (username) {
    const initials = username.substring(0, 2).toUpperCase();
    return initials.length === 1 ? initials + initials : initials;
  }
  
  return '??';
}

/**
 * Retorna a URL da foto do usuário ou null se não houver foto
 * @param photoUrl URL da foto (opcional)
 * @returns string | null
 */
export function getAvatarUrl(photoUrl?: string): string | null {
  if (!photoUrl) return null;
  
  // Se já é uma URL completa, retornar como está
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  
  // Se começa com /api/avatars, adicionar base URL se necessário
  if (photoUrl.startsWith('/api/avatars')) {
    return photoUrl;
  }
  
  // Caso contrário, assumir que é um caminho relativo
  return `/api/avatars/${photoUrl}`;
}

/**
 * Gera uma cor de fundo consistente baseada no username
 * @param username Username do usuário
 * @returns String com cor hexadecimal
 */
export function getAvatarColor(username: string): string {
  // Lista de cores pastéis para avatares
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
    '#EC7063', '#5DADE2', '#58D68D', '#F4D03F', '#AF7AC5',
    '#F1948A', '#7FB3D3', '#82E0AA', '#F9E79F', '#C39BD3'
  ];
  
  // Gerar hash simples do username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Usar valor absoluto do hash para selecionar cor
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
