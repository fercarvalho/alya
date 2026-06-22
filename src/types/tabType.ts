// Tipo compartilhado da aba ativa do app — extraído de App.tsx na Fase 1.6.4
// para ser consumido por componentes que precisam setar a aba (ex: Dashboard
// quando o botão "Ver todas as transações" leva para activeTab='transactions').

export type TabType =
  | 'dashboard'
  | 'transactions'
  | 'products'
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
  | 'documentacao';
