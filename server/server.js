// Carregar variáveis de ambiente
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('./database');

const app = express();
const port = process.env.PORT || 8001;
const db = new Database();

// Validar JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ ERRO CRÍTICO: JWT_SECRET não está definido nas variáveis de ambiente!');
  console.error('   Configure JWT_SECRET no arquivo .env ou nas variáveis de ambiente do sistema.');
  console.error('   Para gerar uma chave segura, execute: openssl rand -base64 32');
  process.exit(1);
}

// Middleware
app.use(cors({
  origin: [
    'https://alya.sistemas.viverdepj.com.br',
    'http://localhost:8000',
    'http://localhost:5173'
  ],
  credentials: true
}));
app.use(express.json());

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Manter o nome original com timestamp para evitar conflitos
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Aceitar apenas arquivos .xlsx
    if (path.extname(file.originalname).toLowerCase() === '.xlsx') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .xlsx são permitidos!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite de 5MB
  }
});

// Função para processar dados de transações
function processTransactions(worksheet) {
  const data = XLSX.utils.sheet_to_json(worksheet);
  const transactions = [];

  data.forEach((row, index) => {
    try {
      // Mapear colunas do Excel para o formato esperado
      const transaction = {
        id: Date.now() + index,
        date: row['Data'] || row['date'] || new Date().toISOString().split('T')[0],
        description: row['Descrição'] || row['Descricao'] || row['description'] || row['Description'] || '',
        value: parseFloat(row['Valor'] || row['value'] || row['Value'] || 0),
        type: row['Tipo'] || row['type'] || row['Type'] || 'Entrada',
        category: row['Categoria'] || row['category'] || row['Category'] || 'Outros'
      };

      // Validar se tem dados essenciais
      if (transaction.description && transaction.value) {
        transactions.push(transaction);
      }
    } catch (error) {
      console.log(`Erro ao processar linha ${index + 1}:`, error.message);
    }
  });

  return transactions;
}

// Função para processar dados de produtos
function processProducts(worksheet) {
  const data = XLSX.utils.sheet_to_json(worksheet);
  const products = [];

  data.forEach((row, index) => {
    try {
      // Mapear colunas do Excel para o formato esperado
      const product = {
        id: Date.now() + index,
        name: row['Nome'] || row['name'] || row['Name'] || '',
        category: row['Categoria'] || row['category'] || row['Category'] || 'Outros',
        price: parseFloat(row['Preço'] || row['Preco'] || row['price'] || row['Price'] || 0),
        cost: parseFloat(row['Custo'] || row['cost'] || row['Cost'] || 0),
        stock: parseInt(row['Estoque'] || row['stock'] || row['Stock'] || 0),
        sold: parseInt(row['Vendido'] || row['sold'] || row['Sold'] || 0)
      };

      // Validar se tem dados essenciais
      if (product.name) {
        products.push(product);
      }
    } catch (error) {
      console.log(`Erro ao processar linha ${index + 1}:`, error.message);
    }
  });

  return products;
}

// Função para processar dados de clientes
function processClients(worksheet) {
  const data = XLSX.utils.sheet_to_json(worksheet);
  const clients = [];

  data.forEach((row, index) => {
    try {
      // Mapear colunas do Excel para o formato esperado
      const documentType = row['Tipo de Documento'] || row['tipo de documento'] || row['Tipo de documento'] || 'cpf';
      const client = {
        id: Date.now() + index,
        name: row['Nome'] || row['name'] || row['Name'] || '',
        email: row['Email'] || row['email'] || row['Email'] || '',
        phone: row['Telefone'] || row['phone'] || row['Phone'] || '',
        address: row['Endereço'] || row['Endereco'] || row['address'] || row['Address'] || '',
        cpf: documentType === 'cpf' ? (row['CPF'] || row['cpf'] || row['Cpf'] || '') : '',
        cnpj: documentType === 'cnpj' ? (row['CNPJ'] || row['cnpj'] || row['Cnpj'] || '') : ''
      };

      // Validar se tem dados essenciais
      if (client.name && client.email) {
        clients.push(client);
      }
    } catch (error) {
      console.log(`Erro ao processar linha ${index + 1}:`, error.message);
    }
  });

  return clients;
}

// Rota para baixar modelo de arquivo
app.get('/api/modelo/:type', (req, res) => {
  try {
    const { type } = req.params;
    
    if (!['transactions', 'products', 'clients'].includes(type)) {
      return res.status(400).json({ error: 'Tipo inválido! Use "transactions", "products" ou "clients"' });
    }

    // Sempre gerar arquivo modelo dinamicamente para garantir colunas atualizadas
    const workbook = XLSX.utils.book_new();
    let worksheet;

    if (type === 'transactions') {
      const fileName = 'modelo-transacoes.xlsx';
      const filePath = path.join(__dirname, 'public', fileName);
      
      if (fs.existsSync(filePath)) {
        return res.download(filePath, fileName);
      }
      
      // Criar dados de exemplo
      const sampleData = [
        {
          'Data': '2024-01-15',
          'Descrição': 'Venda de produto',
          'Valor': 150.00,
          'Tipo': 'Receita',
          'Categoria': 'Vendas'
        }
      ];
      worksheet = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transações');
    } else if (type === 'products') {
      const fileName = 'modelo-produtos.xlsx';
      const filePath = path.join(__dirname, 'public', fileName);
      
      if (fs.existsSync(filePath)) {
        return res.download(filePath, fileName);
      }
      
      // Criar dados de exemplo
      const sampleData = [{
        'Nome': '',
        'Categoria': '',
        'Preço': '',
        'Custo': '',
        'Estoque': '',
        'Vendido': ''
      }];
      worksheet = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');
    } else if (type === 'clients') {
      const sampleData = [
        {
          'Nome': 'João Silva',
          'Email': 'joao@email.com',
          'Telefone': '(11) 99999-9999',
          'Endereço': 'Rua das Flores, 123',
          'Tipo de Documento': 'cpf',
          'CPF': '123.456.789-00',
          'CNPJ': ''
        },
        {
          'Nome': 'Empresa XYZ Ltda',
          'Email': 'contato@empresa.com',
          'Telefone': '(11) 88888-8888',
          'Endereço': 'Av. Principal, 456',
          'Tipo de Documento': 'cnpj',
          'CPF': '',
          'CNPJ': '12.345.678/0001-90'
        }
      ];
      worksheet = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = type === 'transactions' ? 'modelo-transacoes.xlsx' : 
                    type === 'clients' ? 'modelo-clientes.xlsx' : 
                    'modelo-produtos.xlsx';
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length
    });
    return res.send(buffer);
    
  } catch (error) {
    console.error('Erro ao baixar modelo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função auxiliar para log de atividades
function logActivity(userId, username, action, module, entityType = null, entityId = null, details = {}) {
  try {
    const log = {
      id: db.generateId(),
      userId,
      username,
      action,
      module: module || 'general',
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: null // Será preenchido nas rotas quando disponível
    };
    db.saveActivityLog(log);
  } catch (error) {
    console.error('Erro ao salvar log de atividade:', error);
  }
}

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar esta rota.' });
  }
  next();
};

// Função auxiliar para gerar senhas aleatórias seguras
const generateRandomPassword = () => {
  return crypto.randomBytes(16).toString('base64').slice(0, 16).replace(/[+/=]/g, (char) => {
    const replacements = { '+': 'A', '/': 'B', '=': 'C' };
    return replacements[char] || char;
  });
};

// Função auxiliar para obter módulos padrão por role
const getDefaultModulesForRole = (role) => {
  switch (role) {
    case 'admin':
      return ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas', 'dre', 'admin'];
    case 'user':
      return ['dashboard', 'transactions', 'products', 'clients', 'reports', 'metas', 'dre'];
    case 'guest':
      return ['dashboard', 'metas', 'reports', 'dre'];
    default:
      return [];
  }
};

// Rotas de Autenticação
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    const user = db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar se é o primeiro login (lastLogin é null ou não existe)
    const isFirstLogin = !user.lastLogin;
    
    let isValidPassword = false;
    let newPassword = null;
    
    if (isFirstLogin) {
      // No primeiro login, aceitar qualquer senha
      isValidPassword = true;
      
      // Gerar nova senha aleatória
      newPassword = generateRandomPassword();
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      
      // Atualizar usuário com nova senha e lastLogin
      const now = new Date().toISOString();
      db.updateUser(user.id, { 
        password: hashedPassword,
        lastLogin: now 
      });
    } else {
      // Login normal: verificar senha
      isValidPassword = bcrypt.compareSync(password, user.password);
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Se não for primeiro login, atualizar lastLogin
    if (!isFirstLogin) {
      const now = new Date().toISOString();
      db.updateUser(user.id, { lastLogin: now });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Logar ação de login
    logActivity(user.id, user.username, 'login', 'auth', 'user', user.id);

    // Retornar dados completos do usuário
    const userData = db.getUserById(user.id);
    const { password: _, ...safeUser } = userData;

    const response = {
      success: true,
      token,
      user: {
        id: safeUser.id,
        username: safeUser.username,
        role: safeUser.role,
        modules: safeUser.modules || [],
        isActive: safeUser.isActive !== undefined ? safeUser.isActive : true,
        lastLogin: safeUser.lastLogin
      }
    };

    // Se for primeiro login, incluir a nova senha gerada
    if (isFirstLogin && newPassword) {
      response.firstLogin = true;
      response.newPassword = newPassword;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para resetar primeiro login de um usuário específico (apenas para admin)
app.post('/api/auth/reset-first-login', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username é obrigatório' });
    }

    const user = db.getUserByUsername(username);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Resetar lastLogin para null (permitir primeiro login novamente)
    db.updateUser(user.id, { lastLogin: null });

    // Logar ação
    logActivity(req.user.id, req.user.username, 'reset_password', 'admin', 'user', user.id);

    res.json({
      success: true,
      message: `Primeiro login resetado para o usuário ${username}. Agora você pode fazer login com qualquer senha novamente.`
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para resetar senhas de TODOS os usuários (apenas admin)
app.post('/api/auth/reset-all-passwords', authenticateToken, requireAdmin, (req, res) => {
  try {
    const allUsers = db.getAllUsers();
    let resetCount = 0;

    // Resetar lastLogin para null em todos os usuários
    allUsers.forEach(user => {
      db.updateUser(user.id, { lastLogin: null });
      resetCount++;
    });

    // Logar ação
    logActivity(req.user.id, req.user.username, 'reset_all_passwords', 'admin', 'system', null);

    res.json({
      success: true,
      message: `Senhas resetadas para ${resetCount} usuário(s). Todos os usuários precisarão fazer primeiro login novamente.`,
      resetCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/auth/verify', authenticateToken, (req, res) => {
  try {
    // Buscar dados completos do usuário
    const user = db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const { password: _, ...safeUser } = user;
    res.json({
      success: true,
      user: {
        id: safeUser.id,
        username: safeUser.username,
        role: safeUser.role,
        modules: safeUser.modules || [],
        isActive: safeUser.isActive !== undefined ? safeUser.isActive : true,
        lastLogin: safeUser.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para buscar dados do próprio perfil
app.get('/api/user/profile', authenticateToken, (req, res) => {
  try {
    const user = db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    
    const { password: _, ...safeUser } = user;
    res.json({
      success: true,
      data: {
        id: safeUser.id,
        username: safeUser.username,
        role: safeUser.role,
        modules: safeUser.modules || [],
        isActive: safeUser.isActive !== undefined ? safeUser.isActive : true,
        lastLogin: safeUser.lastLogin,
        createdAt: safeUser.createdAt,
        updatedAt: safeUser.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// Endpoint para atualizar username do próprio usuário
app.put('/api/user/profile', authenticateToken, (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username e senha são obrigatórios' });
    }
    
    // Validar formato do username
    if (username.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'O username deve ter pelo menos 3 caracteres' });
    }
    
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username.trim())) {
      return res.status(400).json({ success: false, error: 'O username não pode conter espaços ou acentos. Use apenas letras, números, underscore (_) ou hífen (-)' });
    }
    
    // Buscar usuário atual
    const currentUser = db.getUserById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    
    // Validar senha atual
    const isValidPassword = bcrypt.compareSync(password, currentUser.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Senha atual incorreta' });
    }
    
    // Verificar se o novo username é diferente do atual
    if (username.trim() === currentUser.username) {
      return res.status(400).json({ success: false, error: 'O novo username deve ser diferente do atual' });
    }
    
    // Verificar se username já está em uso
    const existingUser = db.getUserByUsername(username.trim());
    if (existingUser && existingUser.id !== req.user.id) {
      return res.status(400).json({ success: false, error: 'Username já está em uso' });
    }
    
    // Atualizar username
    const updatedUser = db.updateUser(req.user.id, { username: username.trim() });
    
    // Gerar novo token com username atualizado
    const token = jwt.sign(
      { id: updatedUser.id, username: updatedUser.username, role: updatedUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Logar ação
    logActivity(req.user.id, currentUser.username, 'update_username', 'user', 'user', req.user.id, { oldUsername: currentUser.username, newUsername: username.trim() });
    
    const { password: _, ...safeUser } = updatedUser;
    res.json({
      success: true,
      token,
      data: {
        id: safeUser.id,
        username: safeUser.username,
        role: safeUser.role,
        modules: safeUser.modules || [],
        isActive: safeUser.isActive !== undefined ? safeUser.isActive : true,
        lastLogin: safeUser.lastLogin,
        createdAt: safeUser.createdAt,
        updatedAt: safeUser.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Erro interno do servidor' });
  }
});

// Endpoint para alterar senha do próprio usuário
app.put('/api/user/password', authenticateToken, (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    
    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ success: false, error: 'Senha atual e nova senha são obrigatórias' });
    }
    
    if (novaSenha.length < 6) {
      return res.status(400).json({ success: false, error: 'A nova senha deve ter no mínimo 6 caracteres' });
    }
    
    // Buscar usuário atual
    const user = db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    
    // Validar senha atual
    const isValidPassword = bcrypt.compareSync(senhaAtual, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Senha atual incorreta' });
    }
    
    // Verificar se nova senha é diferente da atual
    const isSamePassword = bcrypt.compareSync(novaSenha, user.password);
    if (isSamePassword) {
      return res.status(400).json({ success: false, error: 'A nova senha deve ser diferente da senha atual' });
    }
    
    // Hash da nova senha
    const hashedPassword = bcrypt.hashSync(novaSenha, 10);
    
    // Atualizar senha
    db.updateUser(req.user.id, { password: hashedPassword });
    
    // Logar ação
    logActivity(req.user.id, user.username, 'update_password', 'user', 'user', req.user.id);
    
    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Erro interno do servidor' });
  }
});

// Rota para importar arquivos
app.post('/api/import', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado!' });
    }

    const { type } = req.body; // 'transactions', 'products' ou 'clients'
    
    if (!type || !['transactions', 'products', 'clients'].includes(type)) {
      return res.status(400).json({ error: 'Tipo inválido! Use "transactions", "products" ou "clients"' });
    }

    console.log(`Processando arquivo: ${req.file.originalname} (${type})`);

    // Ler o arquivo Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0]; // Pegar a primeira aba
    const worksheet = workbook.Sheets[sheetName];

    let processedData = [];
    let message = '';

    if (type === 'transactions') {
      processedData = processTransactions(worksheet);
      message = `${processedData.length} transações importadas com sucesso!`;
    } else if (type === 'products') {
      processedData = processProducts(worksheet);
      message = `${processedData.length} produtos importados com sucesso!`;
    } else if (type === 'clients') {
      processedData = processClients(worksheet);
      message = `${processedData.length} clientes importados com sucesso!`;
      
      // Salvar clientes processados no banco de dados
      processedData.forEach(client => {
        try {
          db.saveClient(client);
        } catch (error) {
          console.error('Erro ao salvar cliente:', error);
        }
      });
    }

    // Limpar o arquivo temporário
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: message,
      data: processedData,
      count: processedData.length,
      type: type
    });

  } catch (error) {
    console.error('Erro ao processar arquivo:', error);
    
    // Limpar arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

// Rota para exportar dados (futura implementação)
app.post('/api/export', (req, res) => {
  const { type, data } = req.body;
  
  try {
    // Criar um novo workbook
    const workbook = XLSX.utils.book_new();
    let worksheet;

    if (type === 'transactions') {
      // Mapear dados para formato Excel
      const excelData = data.map(t => ({
        'Data': t.date,
        'Descrição': t.description,
        'Valor': t.value,
        'Tipo': t.type,
        'Categoria': t.category
      }));
      worksheet = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transações');
    } else if (type === 'products') {
      // Mapear dados para formato Excel
      const excelData = data.map(p => ({
        'Nome': p.name,
        'Categoria': p.category,
        'Preço': p.price,
        'Custo': p.cost,
        'Estoque': p.stock,
        'Vendido': p.sold
      }));
      worksheet = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');
    } else if (type === 'clients') {
      // Mapear dados para formato Excel
      const excelData = data.map(c => ({
        'Nome': c.name,
        'Email': c.email,
        'Telefone': c.phone,
        'Endereço': c.address,
        'CPF': c.cpf || '',
        'CNPJ': c.cnpj || ''
      }));
      worksheet = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
    }

    // Gerar buffer do arquivo
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Configurar headers para download
    const filename = `${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length
    });

    res.send(buffer);

  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    res.status(500).json({ 
      error: 'Erro ao exportar dados',
      message: error.message 
    });
  }
});

// APIs para Transações
app.get('/api/transactions', (req, res) => {
  try {
    const transactions = db.getAllTransactions();
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/transactions', authenticateToken, (req, res) => {
  try {
    const transaction = db.saveTransaction(req.body);
    logActivity(req.user.id, req.user.username, 'create', 'transactions', 'transaction', transaction.id);
    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/transactions/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const transaction = db.updateTransaction(id, req.body);
    logActivity(req.user.id, req.user.username, 'edit', 'transactions', 'transaction', id);
    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/transactions/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    db.deleteTransaction(id);
    logActivity(req.user.id, req.user.username, 'delete', 'transactions', 'transaction', id);
    res.json({ success: true, message: 'Transação deletada com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/transactions', authenticateToken, (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'IDs devem ser um array' });
    }
    db.deleteMultipleTransactions(ids);
    logActivity(req.user.id, req.user.username, 'delete', 'transactions', 'transaction', null, { count: ids.length });
    res.json({ success: true, message: `${ids.length} transações deletadas com sucesso` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// APIs para Produtos
app.get('/api/products', (req, res) => {
  try {
    const products = db.getAllProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/products', authenticateToken, (req, res) => {
  try {
    const product = db.saveProduct(req.body);
    logActivity(req.user.id, req.user.username, 'create', 'products', 'product', product.id);
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/products/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const product = db.updateProduct(id, req.body);
    logActivity(req.user.id, req.user.username, 'edit', 'products', 'product', id);
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    db.deleteProduct(id);
    logActivity(req.user.id, req.user.username, 'delete', 'products', 'product', id);
    res.json({ success: true, message: 'Produto deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/products', authenticateToken, (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'IDs devem ser um array' });
    }
    db.deleteMultipleProducts(ids);
    logActivity(req.user.id, req.user.username, 'delete', 'products', 'product', null, { count: ids.length });
    res.json({ success: true, message: `${ids.length} produtos deletados com sucesso` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// APIs para Clientes
app.get('/api/clients', (req, res) => {
  try {
    const clients = db.getAllClients();
    res.json({ success: true, data: clients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/clients', authenticateToken, (req, res) => {
  try {
    const client = db.saveClient(req.body);
    logActivity(req.user.id, req.user.username, 'create', 'clients', 'client', client.id);
    res.json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/clients/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const client = db.updateClient(id, req.body);
    logActivity(req.user.id, req.user.username, 'edit', 'clients', 'client', id);
    res.json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/clients/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    db.deleteClient(id);
    logActivity(req.user.id, req.user.username, 'delete', 'clients', 'client', id);
    res.json({ success: true, message: 'Cliente deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/clients', authenticateToken, (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'IDs devem ser um array' });
    }
    db.deleteMultipleClients(ids);
    logActivity(req.user.id, req.user.username, 'delete', 'clients', 'client', null, { count: ids.length });
    res.json({ success: true, message: `${ids.length} clientes deletados com sucesso` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ROTAS ADMINISTRATIVAS =====

// Rotas de Usuários
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.getAllUsers();
    // Remover senhas antes de enviar
    const safeUsers = users.map(({ password, ...user }) => user);
    res.json({ success: true, data: safeUsers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const user = db.getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    const { password: _, ...safeUser } = user;
    res.json({ success: true, data: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { username, role, modules, isActive } = req.body;
    
    if (!username) {
      return res.status(400).json({ success: false, error: 'Username é obrigatório' });
    }
    
    // Verificar se usuário já existe
    if (db.getUserByUsername(username)) {
      return res.status(400).json({ success: false, error: 'Usuário já existe' });
    }
    
    // Criar hash placeholder que aceita qualquer senha no primeiro login
    // (igual aos usuários padrão)
    const placeholderPassword = bcrypt.hashSync('FIRST_LOGIN_PLACEHOLDER', 10);
    
    // Se módulos não foram fornecidos, usar módulos padrão da role
    const userRole = role || 'user';
    const defaultModules = getDefaultModulesForRole(userRole);
    const userModules = modules && modules.length > 0 ? modules : defaultModules;
    
    const newUser = {
      username,
      password: placeholderPassword,
      role: userRole,
      modules: userModules,
      isActive: isActive !== undefined ? isActive : true,
      lastLogin: null // null indica que nunca fez login
    };
    
    const user = db.saveUser(newUser);
    logActivity(req.user.id, req.user.username, 'create', 'admin', 'user', user.id, { username: user.username, role: user.role });
    
    const { password: _, ...safeUser } = user;
    res.json({ success: true, data: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    
    // Se houver senha, hash ela
    if (updates.password) {
      if (updates.password.length < 6) {
        return res.status(400).json({ success: false, error: 'Senha deve ter no mínimo 6 caracteres' });
      }
      updates.password = bcrypt.hashSync(updates.password, 10);
    }
    
    // Não permitir mudar role para admin de outro usuário (apenas o próprio admin pode ser admin)
    // Isso pode ser ajustado conforme necessário
    
    const updatedUser = db.updateUser(id, updates);
    logActivity(req.user.id, req.user.username, 'edit', 'admin', 'user', id, { changes: Object.keys(updates) });
    
    const { password: _, ...safeUser } = updatedUser;
    res.json({ success: true, data: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    
    // Não permitir deletar a si mesmo
    if (id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Não é possível deletar seu próprio usuário' });
    }
    
    const user = db.getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    
    db.deleteUser(id);
    logActivity(req.user.id, req.user.username, 'delete', 'admin', 'user', id, { username: user.username });
    
    res.json({ success: true, message: 'Usuário deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota pública para listar módulos (todos os usuários precisam ver módulos disponíveis)
app.get('/api/modules', authenticateToken, (req, res) => {
  try {
    const modules = db.getAllSystemModules();
    // Retornar apenas módulos ativos para usuários não-admin
    if (req.user.role !== 'admin') {
      const activeModules = modules.filter(m => m.isActive);
      return res.json({ success: true, data: activeModules });
    }
    res.json({ success: true, data: modules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rotas de Módulos (Admin)
app.get('/api/admin/modules', authenticateToken, requireAdmin, (req, res) => {
  try {
    const modules = db.getAllSystemModules();
    res.json({ success: true, data: modules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/modules/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const module = db.getSystemModuleById(id);
    if (!module) {
      return res.status(404).json({ success: false, error: 'Módulo não encontrado' });
    }
    res.json({ success: true, data: module });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/modules', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, key, icon, description, route, isActive } = req.body;
    
    if (!name || !key) {
      return res.status(400).json({ success: false, error: 'Nome e key são obrigatórios' });
    }
    
    const moduleData = {
      name,
      key,
      icon: icon || 'Package',
      description: description || '',
      route: route || null,
      isActive: isActive !== undefined ? isActive : true,
      isSystem: false
    };
    
    const module = db.saveSystemModule(moduleData);
    logActivity(req.user.id, req.user.username, 'create', 'admin', 'module', module.id, { name: module.name, key: module.key });
    
    res.json({ success: true, data: module });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/modules/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Não permitir mudar isSystem
    delete updates.isSystem;
    
    const module = db.updateSystemModule(id, updates);
    logActivity(req.user.id, req.user.username, 'edit', 'admin', 'module', id, { changes: Object.keys(updates) });
    
    res.json({ success: true, data: module });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/modules/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    
    const module = db.getSystemModuleById(id);
    if (!module) {
      return res.status(404).json({ success: false, error: 'Módulo não encontrado' });
    }
    
    db.deleteSystemModule(id);
    logActivity(req.user.id, req.user.username, 'delete', 'admin', 'module', id, { name: module.name, key: module.key });
    
    res.json({ success: true, message: 'Módulo deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rotas de Activity Log
app.get('/api/admin/activity-log', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { userId, module, action, startDate, endDate, limit, page } = req.query;
    
    const filters = {};
    if (userId) filters.userId = userId;
    if (module) filters.module = module;
    if (action) filters.action = action;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (limit) filters.limit = limit;
    if (page) filters.page = page;
    
    const logs = db.getActivityLogs(filters);
    res.json({ success: true, data: logs, count: logs.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rotas de Estatísticas
app.get('/api/admin/statistics', authenticateToken, requireAdmin, (req, res) => {
  try {
    const stats = db.getSystemStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/statistics/users/:userId', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const stats = db.getUserStatistics(userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/statistics/modules/:moduleKey', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { moduleKey } = req.params;
    const stats = db.getModuleStatistics(moduleKey);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/statistics/usage-timeline', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query;
    const timeline = db.getUsageTimeline(startDate, endDate, groupBy || 'day');
    res.json({ success: true, data: timeline });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API funcionando!', 
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/transactions - Listar transações',
      'POST /api/transactions - Criar transação',
      'PUT /api/transactions/:id - Atualizar transação',
      'DELETE /api/transactions/:id - Deletar transação',
      'DELETE /api/transactions - Deletar múltiplas transações',
      'GET /api/products - Listar produtos',
      'POST /api/products - Criar produto',
      'PUT /api/products/:id - Atualizar produto',
      'DELETE /api/products/:id - Deletar produto',
      'DELETE /api/products - Deletar múltiplos produtos',
      'GET /api/clients - Listar clientes',
      'POST /api/clients - Criar cliente',
      'PUT /api/clients/:id - Atualizar cliente',
      'DELETE /api/clients/:id - Deletar cliente',
      'DELETE /api/clients - Deletar múltiplos clientes',
      'POST /api/import - Importar arquivos Excel',
      'POST /api/export - Exportar dados para Excel',
      'POST /api/auth/login - Fazer login',
      'POST /api/auth/verify - Verificar token',
      'GET /api/test - Testar API'
    ]
  });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande! Máximo 5MB.' });
    }
  }
  
  res.status(400).json({ error: error.message });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`📡 API disponível em http://localhost:${port}`);
  console.log(`🧪 Teste a API em http://localhost:${port}/api/test`);
});
