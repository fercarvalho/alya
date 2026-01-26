/**
 * Aplica máscara de CPF no formato 000.000.000-00
 * @param value Valor a ser mascarado
 * @returns String com máscara aplicada
 */
export function applyCpfMask(value: string): string {
  // Remover todos os caracteres não numéricos
  const numbers = value.replace(/\D/g, '');
  
  // Limitar a 11 dígitos
  const limitedNumbers = numbers.slice(0, 11);
  
  // Aplicar máscara
  if (limitedNumbers.length <= 3) {
    return limitedNumbers;
  } else if (limitedNumbers.length <= 6) {
    return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3)}`;
  } else if (limitedNumbers.length <= 9) {
    return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3, 6)}.${limitedNumbers.slice(6)}`;
  } else {
    return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3, 6)}.${limitedNumbers.slice(6, 9)}-${limitedNumbers.slice(9)}`;
  }
}

/**
 * Remove máscara do CPF, retornando apenas números
 * @param value Valor com máscara
 * @returns String apenas com números
 */
export function removeCpfMask(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida formato de CPF brasileiro
 * @param cpf CPF a ser validado (pode ter máscara)
 * @returns Objeto com isValid e mensagem de erro opcional
 */
export function validateCpfFormat(cpf: string): { isValid: boolean; error?: string } {
  if (!cpf || cpf.trim() === '') {
    return { isValid: true }; // CPF é opcional por enquanto
  }

  const cpfDigits = removeCpfMask(cpf);
  
  // CPF deve ter 11 dígitos
  if (cpfDigits.length !== 11) {
    return { isValid: false, error: 'CPF deve ter 11 dígitos' };
  }

  // Verificar se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(cpfDigits)) {
    return { isValid: false, error: 'CPF inválido' };
  }

  // Validar dígitos verificadores
  let sum = 0;
  let remainder: number;

  // Validar primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpfDigits.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpfDigits.substring(9, 10))) {
    return { isValid: false, error: 'CPF inválido' };
  }

  // Validar segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpfDigits.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpfDigits.substring(10, 11))) {
    return { isValid: false, error: 'CPF inválido' };
  }

  return { isValid: true };
}
