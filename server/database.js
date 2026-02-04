const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, 'database');
    this.transactionsFile = path.join(this.dbPath, 'transactions.json');
    this.productsFile = path.join(this.dbPath, 'products.json');
    this.clientsFile = path.join(this.dbPath, 'clients.json');
    this.usersFile = path.join(this.dbPath, 'users.json');
    this.activityLogsFile = path.join(this.dbPath, 'activity-logs.json');
    this.modulesFile = path.join(this.dbPath, 'modules.json');

    // Projeção (impgeo-style, adaptado ao Alya)
    this.projectionConfigFile = path.join(this.dbPath, 'projection-config.json');
    this.projectionConfigBackupFile = path.join(this.dbPath, 'projection-config-backup.json');
    this.projectionBaseFile = path.join(this.dbPath, 'projection-base.json');
    this.projectionBaseBackupFile = path.join(this.dbPath, 'projection-base-backup.json');
    this.projectionFile = path.join(this.dbPath, 'projection.json');
    this.projectionBackupFile = path.join(this.dbPath, 'projection-backup.json');
    this.revenueFile = path.join(this.dbPath, 'revenue.json');
    this.revenueBackupFile = path.join(this.dbPath, 'revenue-backup.json');
    this.mktComponentsFile = path.join(this.dbPath, 'mkt-components.json');
    this.mktComponentsBackupFile = path.join(this.dbPath, 'mkt-components-backup.json');
    this.fixedExpensesFile = path.join(this.dbPath, 'fixedExpenses.json');
    this.fixedExpensesBackupFile = path.join(this.dbPath, 'fixedExpenses-backup.json');
    this.variableExpensesFile = path.join(this.dbPath, 'variableExpenses.json');
    this.variableExpensesBackupFile = path.join(this.dbPath, 'variableExpenses-backup.json');
    this.investmentsFile = path.join(this.dbPath, 'investments.json');
    this.investmentsBackupFile = path.join(this.dbPath, 'investments-backup.json');
    this.budgetFile = path.join(this.dbPath, 'budget.json');
    this.budgetBackupFile = path.join(this.dbPath, 'budget-backup.json');
    this.resultadoFile = path.join(this.dbPath, 'resultado.json');
    this.resultadoBackupFile = path.join(this.dbPath, 'resultado-backup.json');
    
    // Garantir que os arquivos existam
    this.ensureFilesExist();
  }

  ensureFilesExist() {
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
    
    if (!fs.existsSync(this.transactionsFile)) {
      fs.writeFileSync(this.transactionsFile, '[]');
    }
    
    if (!fs.existsSync(this.productsFile)) {
      fs.writeFileSync(this.productsFile, '[]');
    }
    
    if (!fs.existsSync(this.clientsFile)) {
      fs.writeFileSync(this.clientsFile, '[]');
    }
    
    if (!fs.existsSync(this.usersFile)) {
      // Criar usuários padrão sem senha definida
      // A senha será gerada automaticamente no primeiro login
      // Qualquer senha será aceita no primeiro acesso
      const bcrypt = require('bcryptjs');
      
      // Criar hash especial que aceita qualquer senha no primeiro login
      // Usamos um hash conhecido que será verificado no backend
      const placeholderPassword = bcrypt.hashSync('FIRST_LOGIN_PLACEHOLDER', 10);
      
      const defaultUsers = [
        {
          id: this.generateId(),
          username: 'admin',
          password: placeholderPassword,
          role: 'admin',
          modules: ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas', 'dre', 'projecao', 'admin'],
          isActive: true,
          lastLogin: null, // null indica que nunca fez login
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: this.generateId(),
          username: 'user',
          password: placeholderPassword,
          role: 'user',
          modules: ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas', 'dre'],
          isActive: true,
          lastLogin: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: this.generateId(),
          username: 'guest',
          password: placeholderPassword,
          role: 'guest',
          modules: ['dashboard', 'metas', 'reports', 'dre'],
          isActive: true,
          lastLogin: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      fs.writeFileSync(this.usersFile, JSON.stringify(defaultUsers, null, 2));
      
      console.log('\n✅ Usuários padrão criados');
      console.log('⚠️  No primeiro login, qualquer senha será aceita');
      console.log('⚠️  Uma senha aleatória será gerada e exibida após o primeiro acesso\n');
    }
    
    if (!fs.existsSync(this.activityLogsFile)) {
      fs.writeFileSync(this.activityLogsFile, '[]');
    }
    
    if (!fs.existsSync(this.modulesFile)) {
      // Criar módulos padrão do sistema
      const defaultModules = [
        {
          id: this.generateId(),
          name: 'Dashboard',
          key: 'dashboard',
          icon: 'Home',
          description: 'Painel principal com visão geral do sistema',
          route: null,
          isActive: true,
          isSystem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: this.generateId(),
          name: 'Transações',
          key: 'transactions',
          icon: 'DollarSign',
          description: 'Gerenciamento de transações financeiras',
          route: null,
          isActive: true,
          isSystem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: this.generateId(),
          name: 'Produtos',
          key: 'products',
          icon: 'Package',
          description: 'Gerenciamento de produtos e estoque',
          route: null,
          isActive: true,
          isSystem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: this.generateId(),
          name: 'Clientes',
          key: 'clients',
          icon: 'Users',
          description: 'Gerenciamento de clientes',
          route: null,
          isActive: true,
          isSystem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: this.generateId(),
          name: 'Relatórios',
          key: 'reports',
          icon: 'BarChart3',
          description: 'Relatórios e análises',
          route: null,
          isActive: true,
          isSystem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: this.generateId(),
          name: 'Metas',
          key: 'metas',
          icon: 'Target',
          description: 'Gerenciamento de metas',
          route: null,
          isActive: true,
          isSystem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: this.generateId(),
          name: 'DRE',
          key: 'dre',
          icon: 'BarChart3',
          description: 'Demonstrativo de Resultado do Exercício',
          route: null,
          isActive: true,
          isSystem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: this.generateId(),
          name: 'Projeção',
          key: 'projecao',
          icon: 'Calculator',
          description: 'Planejamento anual (tabelas e gráficos)',
          route: null,
          isActive: true,
          isSystem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: this.generateId(),
          name: 'Administração',
          key: 'admin',
          icon: 'Shield',
          description: 'Painel administrativo',
          route: null,
          isActive: true,
          isSystem: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      fs.writeFileSync(this.modulesFile, JSON.stringify(defaultModules, null, 2));
    }

    // Garantir que o módulo "projecao" exista (upsert em ambientes já inicializados)
    try {
      const existing = this.getSystemModuleByKey('projecao');
      if (!existing) {
        this.saveSystemModule({
          name: 'Projeção',
          key: 'projecao',
          icon: 'Calculator',
          description: 'Planejamento anual (tabelas e gráficos)',
          route: null,
          isActive: true,
          isSystem: true
        });
      }
    } catch (error) {
      console.error('Erro ao garantir módulo projecao:', error);
    }

    // Arquivos de Projeção (dados + config + backups)
    const ensureFile = (filePath, defaultContent) => {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
      }
    };
    const months12 = new Array(12).fill(0);
    const defaultProjectionConfig = {
      revenueStreams: [
        { id: 'rev_1', name: 'Faturamento A', order: 1, isActive: true },
        { id: 'rev_2', name: 'Faturamento B', order: 2, isActive: true }
      ],
      mktComponents: [
        { id: 'mkt_1', name: 'Tráfego', order: 1, isActive: true },
        { id: 'mkt_2', name: 'Social Media', order: 2, isActive: true },
        { id: 'mkt_3', name: 'Conteúdo', order: 3, isActive: true }
      ],
      updatedAt: new Date(0).toISOString()
    };
    ensureFile(this.projectionConfigFile, defaultProjectionConfig);
    ensureFile(this.projectionConfigBackupFile, {});

    const defaultProjectionBase = {
      growth: { minimo: 0, medio: 0, maximo: 0 },
      prevYear: {
        fixedExpenses: [...months12],
        variableExpenses: [...months12],
        investments: [...months12],
        revenueStreams: {
          rev_1: [...months12],
          rev_2: [...months12]
        },
        mktComponents: {
          mkt_1: [...months12],
          mkt_2: [...months12],
          mkt_3: [...months12]
        }
      },
      manualOverrides: {
        fixedPrevistoManual: new Array(12).fill(null),
        fixedMediaManual: new Array(12).fill(null),
        fixedMaximoManual: new Array(12).fill(null),
        variablePrevistoManual: new Array(12).fill(null),
        variableMedioManual: new Array(12).fill(null),
        variableMaximoManual: new Array(12).fill(null),
        investimentosPrevistoManual: new Array(12).fill(null),
        investimentosMedioManual: new Array(12).fill(null),
        investimentosMaximoManual: new Array(12).fill(null),
        mktPrevistoManual: new Array(12).fill(null),
        mktMedioManual: new Array(12).fill(null),
        mktMaximoManual: new Array(12).fill(null),
        revenueManual: {
          rev_1: { previsto: new Array(12).fill(null), medio: new Array(12).fill(null), maximo: new Array(12).fill(null) },
          rev_2: { previsto: new Array(12).fill(null), medio: new Array(12).fill(null), maximo: new Array(12).fill(null) }
        }
      },
      updatedAt: new Date(0).toISOString()
    };
    ensureFile(this.projectionBaseFile, defaultProjectionBase);
    ensureFile(this.projectionBaseBackupFile, {});

    const defaultRevenue = {
      streams: {
        rev_1: { previsto: [...months12] },
        rev_2: { previsto: [...months12] }
      },
      updatedAt: new Date(0).toISOString()
    };
    ensureFile(this.revenueFile, defaultRevenue);
    ensureFile(this.revenueBackupFile, {});

    const defaultMktComponents = {
      components: {
        mkt_1: { previsto: [...months12] },
        mkt_2: { previsto: [...months12] },
        mkt_3: { previsto: [...months12] }
      },
      updatedAt: new Date(0).toISOString()
    };
    ensureFile(this.mktComponentsFile, defaultMktComponents);
    ensureFile(this.mktComponentsBackupFile, {});

    ensureFile(this.fixedExpensesFile, { previsto: [...months12], media: [...months12], maximo: [...months12], updatedAt: new Date(0).toISOString() });
    ensureFile(this.fixedExpensesBackupFile, {});
    ensureFile(this.variableExpensesFile, { previsto: [...months12], medio: [...months12], maximo: [...months12], updatedAt: new Date(0).toISOString() });
    ensureFile(this.variableExpensesBackupFile, {});
    ensureFile(this.investmentsFile, { previsto: [...months12], medio: [...months12], maximo: [...months12], updatedAt: new Date(0).toISOString() });
    ensureFile(this.investmentsBackupFile, {});
    ensureFile(this.budgetFile, { previsto: [...months12], medio: [...months12], maximo: [...months12], updatedAt: new Date(0).toISOString() });
    ensureFile(this.budgetBackupFile, {});
    ensureFile(this.resultadoFile, { previsto: [...months12], medio: [...months12], maximo: [...months12], updatedAt: new Date(0).toISOString() });
    ensureFile(this.resultadoBackupFile, {});

    // Snapshot consolidado
    ensureFile(this.projectionFile, {
      growth: { minimo: 0, medio: 0, maximo: 0 },
      config: {
        revenueStreams: defaultProjectionConfig.revenueStreams,
        mktComponents: defaultProjectionConfig.mktComponents
      },
      fixedExpenses: { previsto: [...months12], media: [...months12], maximo: [...months12] },
      variableExpenses: { previsto: [...months12], medio: [...months12], maximo: [...months12] },
      investments: { previsto: [...months12], medio: [...months12], maximo: [...months12] },
      mktComponents: defaultMktComponents,
      mktTotals: { previsto: [...months12], medio: [...months12], maximo: [...months12] },
      revenue: defaultRevenue,
      revenueTotals: { previsto: [...months12], medio: [...months12], maximo: [...months12] },
      budget: { previsto: [...months12], medio: [...months12], maximo: [...months12] },
      resultado: { previsto: [...months12], medio: [...months12], maximo: [...months12] },
      updatedAt: new Date(0).toISOString()
    });
    ensureFile(this.projectionBackupFile, {});
  }

  // ---------------------------
  // Helpers de leitura/escrita
  // ---------------------------
  readJsonSafe(filePath, fallback) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  writeJsonAtomic(filePath, data) {
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    fs.renameSync(tmpPath, filePath);
  }

  createAutoBackup(sourceFilePath, backupFilePath) {
    try {
      if (!fs.existsSync(sourceFilePath)) return;
      fs.copyFileSync(sourceFilePath, backupFilePath);
    } catch (error) {
      console.error('Erro ao criar backup automático:', error);
    }
  }

  normalizeMonthArray(arr, fallbackValue = 0) {
    const out = new Array(12).fill(fallbackValue);
    if (!Array.isArray(arr)) return out;
    for (let i = 0; i < 12; i++) {
      const v = Number(arr[i]);
      out[i] = Number.isFinite(v) ? v : fallbackValue;
    }
    return out;
  }

  normalizeNullableMonthArray(arr) {
    const out = new Array(12).fill(null);
    if (!Array.isArray(arr)) return out;
    for (let i = 0; i < 12; i++) {
      const raw = arr[i];
      if (raw === null || raw === undefined || raw === '') {
        out[i] = null;
        continue;
      }
      const v = Number(raw);
      out[i] = Number.isFinite(v) ? v : null;
    }
    return out;
  }

  ensureProjectionBaseShape(base, cfg) {
    const safe = base && typeof base === 'object' ? base : {};
    const growth = safe.growth || {};

    const revenueStreamsCfg = (cfg?.revenueStreams || []).filter(s => s && s.id);
    const mktComponentsCfg = (cfg?.mktComponents || []).filter(c => c && c.id);

    const prevYear = safe.prevYear && typeof safe.prevYear === 'object' ? safe.prevYear : {};
    const prevYearRevenue = prevYear.revenueStreams && typeof prevYear.revenueStreams === 'object' ? prevYear.revenueStreams : {};
    const prevYearMkt = prevYear.mktComponents && typeof prevYear.mktComponents === 'object' ? prevYear.mktComponents : {};

    const manualOverrides = safe.manualOverrides && typeof safe.manualOverrides === 'object' ? safe.manualOverrides : {};
    const revenueManual = manualOverrides.revenueManual && typeof manualOverrides.revenueManual === 'object' ? manualOverrides.revenueManual : {};

    const shaped = {
      growth: {
        minimo: Number(growth.minimo) || 0,
        medio: Number(growth.medio) || 0,
        maximo: Number(growth.maximo) || 0
      },
      prevYear: {
        fixedExpenses: this.normalizeMonthArray(prevYear.fixedExpenses, 0),
        variableExpenses: this.normalizeMonthArray(prevYear.variableExpenses, 0),
        investments: this.normalizeMonthArray(prevYear.investments, 0),
        revenueStreams: {},
        mktComponents: {}
      },
      manualOverrides: {
        fixedPrevistoManual: this.normalizeNullableMonthArray(manualOverrides.fixedPrevistoManual),
        fixedMediaManual: this.normalizeNullableMonthArray(manualOverrides.fixedMediaManual),
        fixedMaximoManual: this.normalizeNullableMonthArray(manualOverrides.fixedMaximoManual),
        variablePrevistoManual: this.normalizeNullableMonthArray(manualOverrides.variablePrevistoManual),
        variableMedioManual: this.normalizeNullableMonthArray(manualOverrides.variableMedioManual),
        variableMaximoManual: this.normalizeNullableMonthArray(manualOverrides.variableMaximoManual),
        investimentosPrevistoManual: this.normalizeNullableMonthArray(manualOverrides.investimentosPrevistoManual),
        investimentosMedioManual: this.normalizeNullableMonthArray(manualOverrides.investimentosMedioManual),
        investimentosMaximoManual: this.normalizeNullableMonthArray(manualOverrides.investimentosMaximoManual),
        mktPrevistoManual: this.normalizeNullableMonthArray(manualOverrides.mktPrevistoManual),
        mktMedioManual: this.normalizeNullableMonthArray(manualOverrides.mktMedioManual),
        mktMaximoManual: this.normalizeNullableMonthArray(manualOverrides.mktMaximoManual),
        revenueManual: {}
      },
      updatedAt: safe.updatedAt || null
    };

    for (const s of revenueStreamsCfg) {
      shaped.prevYear.revenueStreams[s.id] = this.normalizeMonthArray(prevYearRevenue[s.id], 0);
      const rm = revenueManual[s.id] || {};
      shaped.manualOverrides.revenueManual[s.id] = {
        previsto: this.normalizeNullableMonthArray(rm.previsto),
        medio: this.normalizeNullableMonthArray(rm.medio),
        maximo: this.normalizeNullableMonthArray(rm.maximo)
      };
    }

    for (const c of mktComponentsCfg) {
      shaped.prevYear.mktComponents[c.id] = this.normalizeMonthArray(prevYearMkt[c.id], 0);
    }

    return shaped;
  }

  applyGrowth(baseArr, percent) {
    const p = Number(percent);
    const factor = Number.isFinite(p) ? (1 + p / 100) : 1;
    return this.normalizeMonthArray(baseArr, 0).map(v => v * factor);
  }

  // Métodos para Transações
  getAllTransactions() {
    try {
      const data = fs.readFileSync(this.transactionsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao ler transações:', error);
      return [];
    }
  }

  saveTransaction(transaction) {
    try {
      const transactions = this.getAllTransactions();
      const newTransaction = {
        id: this.generateId(),
        ...transaction,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      transactions.push(newTransaction);
      fs.writeFileSync(this.transactionsFile, JSON.stringify(transactions, null, 2));
      return newTransaction;
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      throw error;
    }
  }

  updateTransaction(id, updatedTransaction) {
    try {
      const transactions = this.getAllTransactions();
      const index = transactions.findIndex(t => t.id === id);
      if (index === -1) {
        throw new Error('Transação não encontrada');
      }
      
      transactions[index] = {
        ...transactions[index],
        ...updatedTransaction,
        updatedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(this.transactionsFile, JSON.stringify(transactions, null, 2));
      return transactions[index];
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      throw error;
    }
  }

  deleteTransaction(id) {
    try {
      const transactions = this.getAllTransactions();
      const filteredTransactions = transactions.filter(t => t.id !== id);
      fs.writeFileSync(this.transactionsFile, JSON.stringify(filteredTransactions, null, 2));
      return true;
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
      throw error;
    }
  }

  deleteMultipleTransactions(ids) {
    try {
      const transactions = this.getAllTransactions();
      const filteredTransactions = transactions.filter(t => !ids.includes(t.id));
      fs.writeFileSync(this.transactionsFile, JSON.stringify(filteredTransactions, null, 2));
      return true;
    } catch (error) {
      console.error('Erro ao deletar múltiplas transações:', error);
      throw error;
    }
  }

  // Métodos para Produtos
  getAllProducts() {
    try {
      const data = fs.readFileSync(this.productsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao ler produtos:', error);
      return [];
    }
  }

  saveProduct(product) {
    try {
      const products = this.getAllProducts();
      const newProduct = {
        id: this.generateId(),
        ...product,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      products.push(newProduct);
      fs.writeFileSync(this.productsFile, JSON.stringify(products, null, 2));
      return newProduct;
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      throw error;
    }
  }

  updateProduct(id, updatedProduct) {
    try {
      const products = this.getAllProducts();
      const index = products.findIndex(p => p.id === id);
      if (index === -1) {
        throw new Error('Produto não encontrado');
      }
      
      products[index] = {
        ...products[index],
        ...updatedProduct,
        updatedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(this.productsFile, JSON.stringify(products, null, 2));
      return products[index];
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }
  }

  deleteProduct(id) {
    try {
      const products = this.getAllProducts();
      const filteredProducts = products.filter(p => p.id !== id);
      fs.writeFileSync(this.productsFile, JSON.stringify(filteredProducts, null, 2));
      return true;
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      throw error;
    }
  }

  deleteMultipleProducts(ids) {
    try {
      const products = this.getAllProducts();
      const filteredProducts = products.filter(p => !ids.includes(p.id));
      fs.writeFileSync(this.productsFile, JSON.stringify(filteredProducts, null, 2));
      return true;
    } catch (error) {
      console.error('Erro ao deletar múltiplos produtos:', error);
      throw error;
    }
  }

  // Métodos para Clientes
  getAllClients() {
    try {
      const data = fs.readFileSync(this.clientsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao ler clientes:', error);
      return [];
    }
  }

  saveClient(client) {
    try {
      const clients = this.getAllClients();
      const newClient = {
        id: this.generateId(),
        ...client,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      clients.push(newClient);
      fs.writeFileSync(this.clientsFile, JSON.stringify(clients, null, 2));
      return newClient;
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      throw error;
    }
  }

  updateClient(id, updatedClient) {
    try {
      const clients = this.getAllClients();
      const index = clients.findIndex(c => c.id === id);
      if (index === -1) {
        throw new Error('Cliente não encontrado');
      }
      
      clients[index] = {
        ...clients[index],
        ...updatedClient,
        updatedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(this.clientsFile, JSON.stringify(clients, null, 2));
      return clients[index];
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      throw error;
    }
  }

  deleteClient(id) {
    try {
      const clients = this.getAllClients();
      const filteredClients = clients.filter(c => c.id !== id);
      fs.writeFileSync(this.clientsFile, JSON.stringify(filteredClients, null, 2));
      return true;
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      throw error;
    }
  }

  deleteMultipleClients(ids) {
    try {
      const clients = this.getAllClients();
      const filteredClients = clients.filter(c => !ids.includes(c.id));
      fs.writeFileSync(this.clientsFile, JSON.stringify(filteredClients, null, 2));
      return true;
    } catch (error) {
      console.error('Erro ao deletar múltiplos clientes:', error);
      throw error;
    }
  }

  // Métodos para Usuários
  getAllUsers() {
    try {
      const data = fs.readFileSync(this.usersFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao ler usuários:', error);
      return [];
    }
  }

  getUserByUsername(username) {
    try {
      const users = this.getAllUsers();
      return users.find(user => user.username === username);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return null;
    }
  }

  getUserById(id) {
    try {
      const users = this.getAllUsers();
      return users.find(user => user.id === id);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return null;
    }
  }

  saveUser(userData) {
    try {
      const users = this.getAllUsers();
      const newUser = {
        id: this.generateId(),
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      users.push(newUser);
      fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2));
      return newUser;
    } catch (error) {
      throw new Error('Erro ao salvar usuário: ' + error.message);
    }
  }

  updateUser(id, updatedData) {
    try {
      const users = this.getAllUsers();
      const index = users.findIndex(u => u.id === id);
      if (index === -1) {
        throw new Error('Usuário não encontrado');
      }
      users[index] = {
        ...users[index],
        ...updatedData,
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(this.usersFile, JSON.stringify(users, null, 2));
      return users[index];
    } catch (error) {
      throw new Error('Erro ao atualizar usuário: ' + error.message);
    }
  }

  deleteUser(id) {
    try {
      const users = this.getAllUsers();
      const filteredUsers = users.filter(u => u.id !== id);
      if (filteredUsers.length === users.length) {
        throw new Error('Usuário não encontrado');
      }
      fs.writeFileSync(this.usersFile, JSON.stringify(filteredUsers, null, 2));
    } catch (error) {
      throw new Error('Erro ao excluir usuário: ' + error.message);
    }
  }

  // Métodos para Activity Logs
  getAllActivityLogs() {
    try {
      const data = fs.readFileSync(this.activityLogsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao ler logs de atividade:', error);
      return [];
    }
  }

  getActivityLogs(filters = {}) {
    try {
      let logs = this.getAllActivityLogs();
      
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      if (filters.module) {
        logs = logs.filter(log => log.module === filters.module);
      }
      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action);
      }
      if (filters.startDate) {
        logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
      }
      if (filters.endDate) {
        logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
      }
      
      // Ordenar por timestamp (mais recente primeiro)
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Paginação
      if (filters.page && filters.limit) {
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 100;
        const startIndex = (page - 1) * limit;
        logs = logs.slice(startIndex, startIndex + limit);
      } else if (filters.limit) {
        logs = logs.slice(0, parseInt(filters.limit));
      }
      
      return logs;
    } catch (error) {
      console.error('Erro ao filtrar logs:', error);
      return [];
    }
  }

  saveActivityLog(log) {
    try {
      const logs = this.getAllActivityLogs();
      logs.push(log);
      // Manter apenas os últimos 10000 logs
      if (logs.length > 10000) {
        logs.shift();
      }
      fs.writeFileSync(this.activityLogsFile, JSON.stringify(logs, null, 2));
      return log;
    } catch (error) {
      console.error('Erro ao salvar log:', error);
      throw error;
    }
  }

  // Métodos para Módulos do Sistema
  getAllSystemModules() {
    try {
      const data = fs.readFileSync(this.modulesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao ler módulos:', error);
      return [];
    }
  }

  getSystemModuleByKey(key) {
    try {
      const modules = this.getAllSystemModules();
      return modules.find(module => module.key === key);
    } catch (error) {
      console.error('Erro ao buscar módulo:', error);
      return null;
    }
  }

  getSystemModuleById(id) {
    try {
      const modules = this.getAllSystemModules();
      return modules.find(module => module.id === id);
    } catch (error) {
      console.error('Erro ao buscar módulo:', error);
      return null;
    }
  }

  saveSystemModule(moduleData) {
    try {
      const modules = this.getAllSystemModules();
      
      // Verificar se já existe módulo com a mesma key
      if (moduleData.key && modules.find(m => m.key === moduleData.key && m.id !== moduleData.id)) {
        throw new Error('Já existe um módulo com esta key');
      }
      
      const newModule = {
        id: this.generateId(),
        ...moduleData,
        isSystem: moduleData.isSystem || false,
        isActive: moduleData.isActive !== undefined ? moduleData.isActive : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      modules.push(newModule);
      fs.writeFileSync(this.modulesFile, JSON.stringify(modules, null, 2));
      return newModule;
    } catch (error) {
      throw new Error('Erro ao salvar módulo: ' + error.message);
    }
  }

  updateSystemModule(id, updatedData) {
    try {
      const modules = this.getAllSystemModules();
      const index = modules.findIndex(m => m.id === id);
      if (index === -1) {
        throw new Error('Módulo não encontrado');
      }
      
      // Verificar se está tentando mudar a key e se já existe outra com essa key
      if (updatedData.key && updatedData.key !== modules[index].key) {
        if (modules.find(m => m.key === updatedData.key && m.id !== id)) {
          throw new Error('Já existe um módulo com esta key');
        }
      }
      
      modules[index] = {
        ...modules[index],
        ...updatedData,
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(this.modulesFile, JSON.stringify(modules, null, 2));
      return modules[index];
    } catch (error) {
      throw new Error('Erro ao atualizar módulo: ' + error.message);
    }
  }

  deleteSystemModule(id) {
    try {
      const modules = this.getAllSystemModules();
      const module = modules.find(m => m.id === id);
      
      if (!module) {
        throw new Error('Módulo não encontrado');
      }
      
      if (module.isSystem) {
        throw new Error('Não é possível deletar módulos do sistema');
      }
      
      const filteredModules = modules.filter(m => m.id !== id);
      fs.writeFileSync(this.modulesFile, JSON.stringify(filteredModules, null, 2));
      return true;
    } catch (error) {
      throw new Error('Erro ao deletar módulo: ' + error.message);
    }
  }

  // ---------------------------
  // Métodos para Projeção (Alya)
  // ---------------------------
  getProjectionBase() {
    const cfg = this.getProjectionConfig();
    const raw = this.readJsonSafe(this.projectionBaseFile, null);
    return this.ensureProjectionBaseShape(raw, cfg);
  }

  updateProjectionBase(nextBase) {
    const cfg = this.getProjectionConfig();
    const shaped = this.ensureProjectionBaseShape(nextBase, cfg);
    this.createAutoBackup(this.projectionBaseFile, this.projectionBaseBackupFile);
    const data = { ...shaped, updatedAt: new Date().toISOString() };
    this.writeJsonAtomic(this.projectionBaseFile, data);
    return data;
  }

  getProjectionConfig() {
    return this.readJsonSafe(this.projectionConfigFile, { revenueStreams: [], mktComponents: [], updatedAt: null });
  }

  updateProjectionConfig(config) {
    this.createAutoBackup(this.projectionConfigFile, this.projectionConfigBackupFile);
    const data = {
      ...config,
      updatedAt: new Date().toISOString()
    };
    this.writeJsonAtomic(this.projectionConfigFile, data);
    return data;
  }

  getRevenueData() {
    // Mantido por compatibilidade: espelha prevYear.revenueStreams do projection-base.json
    const base = this.getProjectionBase();
    const streams = {};
    for (const [id, arr] of Object.entries(base.prevYear?.revenueStreams || {})) {
      streams[id] = { previsto: this.normalizeMonthArray(arr, 0) };
    }
    return { streams, updatedAt: base.updatedAt || null };
  }

  updateRevenueData(revenueData) {
    // Mantido por compatibilidade: escreve em projection-base.json (prevYear) e espelha em revenue.json
    const cfg = this.getProjectionConfig();
    const base = this.getProjectionBase();
    const next = this.ensureProjectionBaseShape(base, cfg);
    const streams = revenueData && typeof revenueData === 'object' ? (revenueData.streams || {}) : {};
    for (const s of (cfg.revenueStreams || [])) {
      if (!s?.id) continue;
      const arr = streams?.[s.id]?.previsto;
      next.prevYear.revenueStreams[s.id] = this.normalizeMonthArray(arr, 0);
    }
    const updatedBase = this.updateProjectionBase(next);

    const mirror = this.getRevenueData();
    this.createAutoBackup(this.revenueFile, this.revenueBackupFile);
    this.writeJsonAtomic(this.revenueFile, { ...mirror, updatedAt: new Date().toISOString() });
    return { ...mirror, updatedAt: updatedBase.updatedAt };
  }

  getMktComponentsData() {
    // Mantido por compatibilidade: espelha prevYear.mktComponents do projection-base.json
    const base = this.getProjectionBase();
    const components = {};
    for (const [id, arr] of Object.entries(base.prevYear?.mktComponents || {})) {
      components[id] = { previsto: this.normalizeMonthArray(arr, 0) };
    }
    return { components, updatedAt: base.updatedAt || null };
  }

  updateMktComponentsData(mktComponentsData) {
    // Mantido por compatibilidade: escreve em projection-base.json (prevYear) e espelha em mkt-components.json
    const cfg = this.getProjectionConfig();
    const base = this.getProjectionBase();
    const next = this.ensureProjectionBaseShape(base, cfg);
    const comps = mktComponentsData && typeof mktComponentsData === 'object' ? (mktComponentsData.components || {}) : {};
    for (const c of (cfg.mktComponents || [])) {
      if (!c?.id) continue;
      const arr = comps?.[c.id]?.previsto;
      next.prevYear.mktComponents[c.id] = this.normalizeMonthArray(arr, 0);
    }
    const updatedBase = this.updateProjectionBase(next);

    const mirror = this.getMktComponentsData();
    this.createAutoBackup(this.mktComponentsFile, this.mktComponentsBackupFile);
    this.writeJsonAtomic(this.mktComponentsFile, { ...mirror, updatedAt: new Date().toISOString() });
    return { ...mirror, updatedAt: updatedBase.updatedAt };
  }

  getFixedExpensesData() {
    return this.readJsonSafe(this.fixedExpensesFile, { previsto: new Array(12).fill(0), media: new Array(12).fill(0), maximo: new Array(12).fill(0), updatedAt: null });
  }

  updateFixedExpensesData(fixedExpensesData) {
    this.createAutoBackup(this.fixedExpensesFile, this.fixedExpensesBackupFile);
    const data = { ...fixedExpensesData, updatedAt: new Date().toISOString() };
    this.writeJsonAtomic(this.fixedExpensesFile, data);
    return data;
  }

  getVariableExpensesData() {
    return this.readJsonSafe(this.variableExpensesFile, { previsto: new Array(12).fill(0), medio: new Array(12).fill(0), maximo: new Array(12).fill(0), updatedAt: null });
  }

  updateVariableExpensesData(variableExpensesData) {
    this.createAutoBackup(this.variableExpensesFile, this.variableExpensesBackupFile);
    const data = { ...variableExpensesData, updatedAt: new Date().toISOString() };
    this.writeJsonAtomic(this.variableExpensesFile, data);
    return data;
  }

  getInvestmentsData() {
    return this.readJsonSafe(this.investmentsFile, { previsto: new Array(12).fill(0), medio: new Array(12).fill(0), maximo: new Array(12).fill(0), updatedAt: null });
  }

  updateInvestmentsData(investmentsData) {
    this.createAutoBackup(this.investmentsFile, this.investmentsBackupFile);
    const data = { ...investmentsData, updatedAt: new Date().toISOString() };
    this.writeJsonAtomic(this.investmentsFile, data);
    return data;
  }

  getBudgetData() {
    return this.readJsonSafe(this.budgetFile, { previsto: new Array(12).fill(0), medio: new Array(12).fill(0), maximo: new Array(12).fill(0), updatedAt: null });
  }

  updateBudgetData(budgetData) {
    this.createAutoBackup(this.budgetFile, this.budgetBackupFile);
    const data = { ...budgetData, updatedAt: new Date().toISOString() };
    this.writeJsonAtomic(this.budgetFile, data);
    return data;
  }

  getResultadoData() {
    return this.readJsonSafe(this.resultadoFile, { previsto: new Array(12).fill(0), medio: new Array(12).fill(0), maximo: new Array(12).fill(0), updatedAt: null });
  }

  updateResultadoData(resultadoData) {
    this.createAutoBackup(this.resultadoFile, this.resultadoBackupFile);
    const data = { ...resultadoData, updatedAt: new Date().toISOString() };
    this.writeJsonAtomic(this.resultadoFile, data);
    return data;
  }

  getProjectionSnapshot() {
    return this.readJsonSafe(this.projectionFile, null);
  }

  updateProjectionSnapshot(snapshot) {
    this.createAutoBackup(this.projectionFile, this.projectionBackupFile);
    const data = { ...snapshot, updatedAt: new Date().toISOString() };
    this.writeJsonAtomic(this.projectionFile, data);
    return data;
  }

  // Gera o snapshot consolidado e também preenche campos derivados.
  // Regras (impgeo-style):
  // - Tudo é derivado do "Resultado do Ano Anterior" (projection-base.json)
  // - Overrides manuais por cenário/mês têm precedência sobre cálculos automáticos
  // - Fixas (Previsto) seguem regra especial baseada em Dezembro do ano anterior
  syncProjectionData() {
    const cfg = this.getProjectionConfig();
    const base = this.getProjectionBase();
    const growth = base.growth || { minimo: 0, medio: 0, maximo: 0 };

    const percentFactor = (pct) => {
      const p = Number(pct);
      return Number.isFinite(p) ? (1 + p / 100) : 1;
    };
    const applyOverride = (autoArr, overrideArr) => {
      const a = this.normalizeMonthArray(autoArr, 0);
      const o = this.normalizeNullableMonthArray(overrideArr);
      return a.map((v, i) => (o[i] !== null && o[i] !== undefined ? Number(o[i]) : v));
    };

    // ===== Fixas (impgeo): Previsto por regra especial + overrides =====
    const dezAnterior = Number(base.prevYear?.fixedExpenses?.[11]) || 0;
    const fixedAuto = (() => {
      const out = new Array(12).fill(0);
      const jan = dezAnterior * 1.10;
      out[0] = jan;
      out[1] = jan;
      out[2] = jan;
      const abr = jan * 1.10;
      out[3] = abr;
      out[4] = abr;
      out[5] = abr;
      const jul = abr * 1.10;
      out[6] = jul;
      out[7] = jul;
      out[8] = jul;
      const outVal = jul * 1.10;
      out[9] = outVal;
      out[10] = outVal;
      out[11] = outVal;
      return out;
    })();

    const fixedPrevisto = applyOverride(fixedAuto, base.manualOverrides?.fixedPrevistoManual);
    const fixedMedioAuto = fixedPrevisto.map(v => Number(v) * 1.10);
    const fixedMedio = applyOverride(fixedMedioAuto, base.manualOverrides?.fixedMediaManual);
    const fixedMaximoAuto = fixedMedio.map(v => Number(v) * 1.10);
    const fixedMaximo = applyOverride(fixedMaximoAuto, base.manualOverrides?.fixedMaximoManual);

    // ===== Variáveis / Investimentos: base ano anterior + growth por cenário + overrides =====
    const prevVariable = this.normalizeMonthArray(base.prevYear?.variableExpenses, 0);
    const prevInvest = this.normalizeMonthArray(base.prevYear?.investments, 0);

    const variablePrevAuto = prevVariable.map(v => v * percentFactor(growth.minimo));
    const variableMedioAuto = prevVariable.map(v => v * percentFactor(growth.medio));
    const variableMaxAuto = prevVariable.map(v => v * percentFactor(growth.maximo));

    const variablePrevisto = applyOverride(variablePrevAuto, base.manualOverrides?.variablePrevistoManual);
    const variableMedio = applyOverride(variableMedioAuto, base.manualOverrides?.variableMedioManual);
    const variableMaximo = applyOverride(variableMaxAuto, base.manualOverrides?.variableMaximoManual);

    const investPrevAuto = prevInvest.map(v => v * percentFactor(growth.minimo));
    const investMedioAuto = prevInvest.map(v => v * percentFactor(growth.medio));
    const investMaxAuto = prevInvest.map(v => v * percentFactor(growth.maximo));

    const investmentsPrevisto = applyOverride(investPrevAuto, base.manualOverrides?.investimentosPrevistoManual);
    const investmentsMedio = applyOverride(investMedioAuto, base.manualOverrides?.investimentosMedioManual);
    const investmentsMaximo = applyOverride(investMaxAuto, base.manualOverrides?.investimentosMaximoManual);

    // ===== Revenue por stream (para totais): base ano anterior + growth por cenário + overrides =====
    const activeStreams = (cfg.revenueStreams || []).filter(s => s && s.isActive !== false && s.id);
    const revenueTotalsPrevisto = new Array(12).fill(0);
    const revenueTotalsMedio = new Array(12).fill(0);
    const revenueTotalsMaximo = new Array(12).fill(0);

    for (const s of activeStreams) {
      const prevStream = this.normalizeMonthArray(base.prevYear?.revenueStreams?.[s.id], 0);
      const rm = base.manualOverrides?.revenueManual?.[s.id] || {};
      const prevAuto = prevStream.map(v => v * percentFactor(growth.minimo));
      const medAuto = prevStream.map(v => v * percentFactor(growth.medio));
      const maxAuto = prevStream.map(v => v * percentFactor(growth.maximo));
      const prevEff = applyOverride(prevAuto, rm.previsto);
      const medEff = applyOverride(medAuto, rm.medio);
      const maxEff = applyOverride(maxAuto, rm.maximo);
      for (let i = 0; i < 12; i++) {
        revenueTotalsPrevisto[i] += prevEff[i];
        revenueTotalsMedio[i] += medEff[i];
        revenueTotalsMaximo[i] += maxEff[i];
      }
    }

    // ===== MKT totals: soma componentes (Previsto sem growth.minimo; Médio/Maximo com growth) =====
    const activeMkt = (cfg.mktComponents || []).filter(c => c && c.isActive !== false && c.id);
    const mktTotalsBase = new Array(12).fill(0);
    for (const c of activeMkt) {
      const arr = this.normalizeMonthArray(base.prevYear?.mktComponents?.[c.id], 0);
      for (let i = 0; i < 12; i++) mktTotalsBase[i] += arr[i];
    }
    const mktPrevAuto = this.normalizeMonthArray(mktTotalsBase, 0);
    const mktMedAuto = mktTotalsBase.map(v => v * percentFactor(growth.medio));
    const mktMaxAuto = mktTotalsBase.map(v => v * percentFactor(growth.maximo));

    const mktTotalsPrevisto = applyOverride(mktPrevAuto, base.manualOverrides?.mktPrevistoManual);
    const mktTotalsMedio = applyOverride(mktMedAuto, base.manualOverrides?.mktMedioManual);
    const mktTotalsMaximo = applyOverride(mktMaxAuto, base.manualOverrides?.mktMaximoManual);

    // ===== Budget / Resultado =====
    const budgetPrev = new Array(12).fill(0).map((_, i) => fixedPrevisto[i] + variablePrevisto[i] + investmentsPrevisto[i] + mktTotalsPrevisto[i]);
    const budgetMedio = new Array(12).fill(0).map((_, i) => fixedMedio[i] + variableMedio[i] + investmentsMedio[i] + mktTotalsMedio[i]);
    const budgetMax = new Array(12).fill(0).map((_, i) => fixedMaximo[i] + variableMaximo[i] + investmentsMaximo[i] + mktTotalsMaximo[i]);
    this.updateBudgetData({ previsto: budgetPrev, medio: budgetMedio, maximo: budgetMax });

    const resultadoPrev = new Array(12).fill(0).map((_, i) => revenueTotalsPrevisto[i] - budgetPrev[i]);
    const resultadoMedio = new Array(12).fill(0).map((_, i) => revenueTotalsMedio[i] - budgetMedio[i]);
    const resultadoMax = new Array(12).fill(0).map((_, i) => revenueTotalsMaximo[i] - budgetMax[i]);
    this.updateResultadoData({ previsto: resultadoPrev, medio: resultadoMedio, maximo: resultadoMax });

    // Persistir derivados principais (para leitura externa/debug)
    this.updateFixedExpensesData({ previsto: fixedPrevisto, media: fixedMedio, maximo: fixedMaximo });
    this.updateVariableExpensesData({ previsto: variablePrevisto, medio: variableMedio, maximo: variableMaximo });
    this.updateInvestmentsData({ previsto: investmentsPrevisto, medio: investmentsMedio, maximo: investmentsMaximo });

    const newSnapshot = {
      growth: {
        minimo: Number(growth.minimo) || 0,
        medio: Number(growth.medio) || 0,
        maximo: Number(growth.maximo) || 0
      },
      config: {
        revenueStreams: cfg.revenueStreams || [],
        mktComponents: cfg.mktComponents || []
      },
      fixedExpenses: { previsto: fixedPrevisto, media: fixedMedio, maximo: fixedMaximo },
      variableExpenses: { previsto: variablePrevisto, medio: variableMedio, maximo: variableMaximo },
      investments: { previsto: investmentsPrevisto, medio: investmentsMedio, maximo: investmentsMaximo },
      mktComponents: this.getMktComponentsData(),
      mktTotals: { previsto: mktTotalsPrevisto, medio: mktTotalsMedio, maximo: mktTotalsMaximo },
      revenue: this.getRevenueData(),
      revenueTotals: { previsto: revenueTotalsPrevisto, medio: revenueTotalsMedio, maximo: revenueTotalsMaximo },
      budget: { previsto: budgetPrev, medio: budgetMedio, maximo: budgetMax },
      resultado: { previsto: resultadoPrev, medio: resultadoMedio, maximo: resultadoMax }
    };

    return this.updateProjectionSnapshot(newSnapshot);
  }

  /**
   * Extrai mês (0-11) e ano de uma data de transação.
   * Suporta: YYYY-MM-DD, DD/MM/YYYY, ISO string.
   */
  parseTransactionDate(dateStr) {
    if (!dateStr) return { month: -1, year: -1 };
    const s = String(dateStr).trim();
    // YYYY-MM-DD
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return { month: parseInt(isoMatch[2], 10) - 1, year: parseInt(isoMatch[1], 10) };
    }
    // DD/MM/YYYY
    const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (brMatch) {
      return { month: parseInt(brMatch[2], 10) - 1, year: parseInt(brMatch[3], 10) };
    }
    const d = new Date(s);
    if (Number.isFinite(d.getTime())) {
      return { month: d.getMonth(), year: d.getFullYear() };
    }
    return { month: -1, year: -1 };
  }

  /**
   * Sincroniza a base da projeção (prevYear) a partir das transações reais.
   * Agrega transações por mês e categoria para o ano especificado.
   * @param {number} year - Ano das transações a agregar (padrão: ano anterior)
   * @returns {object} Base atualizada e snapshot recalculado
   */
  syncProjectionBaseFromTransactions(year) {
    const targetYear = Number(year) || new Date().getFullYear() - 1;
    const cfg = this.getProjectionConfig();
    const base = this.getProjectionBase();
    const transactions = this.getAllTransactions();

    const fixedExpenses = new Array(12).fill(0);
    const variableExpenses = new Array(12).fill(0);
    const investments = new Array(12).fill(0);
    const revenueStreams = {};
    const mktComponents = {};

    for (const s of (cfg.revenueStreams || [])) {
      if (s?.id) revenueStreams[s.id] = new Array(12).fill(0);
    }
    for (const c of (cfg.mktComponents || [])) {
      if (c?.id) mktComponents[c.id] = new Array(12).fill(0);
    }

    const catLower = (c) => (c || '').toLowerCase().trim();

    for (const t of transactions) {
      const { month, year } = this.parseTransactionDate(t.date);
      if (month < 0 || month > 11 || year !== targetYear) continue;

      const value = Number(t.value) || 0;
      const type = (t.type || '').toLowerCase();
      const category = catLower(t.category);

      if (type.includes('receita')) {
        const streamId = this.mapTransactionCategoryToRevenueStream(category, cfg);
        if (streamId && revenueStreams[streamId]) {
          revenueStreams[streamId][month] += value;
        } else if (Object.keys(revenueStreams).length > 0) {
          const firstId = Object.keys(revenueStreams)[0];
          revenueStreams[firstId][month] += value;
        }
      } else if (type.includes('despesa')) {
        if (category.includes('fixo') || category.includes('fixa')) {
          fixedExpenses[month] += value;
        } else if (category.includes('variável') || category.includes('variavel')) {
          variableExpenses[month] += value;
        } else if (category.includes('investimento')) {
          investments[month] += value;
        } else if (category.includes('mkt') || category.includes('marketing')) {
          const mktId = Object.keys(mktComponents)[0];
          if (mktId) mktComponents[mktId][month] += value;
        } else {
          variableExpenses[month] += value;
        }
      }
    }

    const nextBase = {
      ...base,
      prevYear: {
        ...base.prevYear,
        fixedExpenses,
        variableExpenses,
        investments,
        revenueStreams: { ...(base.prevYear?.revenueStreams || {}), ...revenueStreams },
        mktComponents: { ...(base.prevYear?.mktComponents || {}), ...mktComponents }
      }
    };

    this.updateProjectionBase(nextBase);
    return this.syncProjectionData();
  }

  /**
   * Mapeia categoria de transação para stream de faturamento.
   * Ex: "Varejo" -> stream com name "Faturamento Varejo"
   */
  mapTransactionCategoryToRevenueStream(category, cfg) {
    const streams = (cfg?.revenueStreams || []).filter(s => s?.id);
    if (streams.length === 0) return null;
    const cat = (category || '').toLowerCase();
    for (const s of streams) {
      const name = (s.name || '').toLowerCase();
      if (name.includes('varejo') && (cat.includes('varejo') || cat === 'varejo')) return s.id;
      if (name.includes('atacado') && (cat.includes('atacado') || cat === 'atacado')) return s.id;
    }
    return null;
  }

  // Métodos para Estatísticas
  getSystemStatistics() {
    try {
      const users = this.getAllUsers();
      const logs = this.getAllActivityLogs();
      const transactions = this.getAllTransactions();
      const products = this.getAllProducts();
      const clients = this.getAllClients();
      const modules = this.getAllSystemModules();
      
      // Estatísticas de usuários
      const activeUsers = users.filter(u => u.isActive !== false).length;
      const totalLogins = logs.filter(l => l.action === 'login').length;
      
      // Estatísticas por módulo
      const moduleStats = {};
      logs.forEach(log => {
        if (!moduleStats[log.module]) {
          moduleStats[log.module] = { actions: 0, users: new Set() };
        }
        moduleStats[log.module].actions++;
        moduleStats[log.module].users.add(log.userId);
      });
      
      // Converter Sets para números
      Object.keys(moduleStats).forEach(module => {
        moduleStats[module].users = moduleStats[module].users.size;
      });
      
      // Estatísticas de uso por período
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      const recentLogs = logs.filter(l => new Date(l.timestamp) >= last30Days);
      
      // Usuários mais ativos
      const userActivityCount = {};
      logs.forEach(log => {
        if (!userActivityCount[log.userId]) {
          userActivityCount[log.userId] = { count: 0, username: log.username };
        }
        userActivityCount[log.userId].count++;
      });
      const topUsers = Object.values(userActivityCount)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Módulos mais usados
      const moduleUsage = {};
      logs.forEach(log => {
        if (!moduleUsage[log.module]) {
          moduleUsage[log.module] = 0;
        }
        moduleUsage[log.module]++;
      });
      const topModules = Object.entries(moduleUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key, count]) => ({ key, count }));
      
      return {
        users: {
          total: users.length,
          active: activeUsers,
          inactive: users.length - activeUsers,
          byRole: {
            admin: users.filter(u => u.role === 'admin').length,
            user: users.filter(u => u.role === 'user').length,
            guest: users.filter(u => u.role === 'guest').length
          }
        },
        activity: {
          totalLogins,
          totalActions: logs.length,
          actionsLast30Days: recentLogs.length,
          byModule: moduleStats,
          topUsers,
          topModules
        },
        data: {
          transactions: transactions.length,
          products: products.length,
          clients: clients.length
        },
        modules: {
          total: modules.length,
          active: modules.filter(m => m.isActive).length,
          system: modules.filter(m => m.isSystem).length,
          custom: modules.filter(m => !m.isSystem).length
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
      return {};
    }
  }

  getUserStatistics(userId) {
    try {
      const logs = this.getAllActivityLogs().filter(l => l.userId === userId);
      const user = this.getAllUsers().find(u => u.id === userId);
      
      if (!user) {
        throw new Error('Usuário não encontrado');
      }
      
      const actionsByModule = {};
      const actionsByType = {};
      
      logs.forEach(log => {
        // Por módulo
        if (!actionsByModule[log.module]) {
          actionsByModule[log.module] = 0;
        }
        actionsByModule[log.module]++;
        
        // Por tipo de ação
        if (!actionsByType[log.action]) {
          actionsByType[log.action] = 0;
        }
        actionsByType[log.action]++;
      });
      
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      const recentLogs = logs.filter(l => new Date(l.timestamp) >= last30Days);
      
      // Timeline de uso (últimos 30 dias)
      const timeline = {};
      recentLogs.forEach(log => {
        const date = new Date(log.timestamp).toISOString().split('T')[0];
        if (!timeline[date]) {
          timeline[date] = 0;
        }
        timeline[date]++;
      });
      
      return {
        userId,
        username: user.username,
        role: user.role,
        totalActions: logs.length,
        actionsLast30Days: recentLogs.length,
        actionsByModule,
        actionsByType,
        lastLogin: user.lastLogin || null,
        createdAt: user.createdAt,
        timeline: Object.entries(timeline).map(([date, count]) => ({ date, count })),
        recentActivity: recentLogs.slice(0, 20)
      };
    } catch (error) {
      throw new Error('Erro ao calcular estatísticas do usuário: ' + error.message);
    }
  }

  getModuleStatistics(moduleKey) {
    try {
      const logs = this.getAllActivityLogs().filter(l => l.module === moduleKey);
      const module = this.getSystemModuleByKey(moduleKey);
      
      if (!module) {
        throw new Error('Módulo não encontrado');
      }
      
      const actionsByType = {};
      const usersByModule = new Set();
      
      logs.forEach(log => {
        if (!actionsByType[log.action]) {
          actionsByType[log.action] = 0;
        }
        actionsByType[log.action]++;
        usersByModule.add(log.userId);
      });
      
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      const recentLogs = logs.filter(l => new Date(l.timestamp) >= last30Days);
      
      // Timeline de uso
      const timeline = {};
      recentLogs.forEach(log => {
        const date = new Date(log.timestamp).toISOString().split('T')[0];
        if (!timeline[date]) {
          timeline[date] = 0;
        }
        timeline[date]++;
      });
      
      return {
        moduleKey,
        moduleName: module.name,
        totalActions: logs.length,
        actionsLast30Days: recentLogs.length,
        uniqueUsers: usersByModule.size,
        actionsByType,
        timeline: Object.entries(timeline).map(([date, count]) => ({ date, count }))
      };
    } catch (error) {
      throw new Error('Erro ao calcular estatísticas do módulo: ' + error.message);
    }
  }

  getUsageTimeline(startDate, endDate, groupBy = 'day') {
    try {
      const logs = this.getAllActivityLogs();
      let filteredLogs = logs;
      
      if (startDate) {
        filteredLogs = filteredLogs.filter(l => new Date(l.timestamp) >= new Date(startDate));
      }
      if (endDate) {
        filteredLogs = filteredLogs.filter(l => new Date(l.timestamp) <= new Date(endDate));
      }
      
      const timeline = {};
      
      filteredLogs.forEach(log => {
        const date = new Date(log.timestamp);
        let key;
        
        if (groupBy === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (groupBy === 'hour') {
          key = `${date.toISOString().split('T')[0]} ${date.getHours()}:00`;
        } else if (groupBy === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else if (groupBy === 'month') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        if (!timeline[key]) {
          timeline[key] = { date: key, count: 0, byModule: {}, byAction: {} };
        }
        timeline[key].count++;
        
        if (!timeline[key].byModule[log.module]) {
          timeline[key].byModule[log.module] = 0;
        }
        timeline[key].byModule[log.module]++;
        
        if (!timeline[key].byAction[log.action]) {
          timeline[key].byAction[log.action] = 0;
        }
        timeline[key].byAction[log.action]++;
      });
      
      return Object.values(timeline).sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );
    } catch (error) {
      console.error('Erro ao calcular timeline:', error);
      return [];
    }
  }

  // Método auxiliar para gerar IDs únicos
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

module.exports = Database;
