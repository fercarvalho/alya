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
          modules: ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas', 'admin'],
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
          modules: ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas'],
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
          modules: ['dashboard', 'metas', 'reports'],
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
