// Tipo compartilhado da aba ativa do app — extraído de App.tsx na Fase 1.6.4
// para ser consumido por componentes que precisam setar a aba (ex: Dashboard
// quando o botão "Ver todas as transações" leva para activeTab='transactions').

export type TabType =
  | 'dashboard'
  | 'transactions'
  | 'reports'
  | 'metas'
  | 'clients'
  | 'projecao'
  | 'admin'
  | 'dre'
  | 'activeSessions'
  | 'anomalies'
  | 'securityAlerts'
  | 'nuvemshop'
  | 'bling'
  | 'roadmap'
  | 'faq'
  | 'documentacao'
  // Subsistema Gerenciamento (PM)
  | 'dashboard_gerenciamento'
  | 'metas_gerenciamento'
  | 'projecao_gerenciamento'
  | 'relatorios_gerenciamento'
  | 'projects'
  | 'services'
  | 'tarefas_gerenciamento'
  | 'pomodoro_gerenciamento'
  | 'relatorios_tarefas_gerenciamento';
