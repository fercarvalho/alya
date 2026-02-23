/**
 * Aplica máscara de CEP no formato 00000-000
 * @param value Valor a ser mascarado
 * @returns String com máscara aplicada
 */
export function applyCepMask(value: string): string {
  // Remover todos os caracteres não numéricos
  const numbers = value.replace(/\D/g, '');

  // Limitar a 8 dígitos
  const limitedNumbers = numbers.slice(0, 8);

  // Aplicar máscara
  if (limitedNumbers.length <= 5) {
    return limitedNumbers;
  } else {
    return `${limitedNumbers.slice(0, 5)}-${limitedNumbers.slice(5)}`;
  }
}

/**
 * Remove máscara do CEP, retornando apenas números
 * @param value Valor com máscara
 * @returns String apenas com números
 */
export function removeCepMask(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida formato de CEP brasileiro
 * @param cep CEP a ser validado (pode ter máscara)
 * @returns Objeto com isValid e mensagem de erro opcional
 */
export function validateCepFormat(cep: string): { isValid: boolean; error?: string } {
  if (!cep || cep.trim() === '') {
    return { isValid: true }; // CEP é opcional por enquanto
  }

  const cepDigits = removeCepMask(cep);

  // CEP deve ter 8 dígitos
  if (cepDigits.length !== 8) {
    return { isValid: false, error: 'CEP deve ter 8 dígitos' };
  }

  // Verificar que todos os dígitos são números
  if (!/^\d+$/.test(cepDigits)) {
    return { isValid: false, error: 'CEP deve conter apenas números' };
  }

  return { isValid: true };
}

/**
 * Interface para dados de endereço retornados pela API
 */
export interface AddressData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

/**
 * Busca endereço a partir do CEP usando a API ViaCEP
 * @param cep CEP a ser consultado (pode ter máscara)
 * @returns Promise com dados do endereço ou null se não encontrado
 */
export async function fetchAddressByCep(cep: string): Promise<AddressData | null> {
  const cepDigits = removeCepMask(cep);

  if (cepDigits.length !== 8) {
    return null;
  }

  try {
    // Tenta primeiro a BrasilAPI, que é agnóstica e mais estável (agrega Correios, ViaCEP, etc)
    const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cepDigits}`);

    if (response.ok) {
      const data = await response.json();
      return {
        cep: data.cep,
        logradouro: data.street || '',
        complemento: '',
        bairro: data.neighborhood || '',
        localidade: data.city || '',
        uf: data.state || '',
      };
    }
  } catch (error) {
    console.warn('Erro ao buscar na BrasilAPI, tentando ViaCEP em seguida:', error);
  }

  try {
    // Fallback para o ViaCEP
    const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
    const data: AddressData = await response.json();

    if (data.erro) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar endereço em ambos os provedores:', error);
    return null;
  }
}
