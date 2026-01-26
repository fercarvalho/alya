/**
 * Valida formato de email usando regex robusto
 * @param email Email a ser validado
 * @returns Objeto com isValid e mensagem de erro opcional
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email é obrigatório' };
  }

  const trimmedEmail = email.trim();

  // Verificar comprimento
  if (trimmedEmail.length < 5 || trimmedEmail.length > 254) {
    return { isValid: false, error: 'Email deve ter entre 5 e 254 caracteres' };
  }

  // Verificar que não começa ou termina com ponto ou hífen
  if (trimmedEmail.startsWith('.') || trimmedEmail.startsWith('-') || 
      trimmedEmail.endsWith('.') || trimmedEmail.endsWith('-')) {
    return { isValid: false, error: 'Email inválido' };
  }

  // Regex RFC 5322 simplificado
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Formato de email inválido' };
  }

  // Verificar que domínio tem pelo menos um ponto após o @
  const parts = trimmedEmail.split('@');
  if (parts.length !== 2 || !parts[1].includes('.')) {
    return { isValid: false, error: 'Formato de email inválido' };
  }

  return { isValid: true };
}
