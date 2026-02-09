/**
 * Utilitários para parsing de datas sem problemas de timezone.
 * A API retorna datas em YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss.
 * new Date("2026-02-01") interpreta como UTC meia-noite, causando deslocamento.
 * parseLocalDate extrai ano/mês/dia e cria Date em horário local.
 */
export function parseLocalDate(dateString: string | null | undefined): Date {
  if (!dateString) return new Date(NaN)
  const m = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
  return new Date(dateString)
}

export function formatDatePtBR(dateString: string | null | undefined): string {
  const date = parseLocalDate(dateString)
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('pt-BR') : ''
}
