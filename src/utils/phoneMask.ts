/**
 * Aplica máscara de telefone brasileiro no formato (00) 00000-0000 ou (00) 0000-0000
 * @param value Valor a ser mascarado
 * @returns String com máscara aplicada
 */
export function applyPhoneMask(value: string): string {
  // Remover todos os caracteres não numéricos
  const numbers = value.replace(/\D/g, '');
  
  // Aplicar máscara baseado no número de dígitos
  if (numbers.length <= 2) {
    return numbers.length > 0 ? `(${numbers}` : '';
  } else if (numbers.length <= 6) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  } else if (numbers.length <= 10) {
    // Telefone fixo: (00) 0000-0000
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  } else {
    // Telefone celular: (00) 00000-0000
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  }
}

/**
 * Remove máscara do telefone, retornando apenas números
 * @param value Valor com máscara
 * @returns String apenas com números
 */
export function removePhoneMask(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida formato de telefone brasileiro
 * @param phone Telefone a ser validado (pode ter máscara)
 * @returns Objeto com isValid e mensagem de erro opcional
 */
export function validatePhoneFormat(phone: string): { isValid: boolean; error?: string } {
  if (!phone || phone.trim() === '') {
    return { isValid: true }; // Telefone é opcional
  }

  const phoneDigits = removePhoneMask(phone);
  
  // Telefone brasileiro deve ter 10 ou 11 dígitos
  if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
    return { isValid: false, error: 'Telefone deve ter 10 ou 11 dígitos' };
  }

  // Verificar que todos os dígitos são números
  if (!/^\d+$/.test(phoneDigits)) {
    return { isValid: false, error: 'Telefone deve conter apenas números' };
  }

  return { isValid: true };
}
