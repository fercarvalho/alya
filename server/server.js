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
    'http://localhost:5173',
    'http://127.0.0.1:8000',
    'http://127.0.0.1:5173'
  ],
  credentials: true
}));
app.use(express.json());


// Criar pasta de avatares se não existir
const avatarsDir = path.join(__dirname, 'public', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Rota estática para servir avatares com cache
app.use('/api/avatars', express.static(path.join(__dirname, 'public', 'avatars'), {
  maxAge: '1y', // Cache por 1 ano
  etag: true, // Usar ETag para validação condicional
  lastModified: true // Usar Last-Modified header
}));

// Função para validar formato de email
function validateEmailFormat(email) {
  if (!email || typeof email !== 'string') return false;
  
  // Regex RFC 5322 simplificado
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Validações adicionais
  if (email.length < 5 || email.length > 254) return false;
  if (email.startsWith('.') || email.startsWith('-') || email.endsWith('.') || email.endsWith('-')) return false;
  
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  if (!parts[1].includes('.')) return false;
  
  return emailRegex.test(email);
}

// Função para deletar arquivo de avatar de forma segura
function deleteAvatarFile(photoUrl) {
  try {
    if (!photoUrl) return;
    
    // Extrair nome do arquivo do photoUrl
    // Ex: /api/avatars/user123-1234567890.webp -> user123-1234567890.webp
    let filename = photoUrl;
    if (photoUrl.includes('/')) {
      filename = photoUrl.split('/').pop();
    }
    
    // Validar que não contém path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      console.log('Tentativa de path traversal detectada:', filename);
      return;
    }
    
    // Construir caminho completo
    const filePath = path.join(avatarsDir, filename);
    
    // Verificar que o caminho resolvido está dentro do diretório de avatares
    const resolvedPath = path.resolve(filePath);
    const resolvedAvatarsDir = path.resolve(avatarsDir);
    
    if (!resolvedPath.startsWith(resolvedAvatarsDir)) {
      console.log('Tentativa de acessar arquivo fora do diretório de avatares:', resolvedPath);
      return;
    }
    
    // Verificar se arquivo existe e deletar
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Avatar deletado:', filename);
    }
  } catch (error) {
    // Logar erro mas não falhar a operação principal
    console.log('Erro ao deletar foto antiga:', error.message);
  }
}

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

// Configuração do Multer para upload de avatares (WebP)
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }
    cb(null, avatarsDir);
  },
  filename: function (req, file, cb) {
    // Gerar nome único: {userId ou uuid}-{timestamp}.webp
    // Se for admin criando usuário novo, usar UUID temporário
    // Se for usuário atualizando própria foto, usar userId
    const userId = req.user?.id || crypto.randomUUID();
    const timestamp = Date.now();
    cb(null, `${userId}-${timestamp}.webp`);
  }
});

const uploadAvatar = multer({ 
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    // Aceitar apenas arquivos WebP (já processados no frontend)
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;
    
    if (ext === '.webp' && mimeType === 'image/webp') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos WebP são permitidos!'), false);
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024 // Limite de 2MB após processamento
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
        firstName: safeUser.firstName,
        lastName: safeUser.lastName,
        email: safeUser.email,
        phone: safeUser.phone,
        photoUrl: safeUser.photoUrl,
        cpf: safeUser.cpf,
        birthDate: safeUser.birthDate,
        gender: safeUser.gender,
        position: safeUser.position,
        address: safeUser.address,
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
        firstName: safeUser.firstName,
        lastName: safeUser.lastName,
        email: safeUser.email,
        phone: safeUser.phone,
        photoUrl: safeUser.photoUrl,
        cpf: safeUser.cpf,
        birthDate: safeUser.birthDate,
        gender: safeUser.gender,
        position: safeUser.position,
        address: safeUser.address,
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
        firstName: safeUser.firstName,
        lastName: safeUser.lastName,
        email: safeUser.email,
        phone: safeUser.phone,
        photoUrl: safeUser.photoUrl,
        cpf: safeUser.cpf,
        birthDate: safeUser.birthDate,
        gender: safeUser.gender,
        position: safeUser.position,
        address: safeUser.address,
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

// Endpoint para upload de foto de perfil
app.post('/api/user/upload-photo', authenticateToken, uploadAvatar.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
    }

    // Validar que é WebP
    if (req.file.mimetype !== 'image/webp' || !req.file.filename.endsWith('.webp')) {
      // Deletar arquivo inválido
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ success: false, error: 'Apenas arquivos WebP são permitidos' });
    }

    // Retornar caminho relativo da foto
    const photoUrl = `/api/avatars/${req.file.filename}`;
    
    res.json({
      success: true,
      data: {
        photoUrl
      }
    });
  } catch (error) {
    // Se houver erro, tentar deletar arquivo se foi criado
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.log('Erro ao deletar arquivo após erro:', e.message);
      }
    }
    res.status(500).json({ success: false, error: error.message || 'Erro ao fazer upload da foto' });
  }
});

// Endpoint para atualizar perfil do próprio usuário
app.put('/api/user/profile', authenticateToken, (req, res) => {
  try {
    const { firstName, lastName, email, phone, photoUrl, password, cpf, birthDate, gender, position, address } = req.body;
    
    // Buscar usuário atual
    const currentUser = db.getUserById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    
    // Validar senha atual se fornecida (obrigatória para segurança)
    if (!password) {
      return res.status(400).json({ success: false, error: 'Senha atual é obrigatória para atualizar o perfil' });
    }
    
    const isValidPassword = bcrypt.compareSync(password, currentUser.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Senha atual incorreta' });
    }
    
    if (!firstName || firstName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Nome é obrigatório e deve ter pelo menos 2 caracteres' });
    }
    
    if (!lastName || lastName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Sobrenome é obrigatório e deve ter pelo menos 2 caracteres' });
    }
    
    if (email !== undefined && email !== null && email !== '') {
      if (!email || !email.trim()) {
        return res.status(400).json({ success: false, error: 'Email é obrigatório' });
      }
      if (!validateEmailFormat(email)) {
        return res.status(400).json({ success: false, error: 'Formato de email inválido' });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Email é obrigatório' });
    }
    
    if (phone !== undefined && phone !== null && phone !== '') {
      if (!phone) {
        return res.status(400).json({ success: false, error: 'Telefone é obrigatório' });
      }
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
        return res.status(400).json({ success: false, error: 'Telefone deve ter 10 ou 11 dígitos' });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Telefone é obrigatório' });
    }
    
    if (cpf !== undefined && cpf !== null && cpf !== '') {
      if (!cpf) {
        return res.status(400).json({ success: false, error: 'CPF é obrigatório' });
      }
      const cpfDigits = cpf.replace(/\D/g, '');
      if (cpfDigits.length !== 11) {
        return res.status(400).json({ success: false, error: 'CPF deve ter 11 dígitos' });
      }
    } else {
      return res.status(400).json({ success: false, error: 'CPF é obrigatório' });
    }
    
    if (!birthDate) {
      return res.status(400).json({ success: false, error: 'Data de nascimento é obrigatória' });
    }
    
    if (!gender) {
      return res.status(400).json({ success: false, error: 'Gênero é obrigatório' });
    }
    
    if (!position || !position.trim()) {
      return res.status(400).json({ success: false, error: 'Cargo é obrigatório' });
    }
    
    // Preparar dados para atualização - todos os campos são obrigatórios
    const updateData = {};
    
    if (firstName === undefined || !firstName || firstName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Nome é obrigatório e deve ter pelo menos 2 caracteres' });
    }
    updateData.firstName = firstName.trim();
    
    if (lastName === undefined || !lastName || lastName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Sobrenome é obrigatório e deve ter pelo menos 2 caracteres' });
    }
    updateData.lastName = lastName.trim();
    
    if (email === undefined || !email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email é obrigatório' });
    }
    if (!validateEmailFormat(email)) {
      return res.status(400).json({ success: false, error: 'Formato de email inválido' });
    }
    updateData.email = email.trim();
    
    if (phone === undefined || !phone) {
      return res.status(400).json({ success: false, error: 'Telefone é obrigatório' });
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
      return res.status(400).json({ success: false, error: 'Telefone deve ter 10 ou 11 dígitos' });
    }
    updateData.phone = phoneDigits;
    
    if (cpf === undefined || !cpf) {
      return res.status(400).json({ success: false, error: 'CPF é obrigatório' });
    }
    const cpfDigits = cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      return res.status(400).json({ success: false, error: 'CPF deve ter 11 dígitos' });
    }
    updateData.cpf = cpfDigits;
    
    if (!birthDate) {
      return res.status(400).json({ success: false, error: 'Data de nascimento é obrigatória' });
    }
    updateData.birthDate = birthDate;
    
    if (!gender) {
      return res.status(400).json({ success: false, error: 'Gênero é obrigatório' });
    }
    updateData.gender = gender;
    
    if (!position || !position.trim()) {
      return res.status(400).json({ success: false, error: 'Cargo é obrigatório' });
    }
    updateData.position = position.trim();
    
    if (!address || !address.cep) {
      return res.status(400).json({ success: false, error: 'CEP é obrigatório' });
    }
    const cepDigits = address.cep.replace(/\D/g, '');
    if (cepDigits.length !== 8) {
      return res.status(400).json({ success: false, error: 'CEP deve ter 8 dígitos' });
    }
    if (!address.street || !address.street.trim()) {
      return res.status(400).json({ success: false, error: 'Rua/Logradouro é obrigatório' });
    }
    if (!address.number || !address.number.trim()) {
      return res.status(400).json({ success: false, error: 'Número do endereço é obrigatório' });
    }
    if (!address.neighborhood || !address.neighborhood.trim()) {
      return res.status(400).json({ success: false, error: 'Bairro é obrigatório' });
    }
    if (!address.city || !address.city.trim()) {
      return res.status(400).json({ success: false, error: 'Cidade é obrigatória' });
    }
    if (!address.state || !address.state.trim() || address.state.length !== 2) {
      return res.status(400).json({ success: false, error: 'Estado (UF) é obrigatório e deve ter 2 caracteres' });
    }
    updateData.address = {
      cep: cepDigits,
      street: address.street.trim(),
      number: address.number.trim(),
      complement: address.complement ? address.complement.trim() : '',
      neighborhood: address.neighborhood.trim(),
      city: address.city.trim(),
      state: address.state.trim().toUpperCase()
    };
    
    // Se foto está sendo atualizada, deletar foto antiga
    if (photoUrl !== undefined) {
      if (currentUser.photoUrl && currentUser.photoUrl !== photoUrl) {
        deleteAvatarFile(currentUser.photoUrl);
      }
      updateData.photoUrl = photoUrl || null;
    }
    
    // Atualizar usuário
    const updatedUser = db.updateUser(req.user.id, updateData);
    
    // Gerar novo token
    const token = jwt.sign(
      { id: updatedUser.id, username: updatedUser.username, role: updatedUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const { password: _, ...safeUser } = updatedUser;
    
    logActivity(req.user.id, req.user.username, 'edit', 'admin', 'user', req.user.id, { 
      fields: Object.keys(updateData) 
    });
    
    res.json({
      success: true,
      data: safeUser,
      token
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

// ===== PROJEÇÃO (impgeo-style, adaptada ao Alya) =====
// Regras:
// - auth-all: todas as rotas exigem token
// - admin-only: config/sync/clear-all exigem admin
// - base do ano anterior + overrides: impgeo-style (projection-base.json)

app.get('/api/projection', authenticateToken, (req, res) => {
  try {
    const snapshot = db.getProjectionSnapshot();
    if (!snapshot) {
      const synced = db.syncProjectionData();
      return res.json({ success: true, data: synced });
    }
    res.json({ success: true, data: snapshot });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Base (Resultado do Ano Anterior + overrides manuais)
app.get('/api/projection/base', authenticateToken, (req, res) => {
  try {
    const base = db.getProjectionBase();
    res.json({ success: true, data: base });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/projection/base', authenticateToken, (req, res) => {
  try {
    const current = db.getProjectionBase();
    const body = req.body || {};

    const merged = {
      ...current,
      ...body,
      growth: { ...(current.growth || {}), ...(body.growth || {}) },
      prevYear: {
        ...(current.prevYear || {}),
        ...(body.prevYear || {}),
        revenueStreams: { ...(current.prevYear?.revenueStreams || {}), ...(body.prevYear?.revenueStreams || {}) },
        mktComponents: { ...(current.prevYear?.mktComponents || {}), ...(body.prevYear?.mktComponents || {}) }
      },
      manualOverrides: {
        ...(current.manualOverrides || {}),
        ...(body.manualOverrides || {}),
        revenueManual: { ...(current.manualOverrides?.revenueManual || {}), ...(body.manualOverrides?.revenueManual || {}) }
      }
    };

    // merge profundo por stream (para não perder campos quando vierem parciais)
    if (body?.manualOverrides?.revenueManual && typeof body.manualOverrides.revenueManual === 'object') {
      for (const [streamId, v] of Object.entries(body.manualOverrides.revenueManual)) {
        const prev = current.manualOverrides?.revenueManual?.[streamId] || {};
        merged.manualOverrides.revenueManual[streamId] = { ...prev, ...(v || {}) };
      }
    }

    const updatedBase = db.updateProjectionBase(merged);
    const synced = db.syncProjectionData();
    logActivity(req.user.id, req.user.username, 'edit', 'projecao', 'projection_base', null);
    res.json({ success: true, data: updatedBase, projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/projection/sync', authenticateToken, requireAdmin, (req, res) => {
  try {
    const synced = db.syncProjectionData();
    logActivity(req.user.id, req.user.username, 'sync', 'projecao', 'projection', null);
    res.json({ success: true, data: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Importar base da projeção a partir das transações reais (ano anterior)
app.post('/api/projection/sync-from-transactions', authenticateToken, requireAdmin, (req, res) => {
  try {
    const year = req.body?.year || new Date().getFullYear() - 1;
    const synced = db.syncProjectionBaseFromTransactions(year);
    logActivity(req.user.id, req.user.username, 'sync', 'projecao', 'projection_from_transactions', { year });
    res.json({ success: true, data: synced, message: `Base importada das transações de ${year}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/projection/config', authenticateToken, (req, res) => {
  try {
    const cfg = db.getProjectionConfig();
    res.json({ success: true, data: cfg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/projection/config', authenticateToken, requireAdmin, (req, res) => {
  try {
    const updated = db.updateProjectionConfig(req.body || {});
    // Persistir chaves novas no projection-base (streams/componentes recém-criados)
    try {
      db.updateProjectionBase(db.getProjectionBase());
    } catch (e) {
      // não falhar a rota por isso
    }
    const synced = db.syncProjectionData();
    logActivity(req.user.id, req.user.username, 'edit', 'projecao', 'projection_config', null);
    res.json({ success: true, data: updated, projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Growth (percentuais de cenários)
app.put('/api/projection/growth', authenticateToken, (req, res) => {
  try {
    const { minimo, medio, maximo } = req.body || {};
    const current = db.getProjectionBase();
    const updated = db.updateProjectionBase({
      ...current,
      growth: {
        minimo: Number(minimo) || 0,
        medio: Number(medio) || 0,
        maximo: Number(maximo) || 0
      }
    });
    const synced = db.syncProjectionData();
    logActivity(req.user.id, req.user.username, 'edit', 'projecao', 'growth', null);
    res.json({ success: true, data: updated.growth, projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Revenue (por stream)
app.get('/api/projection/revenue', authenticateToken, (req, res) => {
  try {
    const data = db.getRevenueData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/projection/revenue', authenticateToken, (req, res) => {
  try {
    const updated = db.updateRevenueData(req.body || {});
    const synced = db.syncProjectionData();
    logActivity(req.user.id, req.user.username, 'edit', 'projecao', 'revenue', null);
    res.json({ success: true, data: updated, projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/projection/revenue', authenticateToken, (req, res) => {
  try {
    const cfg = db.getProjectionConfig();
    const months12 = new Array(12).fill(0);
    const base = db.getProjectionBase();
    const next = { ...base };
    for (const s of (cfg.revenueStreams || [])) {
      if (!s?.id) continue;
      next.prevYear.revenueStreams[s.id] = [...months12];
      if (next.manualOverrides?.revenueManual?.[s.id]) {
        next.manualOverrides.revenueManual[s.id] = {
          previsto: new Array(12).fill(null),
          medio: new Array(12).fill(null),
          maximo: new Array(12).fill(null)
        };
      }
    }
    const cleared = db.updateProjectionBase(next);
    const synced = db.syncProjectionData();
    logActivity(req.user.id, req.user.username, 'delete', 'projecao', 'revenue', null);
    res.json({ success: true, data: cleared, projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// MKT components (por componente)
app.get('/api/projection/mkt-components', authenticateToken, (req, res) => {
  try {
    const data = db.getMktComponentsData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/projection/mkt-components', authenticateToken, (req, res) => {
  try {
    const updated = db.updateMktComponentsData(req.body || {});
    const synced = db.syncProjectionData();
    logActivity(req.user.id, req.user.username, 'edit', 'projecao', 'mkt_components', null);
    res.json({ success: true, data: updated, projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/projection/mkt-components', authenticateToken, (req, res) => {
  try {
    const cfg = db.getProjectionConfig();
    const months12 = new Array(12).fill(0);
    const base = db.getProjectionBase();
    const next = { ...base };
    for (const c of (cfg.mktComponents || [])) {
      if (!c?.id) continue;
      next.prevYear.mktComponents[c.id] = [...months12];
    }
    // também limpar overrides do MKT do ano corrente
    next.manualOverrides.mktPrevistoManual = new Array(12).fill(null);
    next.manualOverrides.mktMedioManual = new Array(12).fill(null);
    next.manualOverrides.mktMaximoManual = new Array(12).fill(null);
    const cleared = db.updateProjectionBase(next);
    const synced = db.syncProjectionData();
    logActivity(req.user.id, req.user.username, 'delete', 'projecao', 'mkt_components', null);
    res.json({ success: true, data: cleared, projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fixed expenses
app.get('/api/projection/fixed-expenses', authenticateToken, (req, res) => {
  try {
    const data = db.getFixedExpensesData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/projection/fixed-expenses', authenticateToken, (req, res) => {
  try {
    const body = req.body || {};
    const months = Array.isArray(body?.previsto) ? body.previsto : [];
    const base = db.getProjectionBase();
    const updated = db.updateProjectionBase({
      ...base,
      prevYear: { ...(base.prevYear || {}), fixedExpenses: months }
    });
    const synced = db.syncProjectionData();
    logActivity(req.user.id, req.user.username, 'edit', 'projecao', 'fixed_expenses', null);
    res.json({ success: true, data: db.getFixedExpensesData(), projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/projection/fixed-expenses', authenticateToken, (req, res) => {
  try {
    const months12 = new Array(12).fill(0);
    const base = db.getProjectionBase();
    const cleared = db.updateProjectionBase({
      ...base,
      prevYear: { ...(base.prevYear || {}), fixedExpenses: [...months12] },
      manualOverrides: {
        ...(base.manualOverrides || {}),
        fixedPrevistoManual: new Array(12).fill(null),
        fixedMediaManual: new Array(12).fill(null),
        fixedMaximoManual: new Array(12).fill(null)
      }
    });
    const synced = db.syncProjectionData();
    logActivity(req.user.id, req.user.username, 'delete', 'projecao', 'fixed_expenses', null);
    res.json({ success: true, data: cleared, projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Variable expenses
app.get('/api/projection/variable-expenses', authenticateToken, (req, res) => {
  try {
    const data = db.getVariableExpensesData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/projection/variable-expenses', authenticateToken, (req, res) => {
  try {
    const body = req.body || {};
    const months = Array.isArray(body?.previsto) ? body.previsto : [];
    const base = db.getProjectionBase();
    const updated = db.updateProjectionBase({
      ...base,
      prevYear: { ...(base.prevYear || {}), variableExpenses: months }
    });
    const synced = db.syncProjectionData();
    logActivity(req.user.id, req.user.username, 'edit', 'projecao', 'variable_expenses', null);
    res.json({ success: true, data: db.getVariableExpensesData(), projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/projection/variable-expenses', authenticateToken, (req, res) => {
  try {
    const months12 = new Array(12).fill(0);
    const base = db.getProjectionBase();
    const cleared = db.updateProjectionBase({
      ...base,
      prevYear: { ...(base.prevYear || {}), variableExpenses: [...months12] },
      manualOverrides: {
        ...(base.manualOverrides || {}),
        variablePrevistoManual: new Array(12).fill(null),
        variableMedioManual: new Array(12).fill(null),
        variableMaximoManual: new Array(12).fill(null)
      }
    });
    const synced = db.syncProjectionData();
    logActivity(req.user.id, req.user.username, 'delete', 'projecao', 'variable_expenses', null);
    res.json({ success: true, data: cleared, projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Investments
app.get('/api/projection/investments', authenticateToken, (req, res) => {
  try {
    const data = db.getInvestmentsData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/projection/investments', authenticateToken, (req, res) => {
  try {
    const body = req.body || {};
    const months = Array.isArray(body?.previsto) ? body.previsto : [];
    const base = db.getProjectionBase();
    const updated = db.updateProjectionBase({
      ...base,
      prevYear: { ...(base.prevYear || {}), investments: months }
    });
    const synced = db.syncProjectionData();
    logActivity(req.user.id, req.user.username, 'edit', 'projecao', 'investments', null);
    res.json({ success: true, data: db.getInvestmentsData(), projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/projection/investments', authenticateToken, (req, res) => {
  try {
    const months12 = new Array(12).fill(0);
    const base = db.getProjectionBase();
    const cleared = db.updateProjectionBase({
      ...base,
      prevYear: { ...(base.prevYear || {}), investments: [...months12] },
      manualOverrides: {
        ...(base.manualOverrides || {}),
        investimentosPrevistoManual: new Array(12).fill(null),
        investimentosMedioManual: new Array(12).fill(null),
        investimentosMaximoManual: new Array(12).fill(null)
      }
    });
    const synced = db.syncProjectionData();
    logActivity(req.user.id, req.user.username, 'delete', 'projecao', 'investments', null);
    res.json({ success: true, data: cleared, projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Derived read-only endpoints (budget/resultado)
app.get('/api/projection/budget', authenticateToken, (req, res) => {
  try {
    const data = db.getBudgetData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/projection/resultado', authenticateToken, (req, res) => {
  try {
    const data = db.getResultadoData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear all projection data (admin)
app.delete('/api/clear-all-projection-data', authenticateToken, requireAdmin, (req, res) => {
  try {
    const months12 = new Array(12).fill(0);
    const cfg = db.getProjectionConfig();
    const base = db.getProjectionBase();
    const next = { ...base };
    next.growth = { minimo: 0, medio: 0, maximo: 0 };
    next.prevYear.fixedExpenses = [...months12];
    next.prevYear.variableExpenses = [...months12];
    next.prevYear.investments = [...months12];
    for (const s of (cfg.revenueStreams || [])) {
      if (!s?.id) continue;
      next.prevYear.revenueStreams[s.id] = [...months12];
      next.manualOverrides.revenueManual[s.id] = {
        previsto: new Array(12).fill(null),
        medio: new Array(12).fill(null),
        maximo: new Array(12).fill(null)
      };
    }
    for (const c of (cfg.mktComponents || [])) {
      if (!c?.id) continue;
      next.prevYear.mktComponents[c.id] = [...months12];
    }
    next.manualOverrides.fixedPrevistoManual = new Array(12).fill(null);
    next.manualOverrides.fixedMediaManual = new Array(12).fill(null);
    next.manualOverrides.fixedMaximoManual = new Array(12).fill(null);
    next.manualOverrides.variablePrevistoManual = new Array(12).fill(null);
    next.manualOverrides.variableMedioManual = new Array(12).fill(null);
    next.manualOverrides.variableMaximoManual = new Array(12).fill(null);
    next.manualOverrides.investimentosPrevistoManual = new Array(12).fill(null);
    next.manualOverrides.investimentosMedioManual = new Array(12).fill(null);
    next.manualOverrides.investimentosMaximoManual = new Array(12).fill(null);
    next.manualOverrides.mktPrevistoManual = new Array(12).fill(null);
    next.manualOverrides.mktMedioManual = new Array(12).fill(null);
    next.manualOverrides.mktMaximoManual = new Array(12).fill(null);

    db.updateProjectionBase(next);
    const synced = db.syncProjectionData();

    logActivity(req.user.id, req.user.username, 'delete', 'projecao', 'clear_all', null);
    res.json({ success: true, message: 'Dados de Projeção limpos com sucesso', data: synced });
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
    const { 
      username, 
      firstName, 
      lastName, 
      email, 
      phone, 
      photoUrl, 
      cpf,
      birthDate,
      gender,
      position,
      address,
      role, 
      modules, 
      isActive 
    } = req.body;
    
    if (!username) {
      return res.status(400).json({ success: false, error: 'Username é obrigatório' });
    }
    
    if (!firstName || firstName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Nome é obrigatório e deve ter pelo menos 2 caracteres' });
    }
    
    if (!lastName || lastName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Sobrenome é obrigatório e deve ter pelo menos 2 caracteres' });
    }
    
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email é obrigatório' });
    }
    
    if (!validateEmailFormat(email)) {
      return res.status(400).json({ success: false, error: 'Formato de email inválido' });
    }
    
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Telefone é obrigatório' });
    }
    
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
      return res.status(400).json({ success: false, error: 'Telefone deve ter 10 ou 11 dígitos' });
    }
    
    if (!cpf) {
      return res.status(400).json({ success: false, error: 'CPF é obrigatório' });
    }
    
    const cpfDigits = cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      return res.status(400).json({ success: false, error: 'CPF deve ter 11 dígitos' });
    }
    
    if (!birthDate) {
      return res.status(400).json({ success: false, error: 'Data de nascimento é obrigatória' });
    }
    
    if (!gender) {
      return res.status(400).json({ success: false, error: 'Gênero é obrigatório' });
    }
    
    if (!position || !position.trim()) {
      return res.status(400).json({ success: false, error: 'Cargo é obrigatório' });
    }
    
    if (!address || !address.cep) {
      return res.status(400).json({ success: false, error: 'CEP é obrigatório' });
    }
    
    const cepDigits = address.cep.replace(/\D/g, '');
    if (cepDigits.length !== 8) {
      return res.status(400).json({ success: false, error: 'CEP deve ter 8 dígitos' });
    }
    
    if (!address.street || !address.street.trim()) {
      return res.status(400).json({ success: false, error: 'Rua/Logradouro é obrigatório' });
    }
    
    if (!address.number || !address.number.trim()) {
      return res.status(400).json({ success: false, error: 'Número do endereço é obrigatório' });
    }
    
    if (!address.neighborhood || !address.neighborhood.trim()) {
      return res.status(400).json({ success: false, error: 'Bairro é obrigatório' });
    }
    
    if (!address.city || !address.city.trim()) {
      return res.status(400).json({ success: false, error: 'Cidade é obrigatória' });
    }
    
    if (!address.state || !address.state.trim() || address.state.length !== 2) {
      return res.status(400).json({ success: false, error: 'Estado (UF) é obrigatório e deve ter 2 caracteres' });
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
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: email || undefined,
      phone: phone ? phone.replace(/\D/g, '') : undefined, // Remover máscara
      photoUrl: photoUrl || undefined,
      cpf: cpf ? cpf.replace(/\D/g, '') : undefined, // Remover máscara
      birthDate: birthDate || undefined,
      gender: gender || undefined,
      position: position || undefined,
      address: address || undefined,
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
    
    // Deletar foto do usuário se existir
    if (user.photoUrl) {
      deleteAvatarFile(user.photoUrl);
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
  console.error('[ERROR] Erro capturado:', error);
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
