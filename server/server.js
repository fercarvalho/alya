// Carregar variáveis de ambiente
require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const sgMail = require("@sendgrid/mail");
const Database = require("./database-pg");

// 🔒 FASE 2: Middlewares de Segurança
const {
  configureHelmet,
  generalLimiter,
  authLimiter,
  createLimiter,
  uploadLimiter,
  passwordRecoveryLimiter,
  passwordTokenValidationLimiter,
  passwordResetLimiter,
  configureSanitization,
  securityLogger,
  customSecurityHeaders,
} = require("./middleware/security");

// 🔒 FASE 8: CSP com Nonces
const { cspNonceMiddleware } = require("./middleware/csp-nonce");

const {
  validateLogin,
  validateUserRegistration,
  validateProfileUpdate,
  validateClientCreation,
  validateTransaction,
  validatePasswordRecovery,
  validatePasswordReset,
  sanitizeBody,
} = require("./middleware/validation");

const { logAudit, AUDIT_OPERATIONS, AUDIT_STATUS } = require("./utils/audit");

const {
  TOKEN_EXPIRY,
  createRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  rotateRefreshToken,
} = require("./utils/refresh-tokens");

const {
  generateSecurePassword,
  validateCPF,
  validateCNPJ,
  validateDocument,
  sanitizeForLogging,
} = require("./utils/security-utils");

// 🚨 Sistema de Alertas de Segurança
const securityAlerts = require("./utils/security-alerts");

// 🔒 Gerenciamento de Sessões Ativas
const sessionManager = require("./utils/session-manager");

// 🔍 Sistema de Detecção de Anomalias
const anomalyDetection = require("./utils/anomaly-detection");

const app = express();
const port = process.env.PORT || 8001;
const db = new Database();

// 🔒 CORREÇÃO DE SEGURANÇA: Forçar HTTPS em produção
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    // Verificar se a requisição já está em HTTPS
    const proto = req.headers["x-forwarded-proto"];
    if (proto && proto !== "https") {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });

  // Trust proxy (necessário para Nginx)
  app.set("trust proxy", 1);
}

// Validar JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error(
    "❌ ERRO CRÍTICO: JWT_SECRET não está definido nas variáveis de ambiente!",
  );
  console.error(
    "   Configure JWT_SECRET no arquivo .env ou nas variáveis de ambiente do sistema.",
  );
  console.error(
    "   Para gerar uma chave segura, execute: openssl rand -base64 32",
  );
  process.exit(1);
}

// Configurar SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL =
  process.env.SENDGRID_FROM_EMAIL || "naoresponda@viverdepj.com.br";
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn(
    "⚠️ AVISO: SENDGRID_API_KEY não definido. E-mails não serão enviados.",
  );
}

// 🔒 FASE 2: Aplicar middlewares de segurança
// Helmet deve vir primeiro para definir headers de segurança
app.use(configureHelmet());
app.use(customSecurityHeaders);

// 🔒 FASE 8: CSP com Nonces (sobrescreve CSP do helmet)
app.use(cspNonceMiddleware);

// Rate limiting geral para todas as requisições
app.use("/api/", generalLimiter);

// Sanitização de dados (NoSQL injection e HPP)
app.use(configureSanitization());

// Configurar origens CORS a partir da variável de ambiente
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : [
    "https://alya.sistemas.viverdepj.com.br",
    "http://localhost:8000",
    "http://localhost:5173",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:5173",
  ];

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining"],
    maxAge: 86400, // 24 horas de cache para preflight
  }),
);
app.use(express.json({ limit: "10mb" })); // Limitar tamanho do payload
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logger de segurança
app.use(securityLogger);

// Sanitização adicional do body
app.use(sanitizeBody);

// Criar pasta de avatares se não existir
const avatarsDir = path.join(__dirname, "public", "avatars");
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Rota estática para servir avatares com cache
app.use(
  "/api/avatars",
  express.static(path.join(__dirname, "public", "avatars"), {
    maxAge: "1y", // Cache por 1 ano
    etag: true, // Usar ETag para validação condicional
    lastModified: true, // Usar Last-Modified header
  }),
);

// Função para validar formato de email
function validateEmailFormat(email) {
  if (!email || typeof email !== "string") return false;

  // Regex RFC 5322 simplificado
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Validações adicionais
  if (email.length < 5 || email.length > 254) return false;
  if (
    email.startsWith(".") ||
    email.startsWith("-") ||
    email.endsWith(".") ||
    email.endsWith("-")
  )
    return false;

  const parts = email.split("@");
  if (parts.length !== 2) return false;
  if (!parts[1].includes(".")) return false;

  return emailRegex.test(email);
}

// Função para deletar arquivo de avatar de forma segura
function deleteAvatarFile(photoUrl) {
  try {
    if (!photoUrl) return;

    // Extrair nome do arquivo do photoUrl
    // Ex: /api/avatars/user123-1234567890.webp -> user123-1234567890.webp
    let filename = photoUrl;
    if (photoUrl.includes("/")) {
      filename = photoUrl.split("/").pop();
    }

    // Validar que não contém path traversal
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      console.log("Tentativa de path traversal detectada:", filename);
      return;
    }

    // Construir caminho completo
    const filePath = path.join(avatarsDir, filename);

    // Verificar que o caminho resolvido está dentro do diretório de avatares
    const resolvedPath = path.resolve(filePath);
    const resolvedAvatarsDir = path.resolve(avatarsDir);

    if (!resolvedPath.startsWith(resolvedAvatarsDir)) {
      console.log(
        "Tentativa de acessar arquivo fora do diretório de avatares:",
        resolvedPath,
      );
      return;
    }

    // Verificar se arquivo existe e deletar
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("Avatar deletado:", filename);
    }
  } catch (error) {
    // Logar erro mas não falhar a operação principal
    console.log("Erro ao deletar foto antiga:", error.message);
  }
}

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token de acesso requerido" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido" });
    }
    req.user = user;
    next();
  });
};

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Manter o nome original com timestamp para evitar conflitos
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Aceitar apenas arquivos .xlsx
    if (path.extname(file.originalname).toLowerCase() === ".xlsx") {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos .xlsx são permitidos!"), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5MB
  },
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
    const userId = req.user?.id || crypto.randomUUID();
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext) {
      if (file.mimetype === 'image/jpeg') ext = '.jpg';
      else if (file.mimetype === 'image/png') ext = '.png';
      else ext = '.webp';
    }
    cb(null, `${userId}-${Date.now()}${ext}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    const validMimetypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    const validExts = ['.jpeg', '.jpg', '.png', '.webp', ''];

    if (validMimetypes.includes(file.mimetype) && validExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos JPG, PNG ou WebP são permitidos!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB (frontend comprime antes do upload)
  },
});

// Helper genérico para ler coluna do Excel de forma case-insensitive,
// ignorando acentos e espaços extras no cabeçalho.
function getCellValue(row, possibleHeaders, defaultValue = undefined) {
  if (!row || typeof row !== "object") return defaultValue;

  // 1) Tentativa direta (case-sensitive), para não quebrar nada existente
  for (const header of possibleHeaders) {
    if (
      row[header] !== undefined &&
      row[header] !== null &&
      row[header] !== ""
    ) {
      return row[header];
    }
  }

  // 2) Tentativa case-insensitive e accent-insensitive
  const normalize = (str) =>
    String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const normalizedTargets = possibleHeaders.map(normalize);

  for (const [key, value] of Object.entries(row)) {
    if (value === undefined || value === null || value === "") continue;
    const nk = normalize(key);
    if (normalizedTargets.includes(nk)) {
      return value;
    }
  }

  return defaultValue;
}

// Função para processar dados de transações
function processTransactions(worksheet) {
  const data = XLSX.utils.sheet_to_json(worksheet);
  const transactions = [];

  data.forEach((row, index) => {
    try {
      const rawDate = getCellValue(row, ["Data", "date", "data"]);
      const rawDescription = getCellValue(row, [
        "Descrição",
        "Descricao",
        "description",
        "Description",
      ]);
      const rawValue = getCellValue(row, [
        "Valor",
        "value",
        "Value",
        "Valor (R$)",
      ]);
      const rawType = getCellValue(row, [
        "Tipo",
        "tipo",
        "type",
        "Type",
        "Tipo de Categoria",
        "tipo de categoria",
      ]);
      const rawCategory = getCellValue(row, [
        "Categoria",
        "categoria",
        "category",
        "Category",
      ]);

      const typeLower = (rawType || "").toString().trim().toLowerCase();
      const typeFormatted =
        typeLower === "despesa" ||
        typeLower === "saida" ||
        typeLower === "saída" ||
        typeLower === "expense"
          ? "Despesa"
          : "Receita";

      // Tratar datas do Excel (podem ser serial numbers, Date objects ou strings)
      let dateFormatted;
      if (rawDate instanceof Date) {
        dateFormatted = rawDate.toISOString().split("T")[0];
      } else if (typeof rawDate === "number") {
        // Serial number do Excel
        const d = XLSX.SSF.parse_date_code(rawDate);
        dateFormatted = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      } else if (rawDate) {
        const d = new Date(rawDate);
        dateFormatted = isNaN(d.getTime())
          ? new Date().toISOString().split("T")[0]
          : d.toISOString().split("T")[0];
      } else {
        dateFormatted = new Date().toISOString().split("T")[0];
      }

      const transaction = {
        date: dateFormatted,
        description: (rawDescription || "").toString().trim(),
        value: parseFloat(rawValue || 0),
        type: typeFormatted,
        category: (rawCategory || "Outros").toString().trim(),
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
      const name = getCellValue(row, ["Nome", "name", "Name"]);
      const category = getCellValue(row, [
        "Categoria",
        "categoria",
        "category",
        "Category",
      ]);
      const price = getCellValue(row, [
        "Preço",
        "Preco",
        "preco",
        "price",
        "Price",
        "Preço (R$)",
      ]);
      const cost = getCellValue(row, ["Custo", "custo", "cost", "Cost"]);
      const stock = getCellValue(row, ["Estoque", "estoque", "stock", "Stock"]);
      const sold = getCellValue(row, ["Vendido", "vendido", "sold", "Sold"]);

      const product = {
        id: Date.now() + index,
        name: (name || "").toString().trim(),
        category: (category || "Outros").toString().trim(),
        price: parseFloat(price || 0),
        cost: parseFloat(cost || 0),
        stock: parseInt(stock || 0),
        sold: parseInt(sold || 0),
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
      const documentType =
        getCellValue(row, [
          "Tipo de Documento",
          "tipo de documento",
          "Tipo de documento",
        ]) || "cpf";
      const client = {
        id: Date.now() + index,
        name: row["Nome"] || row["name"] || row["Name"] || "",
        email: row["Email"] || row["email"] || row["Email"] || "",
        phone: row["Telefone"] || row["phone"] || row["Phone"] || "",
        address:
          row["Endereço"] ||
          row["Endereco"] ||
          row["address"] ||
          row["Address"] ||
          "",
        cpf:
          documentType === "cpf"
            ? row["CPF"] || row["cpf"] || row["Cpf"] || ""
            : "",
        cnpj:
          documentType === "cnpj"
            ? row["CNPJ"] || row["cnpj"] || row["Cnpj"] || ""
            : "",
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
app.get("/api/modelo/:type", (req, res) => {
  try {
    const { type } = req.params;

    if (!["transactions", "products", "clients"].includes(type)) {
      return res.status(400).json({
        error: 'Tipo inválido! Use "transactions", "products" ou "clients"',
      });
    }

    // Sempre gerar arquivo modelo dinamicamente para garantir colunas atualizadas
    const workbook = XLSX.utils.book_new();
    let worksheet;

    if (type === "transactions") {
      const fileName = "modelo-transacoes.xlsx";
      const filePath = path.join(__dirname, "public", fileName);

      if (fs.existsSync(filePath)) {
        return res.download(filePath, fileName);
      }

      // Criar dados de exemplo
      const sampleData = [
        {
          Data: "2024-01-15",
          Descrição: "Venda de produto",
          Valor: 150.0,
          Tipo: "Receita",
          Categoria: "Vendas",
        },
      ];
      worksheet = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transações");
    } else if (type === "products") {
      const fileName = "modelo-produtos.xlsx";
      const filePath = path.join(__dirname, "public", fileName);

      if (fs.existsSync(filePath)) {
        return res.download(filePath, fileName);
      }

      // Criar dados de exemplo
      const sampleData = [
        {
          Nome: "",
          Categoria: "",
          Preço: "",
          Custo: "",
          Estoque: "",
          Vendido: "",
        },
      ];
      worksheet = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos");
    } else if (type === "clients") {
      const sampleData = [
        {
          Nome: "João Silva",
          Email: "joao@email.com",
          Telefone: "(11) 99999-9999",
          Endereço: "Rua das Flores, 123",
          "Tipo de Documento": "cpf",
          CPF: "123.456.789-00",
          CNPJ: "",
        },
        {
          Nome: "Empresa XYZ Ltda",
          Email: "contato@empresa.com",
          Telefone: "(11) 88888-8888",
          Endereço: "Av. Principal, 456",
          "Tipo de Documento": "cnpj",
          CPF: "",
          CNPJ: "12.345.678/0001-90",
        },
      ];
      worksheet = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const filename =
      type === "transactions"
        ? "modelo-transacoes.xlsx"
        : type === "clients"
          ? "modelo-clientes.xlsx"
          : "modelo-produtos.xlsx";
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });
    return res.send(buffer);
  } catch (error) {
    console.error("Erro ao baixar modelo:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Função auxiliar para log de atividades
async function logActivity(
  userId,
  username,
  action,
  module,
  entityType = null,
  entityId = null,
  details = {},
) {
  try {
    const log = {
      id: db.generateId(),
      userId,
      username,
      action,
      module: module || "general",
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: null, // Será preenchido nas rotas quando disponível
    };
    await db.saveActivityLog(log);
  } catch (error) {
    console.error("Erro ao salvar log de atividade:", error);
  }
}

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "superadmin" && req.user.role !== "admin") {
    return res.status(403).json({
      error: "Acesso negado. Apenas administradores podem acessar esta rota.",
    });
  }
  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({
      error: "Acesso negado. Apenas super administradores podem acessar esta rota.",
    });
  }
  next();
};

// 🔒 FASE 3: Função de geração de senha melhorada
// Agora usa generateSecurePassword() que garante requisitos de complexidade
const generateRandomPassword = () => {
  return generateSecurePassword(16);
};

// Função auxiliar para obter módulos padrão por role
const getDefaultModulesForRole = (role) => {
  switch (role) {
    case "superadmin":
      return [
        "dashboard", "transactions", "products", "clients",
        "reports", "metas", "dre", "projecao",
        "admin", "activeSessions", "anomalies", "securityAlerts",
      ];
    case "admin":
      return [
        "dashboard", "transactions", "products", "clients",
        "reports", "metas", "dre", "projecao", "admin",
      ];
    case "user":
      return [
        "dashboard",
        "transactions",
        "products",
        "clients",
        "reports",
        "metas",
        "dre",
      ];
    case "guest":
      return ["dashboard", "metas", "reports", "dre"];
    default:
      return [];
  }
};

// 🔒 Rate Limiters movidos para ./middleware/security.js

// Rotas de Autenticação
app.post("/api/auth/login", authLimiter, validateLogin, async (req, res) => {
  try {
    const { username, password, inviteToken } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Usuário e senha são obrigatórios" });
    }

    const user = await db.getUserByUsername(username);
    if (!user) {
      // 🔒 AUDITORIA: Login falhou - usuário não encontrado
      await logAudit({
        operation: AUDIT_OPERATIONS.LOGIN_FAILURE,
        username,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers["user-agent"],
        details: { reason: "user_not_found" },
        status: AUDIT_STATUS.FAILURE,
        errorMessage: "Usuário não encontrado",
      });

      // 🚨 ALERTA: Verificar tentativas de brute force para usuário inexistente
      try {
        const recentFailures = await db.pool.query(
          `SELECT COUNT(*) as count FROM audit_logs
           WHERE username = $1
           AND operation = 'login_failure'
           AND created_at > NOW() - INTERVAL '10 minutes'`,
          [username],
        );

        if (recentFailures.rows[0]?.count >= 5) {
          await securityAlerts.alertBruteForce(
            username,
            parseInt(recentFailures.rows[0].count),
            req.ip || req.connection?.remoteAddress,
            "10 minutos",
          );
        }
      } catch (alertError) {
        console.error("Erro ao enviar alerta de segurança:", alertError);
      }

      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    // Verificar se é o primeiro login (lastLogin é null ou não existe)
    const isFirstLogin = !user.lastLogin;

    let isValidPassword = false;
    let newPassword = null;

    if (isFirstLogin) {
      // 🔒 CORREÇÃO DE SEGURANÇA CRÍTICA:
      // Primeiro login agora requer token de convite válido e senha temporária

      if (!inviteToken) {
        return res.status(401).json({
          error: "Token de convite necessário para primeiro acesso",
          requiresInvite: true,
        });
      }

      // Validar token de convite
      const invite = await db.validateUserInvite(inviteToken);
      if (!invite) {
        return res
          .status(401)
          .json({ error: "Token de convite inválido ou expirado" });
      }

      // Verificar se o token pertence a este usuário
      if (invite.userId !== user.id) {
        return res
          .status(401)
          .json({ error: "Token de convite não pertence a este usuário" });
      }

      // Validar senha temporária contra o hash do convite
      isValidPassword = bcrypt.compareSync(password, invite.tempPasswordHash);

      if (!isValidPassword) {
        // 🔒 AUDITORIA: Login falhou - senha temporária incorreta
        await logAudit({
          operation: AUDIT_OPERATIONS.LOGIN_FAILURE,
          userId: user.id,
          username: user.username,
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers["user-agent"],
          details: { reason: "invalid_temp_password", firstLogin: true },
          status: AUDIT_STATUS.FAILURE,
          errorMessage: "Senha temporária incorreta",
        });

        // 🚨 ALERTA: Senha temporária incorreta em primeiro login (suspeito)
        try {
          await securityAlerts.alertSuspiciousLogin(
            user.username,
            req.ip || req.connection?.remoteAddress,
            "Tentativa de primeiro login com senha temporária incorreta",
          );
        } catch (alertError) {
          console.error("Erro ao enviar alerta de segurança:", alertError);
        }

        return res.status(401).json({ error: "Senha temporária incorreta" });
      }

      // Gerar nova senha aleatória para o usuário alterar posteriormente
      newPassword = generateRandomPassword();
      const hashedPassword = bcrypt.hashSync(newPassword, 10);

      // Atualizar usuário com nova senha e lastLogin
      const now = new Date().toISOString();
      await db.updateUser(user.id, {
        password: hashedPassword,
        lastLogin: now,
      });

      // Marcar convite como usado
      await db.markInviteAsUsed(inviteToken);
    } else {
      // Login normal: verificar senha
      isValidPassword = bcrypt.compareSync(password, user.password);

      if (!isValidPassword) {
        // 🔒 AUDITORIA: Login falhou - senha incorreta
        await logAudit({
          operation: AUDIT_OPERATIONS.LOGIN_FAILURE,
          userId: user.id,
          username: user.username,
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers["user-agent"],
          details: { reason: "invalid_password" },
          status: AUDIT_STATUS.FAILURE,
          errorMessage: "Senha incorreta",
        });

        // 🚨 ALERTA: Verificar tentativas de brute force (senha incorreta)
        try {
          const recentFailures = await db.pool.query(
            `SELECT COUNT(*) as count FROM audit_logs
             WHERE user_id = $1
             AND operation = 'login_failure'
             AND created_at > NOW() - INTERVAL '10 minutes'`,
            [user.id],
          );

          if (recentFailures.rows[0]?.count >= 5) {
            await securityAlerts.alertBruteForce(
              user.username,
              parseInt(recentFailures.rows[0].count),
              req.ip || req.connection?.remoteAddress,
              "10 minutos",
            );
          }
        } catch (alertError) {
          console.error("Erro ao enviar alerta de segurança:", alertError);
        }

        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      // Atualizar lastLogin
      const now = new Date().toISOString();
      await db.updateUser(user.id, { lastLogin: now });
    }

    // 🔒 FASE 3: Access token de curta duração (15 minutos)
    const accessToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN },
    );

    // 🔒 FASE 3: Criar refresh token de longa duração (7 dias)
    const { token: refreshToken, tokenId: refreshTokenId } =
      await createRefreshToken({
        userId: user.id,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers["user-agent"],
      });

    // 🔒 FASE 4: Criar sessão ativa (rastreamento de dispositivos)
    try {
      await sessionManager.createSession(user.username, refreshTokenId, req);
      console.log(`[Session] ✅ Sessão ativa criada para ${user.username}`);
    } catch (sessionError) {
      console.error("[Session] Erro ao criar sessão:", sessionError);
      // Não bloqueia o login se falhar
    }

    // Logar ação de login
    await logActivity(user.id, user.username, "login", "auth", "user", user.id);

    // 🔒 AUDITORIA: Login bem-sucedido
    await logAudit({
      operation: AUDIT_OPERATIONS.LOGIN_SUCCESS,
      userId: user.id,
      username: user.username,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers["user-agent"],
      details: {
        role: user.role,
        firstLogin: isFirstLogin,
      },
      status: AUDIT_STATUS.SUCCESS,
    });

    // 🚨 ALERTA: Detectar múltiplos IPs (login bem-sucedido de IPs diferentes)
    try {
      const recentIPs = await db.pool.query(
        `SELECT DISTINCT ip_address FROM audit_logs
         WHERE user_id = $1
         AND operation = 'login_success'
         AND created_at > NOW() - INTERVAL '1 hour'
         LIMIT 5`,
        [user.id],
      );

      const uniqueIPs = recentIPs.rows
        .map((row) => row.ip_address)
        .filter(Boolean);

      if (uniqueIPs.length >= 3) {
        await securityAlerts.alertMultipleIPs(
          user.username,
          uniqueIPs,
          "1 hora",
        );
      }
    } catch (alertError) {
      console.error("Erro ao enviar alerta de segurança:", alertError);
    }

    // 🚨 ALERTA: Detectar múltiplos dispositivos (User-Agents diferentes)
    try {
      const recentDevices = await db.pool.query(
        `SELECT DISTINCT user_agent FROM audit_logs
         WHERE user_id = $1
         AND operation = 'login_success'
         AND created_at > NOW() - INTERVAL '24 hours'
         LIMIT 10`,
        [user.id],
      );

      const uniqueDevices = recentDevices.rows
        .map((row) => row.user_agent)
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

      if (uniqueDevices.length >= 4) {
        await securityAlerts.alertMultipleDevices(
          user.username,
          uniqueDevices.slice(0, 5), // Limita a 5 dispositivos no alerta
          "24 horas",
        );
      }
    } catch (alertError) {
      console.error("Erro ao enviar alerta de segurança:", alertError);
    }

    // 🔍 FASE 7: Detecção de Anomalias (Machine Learning)
    try {
      const geo = await sessionManager.getGeolocation(
        req.ip || req.connection?.remoteAddress,
      );
      const anomalyResults = await anomalyDetection.detectAnomalies(
        user.username,
        {
          country: geo.country,
          city: geo.city,
          ip: req.ip || req.connection?.remoteAddress,
          hour: new Date().getHours(),
        },
      );

      if (anomalyResults.anomalies.length > 0) {
        console.log(
          `[Anomaly] ⚠️  ${anomalyResults.anomalies.length} anomalias detectadas para ${user.username} (score: ${anomalyResults.totalScore.toFixed(1)})`,
        );
      }
    } catch (anomalyError) {
      console.error("[Anomaly] Erro ao detectar anomalias:", anomalyError);
      // Não bloqueia o login se falhar
    }

    // Retornar dados completos do usuário
    const userData = await db.getUserById(user.id);
    const { password: _, ...safeUser } = userData;

    const response = {
      success: true,
      accessToken,
      refreshToken,
      expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN_MS,
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
        lastLogin: safeUser.lastLogin,
      },
    };

    // Se for primeiro login, incluir a nova senha gerada
    if (isFirstLogin && newPassword) {
      response.firstLogin = true;
      response.newPassword = newPassword;
    }

    res.json(response);
  } catch (error) {
    // Gerar código de erro único para rastreamento
    const errorCode = `AUTH-${Date.now().toString(36).toUpperCase()}`;

    // Log detalhado no servidor
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error(`❌ [ERRO DE LOGIN] Código: ${errorCode}`);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error(`📋 Detalhes do erro:`);
    console.error(`   Tipo: ${error.name || 'Error'}`);
    console.error(`   Mensagem: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    console.error(`   Username: ${req.body?.username || 'N/A'}`);
    console.error(`   IP: ${req.ip || req.connection?.remoteAddress || 'N/A'}`);
    console.error(`   User-Agent: ${req.headers["user-agent"] || 'N/A'}`);
    console.error(`   Timestamp: ${new Date().toISOString()}`);

    // Identificar tipo de erro
    let errorType = 'unknown';
    let errorDetails = error.message;

    if (error.code === '42P01') {
      errorType = 'database_table_not_found';
      errorDetails = `Tabela não encontrada: ${error.message}. Execute as migrações do banco de dados.`;
    } else if (error.code === 'ECONNREFUSED') {
      errorType = 'database_connection_refused';
      errorDetails = 'Não foi possível conectar ao banco de dados PostgreSQL. Verifique se o serviço está rodando.';
    } else if (error.code === '28P01') {
      errorType = 'database_auth_failed';
      errorDetails = 'Falha na autenticação com o banco de dados. Verifique as credenciais no .env';
    } else if (error.code === '3D000') {
      errorType = 'database_not_found';
      errorDetails = 'Banco de dados não encontrado. Crie o banco de dados primeiro.';
    } else if (error.message?.includes('refresh_tokens')) {
      errorType = 'missing_migration_003';
      errorDetails = 'Tabela refresh_tokens não existe. Execute a migração 003.';
    } else if (error.message?.includes('active_sessions')) {
      errorType = 'missing_migration_005';
      errorDetails = 'Tabela active_sessions não existe. Execute a migração 005.';
    }

    console.error(`   Tipo de erro: ${errorType}`);
    console.error(`   Detalhes: ${errorDetails}`);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error(`💡 Possíveis soluções:`);

    if (errorType.includes('migration')) {
      console.error(`   1. Execute as migrações pendentes:`);
      console.error(`      cd /var/www/alya/server/migrations`);
      console.error(`      psql -U seuusuario -d alya -h localhost -f "003 - SEGURANCA.sql"`);
    } else if (errorType === 'database_connection_refused') {
      console.error(`   1. Verifique se PostgreSQL está rodando:`);
      console.error(`      sudo systemctl status postgresql`);
      console.error(`   2. Inicie o PostgreSQL se necessário:`);
      console.error(`      sudo systemctl start postgresql`);
    } else if (errorType === 'database_auth_failed') {
      console.error(`   1. Verifique o arquivo .env:`);
      console.error(`      DB_USER, DB_PASSWORD, DB_NAME, DB_HOST`);
      console.error(`   2. Teste a conexão manualmente:`);
      console.error(`      psql -U seuusuario -d alya -h localhost`);
    } else if (errorType === 'database_not_found') {
      console.error(`   1. Crie o banco de dados:`);
      console.error(`      psql -U seuusuario -h localhost -c "CREATE DATABASE alya;"`);
      console.error(`   2. Execute as migrações iniciais`);
    } else {
      console.error(`   1. Verifique os logs acima para mais detalhes`);
      console.error(`   2. Verifique se todas as dependências estão instaladas`);
      console.error(`   3. Verifique se o arquivo .env está configurado`);
    }

    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Resposta genérica para o usuário (segurança)
    res.status(500).json({
      error: "Erro interno do servidor. Tente novamente mais tarde.",
      errorCode: errorCode,
      message: "Ocorreu um problema ao processar sua solicitação. Se o problema persistir, entre em contato com o suporte informando o código do erro."
    });
  }
});

// 🔒 FASE 3: Endpoint para renovar access token usando refresh token
app.post("/api/auth/refresh", authLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token é obrigatório" });
    }

    // Verificar refresh token
    const tokenData = await verifyRefreshToken(refreshToken);

    if (!tokenData) {
      // 🔒 AUDITORIA: Tentativa de refresh com token inválido
      await logAudit({
        operation: AUDIT_OPERATIONS.INVALID_TOKEN,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers["user-agent"],
        details: { reason: "invalid_refresh_token" },
        status: AUDIT_STATUS.FAILURE,
        errorMessage: "Refresh token inválido ou expirado",
      });

      // 🚨 ALERTA: Possível roubo de token (refresh token inválido ou revogado)
      try {
        await securityAlerts.alertTokenTheft(
          "Desconhecido",
          req.ip || req.connection?.remoteAddress,
          refreshToken.substring(0, 20) + "...",
        );
      } catch (alertError) {
        console.error("Erro ao enviar alerta de segurança:", alertError);
      }

      return res
        .status(401)
        .json({ error: "Refresh token inválido ou expirado" });
    }

    // Gerar novo access token
    const newAccessToken = jwt.sign(
      {
        id: tokenData.userId,
        username: tokenData.username,
        role: tokenData.role,
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN },
    );

    // Rotacionar refresh token (opcional, mas recomendado para segurança)
    const newRefreshToken = await rotateRefreshToken(
      refreshToken,
      req.ip || req.connection?.remoteAddress,
      req.headers["user-agent"],
    );

    if (!newRefreshToken) {
      return res
        .status(401)
        .json({ error: "Erro ao rotacionar refresh token" });
    }

    // 🔒 AUDITORIA: Token renovado com sucesso
    await logAudit({
      operation: "token_refresh",
      userId: tokenData.userId,
      username: tokenData.username,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers["user-agent"],
      details: { role: tokenData.role },
      status: AUDIT_STATUS.SUCCESS,
    });

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN_MS,
    });
  } catch (error) {
    console.error("Erro ao renovar token:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// 🔒 FASE 3: Endpoint para logout (revogar refresh token)
app.post("/api/auth/logout", authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const { success, tokenId } = await revokeRefreshToken(refreshToken);

      // 🔒 FASE 4: Revogar sessão ativa
      if (success && tokenId) {
        try {
          await sessionManager.revokeSessionByRefreshTokenId(tokenId);
          console.log(
            `[Session] ✅ Sessão revogada para usuário ${req.user.username}`,
          );
        } catch (sessionError) {
          console.error("[Session] Erro ao revogar sessão:", sessionError);
          // Não bloqueia o logout se falhar
        }
      }
    }

    // Logar ação de logout
    await logActivity(
      req.user.id,
      req.user.username,
      "logout",
      "auth",
      "user",
      req.user.id,
    );

    // 🔒 AUDITORIA: Logout
    await logAudit({
      operation: AUDIT_OPERATIONS.LOGOUT,
      userId: req.user.id,
      username: req.user.username,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers["user-agent"],
      details: {},
      status: AUDIT_STATUS.SUCCESS,
    });

    res.json({ success: true, message: "Logout realizado com sucesso" });
  } catch (error) {
    console.error("Erro no logout:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// 🔒 FASE 3: Endpoint para logout de todos os dispositivos
app.post("/api/auth/logout-all", authenticateToken, async (req, res) => {
  try {
    // Obter o refresh token da requisição para manter a sessão atual ativa
    const currentRefreshToken = req.body.refreshToken;

    // Buscar o refresh_token_id da sessão atual
    let currentRefreshTokenId = null;
    if (currentRefreshToken) {
      try {
        const tokenResult = await db.pool.query(
          'SELECT id FROM refresh_tokens WHERE token = $1 AND revoked = FALSE',
          [currentRefreshToken]
        );
        if (tokenResult.rows.length > 0) {
          currentRefreshTokenId = tokenResult.rows[0].id;
        }
      } catch (err) {
        console.error('[Logout-All] Erro ao buscar refresh_token_id:', err);
      }
    }

    const revokedCount = await revokeAllUserTokens(req.user.id);

    // 🔒 FASE 4: Revogar todas as sessões ativas EXCETO a atual
    try {
      const sessionsRevoked = await sessionManager.revokeAllUserSessions(
        req.user.username,
        "Logout de todos os dispositivos",
        currentRefreshTokenId, // Passar o ID do refresh token atual para manter ativo
      );
      console.log(
        `[Session] ✅ ${sessionsRevoked} sessões revogadas para ${req.user.username}${currentRefreshTokenId ? ' (sessão atual mantida)' : ''}`,
      );
    } catch (sessionError) {
      console.error(
        "[Session] Erro ao revogar todas as sessões:",
        sessionError,
      );
      // Não bloqueia o logout se falhar
    }

    // Logar ação
    await logActivity(
      req.user.id,
      req.user.username,
      "logout_all_devices",
      "auth",
      "user",
      req.user.id,
    );

    // 🔒 AUDITORIA: Logout de todos os dispositivos
    await logAudit({
      operation: AUDIT_OPERATIONS.LOGOUT_ALL_DEVICES,
      userId: req.user.id,
      username: req.user.username,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers["user-agent"],
      details: { devicesLoggedOut: revokedCount },
      status: AUDIT_STATUS.SUCCESS,
    });

    res.json({
      success: true,
      message: `${revokedCount} sessão(ões) encerrada(s) com sucesso`,
    });
  } catch (error) {
    console.error("Erro ao fazer logout de todos os dispositivos:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// 🔒 FASE 4: Endpoint para listar sessões ativas do usuário
app.get("/api/user/sessions", authenticateToken, async (req, res) => {
  try {
    const sessions = await sessionManager.getUserSessions(req.user.username);

    res.json({
      success: true,
      sessions: sessions.map((session) => ({
        id: session.id,
        device: {
          type: session.device_type,
          name: session.device_name,
          browser: session.browser,
          os: session.os,
        },
        location: {
          country: session.country,
          city: session.city,
          ipAddress: session.ip_address,
        },
        activity: {
          createdAt: session.created_at,
          lastActivityAt: session.last_activity_at,
          expiresAt: session.expires_at,
        },
        isActive: session.is_active,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar sessões:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// 🔒 FASE 4: Endpoint para revogar uma sessão específica
app.delete("/api/user/sessions/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a sessão pertence ao usuário
    const session = await sessionManager.getSessionById(id);

    if (!session) {
      return res.status(404).json({ error: "Sessão não encontrada" });
    }

    if (session.user_id !== req.user.username) {
      return res
        .status(403)
        .json({ error: "Sem permissão para revogar esta sessão" });
    }

    // Revogar sessão
    await sessionManager.revokeSession(
      id,
      "Revogada pelo usuário via endpoint",
    );

    // Logar ação
    await logActivity(
      req.user.id,
      req.user.username,
      "revoke_session",
      "auth",
      "session",
      id,
    );

    // Auditoria
    await logAudit({
      operation: "revoke_session",
      userId: req.user.id,
      username: req.user.username,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers["user-agent"],
      details: { sessionId: id },
      status: AUDIT_STATUS.SUCCESS,
    });

    res.json({
      success: true,
      message: "Sessão revogada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao revogar sessão:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// 🔍 FASE 7: Dashboard de Anomalias - Estatísticas gerais
app.get(
  "/api/admin/anomalies/stats",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { days = 7 } = req.query;

      // Buscar anomalias recentes
      const anomaliesQuery = await db.pool.query(`
      SELECT
        COUNT(*) as total_anomalies,
        COUNT(DISTINCT user_id) as affected_users,
        AVG((details->>'score')::numeric) as avg_score,
        jsonb_agg(DISTINCT details->>'type') as anomaly_types
      FROM audit_logs
      WHERE operation = 'anomaly_detected'
        AND created_at > NOW() - INTERVAL '${parseInt(days)} days'
    `);

      // Top usuários com mais anomalias
      const topUsersQuery = await db.pool.query(`
      SELECT
        user_id,
        username,
        COUNT(*) as anomaly_count,
        MAX(created_at) as last_anomaly
      FROM audit_logs
      WHERE operation = 'anomaly_detected'
        AND created_at > NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY user_id, username
      ORDER BY anomaly_count DESC
      LIMIT 10
    `);

      // Anomalias por tipo
      const byTypeQuery = await db.pool.query(`
      SELECT
        details->>'type' as type,
        COUNT(*) as count,
        AVG((details->>'score')::numeric) as avg_score
      FROM audit_logs
      WHERE operation = 'anomaly_detected'
        AND created_at > NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY details->>'type'
      ORDER BY count DESC
    `);

      res.json({
        success: true,
        period: `${days} dias`,
        stats: {
          total: parseInt(anomaliesQuery.rows[0]?.total_anomalies) || 0,
          affectedUsers: parseInt(anomaliesQuery.rows[0]?.affected_users) || 0,
          avgScore: parseFloat(anomaliesQuery.rows[0]?.avg_score) || 0,
          types: anomaliesQuery.rows[0]?.anomaly_types || [],
        },
        topUsers: topUsersQuery.rows,
        byType: byTypeQuery.rows,
      });
    } catch (error) {
      console.error("Erro ao obter estatísticas de anomalias:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// 🔍 FASE 7: Dashboard de Anomalias - Anomalias recentes
app.get(
  "/api/admin/anomalies/recent",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { limit = 50, severity } = req.query;

      let query = `
      SELECT
        id,
        user_id,
        username,
        operation,
        details,
        ip_address,
        created_at
      FROM audit_logs
      WHERE operation = 'anomaly_detected'
    `;

      if (severity) {
        query += ` AND (details->>'score')::numeric >= ${parseInt(severity)}`;
      }

      query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)}`;

      const result = await db.pool.query(query);

      res.json({
        success: true,
        anomalies: result.rows.map((row) => ({
          id: row.id,
          userId: row.user_id,
          username: row.username,
          type: row.details.type,
          score: row.details.score,
          details: row.details,
          ipAddress: row.ip_address,
          timestamp: row.created_at,
        })),
      });
    } catch (error) {
      console.error("Erro ao obter anomalias recentes:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// 🔍 FASE 7: Dashboard de Anomalias - Baseline do usuário
app.get(
  "/api/admin/anomalies/baseline/:username",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { username } = req.params;

      const baseline = await anomalyDetection.getUserBaseline(username);

      if (!baseline) {
        return res.status(404).json({
          error:
            "Baseline não encontrado. Usuário novo ou sem histórico suficiente.",
        });
      }

      res.json({
        success: true,
        username,
        baseline: {
          countries: baseline.countries,
          cities: baseline.cities,
          accessHours: baseline.accessHours,
          totalLogins: baseline.totalLogins,
          activeDays: baseline.activeDays,
          avgRequestsPerMinute: baseline.avgRequestsPerMinute,
        },
      });
    } catch (error) {
      console.error("Erro ao obter baseline:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// 🔍 FASE 7: Dashboard de Anomalias - Ajustar thresholds
app.put(
  "/api/admin/anomalies/thresholds",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const updates = req.body;

      // Validar thresholds
      const validKeys = [
        "MAX_REQUESTS_PER_MINUTE",
        "MAX_FAILED_LOGINS_PER_HOUR",
        "MAX_COUNTRIES_PER_DAY",
        "MAX_IPS_PER_DAY",
        "UNUSUAL_HOUR_START",
        "UNUSUAL_HOUR_END",
        "Z_SCORE_THRESHOLD",
      ];

      const invalidKeys = Object.keys(updates).filter(
        (key) => !validKeys.includes(key),
      );
      if (invalidKeys.length > 0) {
        return res.status(400).json({
          error: `Chaves inválidas: ${invalidKeys.join(", ")}`,
        });
      }

      // Aplicar updates (em produção, salvar no DB ou arquivo de config)
      // Por ora, apenas retornar os novos valores
      res.json({
        success: true,
        message: "Thresholds atualizados. Reinicie o servidor para aplicar.",
        newThresholds: updates,
        note: "Em produção, implementar persistência no banco de dados.",
      });
    } catch (error) {
      console.error("Erro ao atualizar thresholds:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// 🔒 FASE 8: Endpoint para obter CSP nonce atual (para SPAs)
app.get("/api/csp/nonce", (req, res) => {
  res.json({
    success: true,
    nonce: res.nonce || res.locals.cspNonce,
  });
});

// 🚨 FASE 6: Portal de Alertas de Segurança

// Listar alertas recentes (Admin)
app.get("/api/admin/security-alerts", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type; // Filtro opcional por tipo

    let query = `
      SELECT
        id,
        user_id,
        username,
        operation as action,
        details,
        ip_address,
        created_at
      FROM audit_logs
      WHERE operation IN (
        'login_failed_suspicious',
        'multiple_ips_detected',
        'token_theft_detected',
        'sql_injection_attempt',
        'xss_attempt',
        'brute_force_detected',
        'new_country_login',
        'multiple_devices_detected'
      )
    `;

    const params = [];
    let paramIndex = 1;

    if (type) {
      query += ` AND operation = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.pool.query(query, params);

    // Contar total de alertas
    let countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs
      WHERE operation IN (
        'login_failed_suspicious',
        'multiple_ips_detected',
        'token_theft_detected',
        'sql_injection_attempt',
        'xss_attempt',
        'brute_force_detected',
        'new_country_login',
        'multiple_devices_detected'
      )
    `;

    const countParams = [];
    if (type) {
      countQuery += ` AND operation = $1`;
      countParams.push(type);
    }

    const countResult = await db.pool.query(countQuery, countParams);

    res.json({
      alerts: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
    });
  } catch (error) {
    console.error("Erro ao buscar alertas de segurança:", error);
    res.status(500).json({ error: "Erro ao buscar alertas" });
  }
});

// Estatísticas de alertas (Admin)
app.get("/api/admin/security-alerts/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const statsQuery = `
      SELECT
        operation as action,
        COUNT(*) as count,
        COUNT(DISTINCT username) as affected_users
      FROM audit_logs
      WHERE operation IN (
        'login_failed_suspicious',
        'multiple_ips_detected',
        'token_theft_detected',
        'sql_injection_attempt',
        'xss_attempt',
        'brute_force_detected',
        'new_country_login',
        'multiple_devices_detected'
      )
      AND created_at >= $1
      GROUP BY operation
      ORDER BY count DESC
    `;

    const result = await db.pool.query(statsQuery, [since]);

    const total = result.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    const uniqueUsers = new Set(result.rows.map(row => row.affected_users));

    res.json({
      period: `${days} dias`,
      total,
      affectedUsers: uniqueUsers.size,
      byType: result.rows,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas de alertas:", error);
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});

// Endpoint para resetar primeiro login de um usuário específico (apenas para admin)
app.post(
  "/api/auth/reset-first-login",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ error: "Username é obrigatório" });
      }

      const user = await db.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Resetar lastLogin para null (permitir primeiro login novamente)
      await db.updateUser(user.id, { lastLogin: null });

      // Logar ação
      await logActivity(
        req.user.id,
        req.user.username,
        "reset_password",
        "admin",
        "user",
        user.id,
      );

      res.json({
        success: true,
        message: `Primeiro login resetado para o usuário ${username}. Agora você pode fazer login com qualquer senha novamente.`,
      });
    } catch (error) {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// Endpoint para resetar senhas de TODOS os usuários (apenas admin)
app.post(
  "/api/auth/reset-all-passwords",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const allUsers = await db.getAllUsers();
      let resetCount = 0;

      // Resetar lastLogin para null em todos os usuários
      for (const user of allUsers) {
        await db.updateUser(user.id, { lastLogin: null });
        resetCount++;
      }

      // Logar ação
      await logActivity(
        req.user.id,
        req.user.username,
        "reset_all_passwords",
        "admin",
        "system",
        null,
      );

      res.json({
        success: true,
        message: `Senhas resetadas para ${resetCount} usuário(s). Todos os usuários precisarão fazer primeiro login novamente.`,
        resetCount,
      });
    } catch (error) {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

app.post("/api/auth/verify", authenticateToken, async (req, res) => {
  try {
    // Buscar dados completos do usuário
    const user = await db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
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
        lastLogin: safeUser.lastLogin,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Recuperação de senha: Solicitar token
app.post(
  "/api/auth/recuperar-senha",
  passwordRecoveryLimiter,
  async (req, res) => {
    try {
      const { login } = req.body; // pode ser username ou email

      if (!login) {
        return res.status(400).json({
          error: "Informe um email ou usuário para recuperar a senha",
        });
      }

      // Buscar usuário pelo username ou pelo email
      let user = await db.getUserByUsername(login);
      if (!user) {
        // Se não encontrou por username, tenta por email iterando (ou cria-se getUserByEmail no pg).
        // Como db-postgres.js não tem getUserByEmail, e getAllUsers pode ser pesado,
        // faremos um work-around (em produção ideal é ter getUserByEmail direto na query).
        const all = await db.getAllUsers();
        user = all.find((u) => u.email === login);
      }

      // Se o usuário não existir ou não tiver email, não revelamos o erro por segurança. (Neutral response)
      if (!user || (!user.email && validateEmailFormat(login))) {
        return res.json({
          success: true,
          message:
            "Se as informações estiverem corretas, você receberá um e-mail com as instruções para redefinir sua senha.",
        });
      }

      if (!user.email) {
        return res.status(400).json({
          error:
            "Usuário não tem um e-mail cadastrado. Contate o administrador.",
        });
      }

      // Gerar token (expira em 60 min)
      const tokenRecord = await db.criarTokenRecuperacao(user.id, 60);

      // Enviar e-mail via SendGrid se configurado
      if (SENDGRID_API_KEY) {
        const resetLink = `${process.env.VITE_API_URL || "https://alya.sistemas.viverdepj.com.br"}/login?token=${tokenRecord.token}`;

        const msg = {
          to: user.email,
          from: {
            email: SENDGRID_FROM_EMAIL,
            name: process.env.SENDGRID_FROM_NAME || "Alya Sistemas",
          },
          subject: "Alya - Recuperação de Senha",
          text: `Olá ${user.firstName || user.username},\n\nVocê solicitou a recuperação de senha no sistema Alya.\n\nAcesse o link abaixo para redefinir sua senha. O link é válido por 60 minutos:\n\n${resetLink}\n\nSe você não solicitou isso, pode ignorar este e-mail.\n\nAtenciosamente,\nEquipe Alya`,
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <p style="text-align: center; margin-bottom: 30px;">
                <span style="font-size: 24px; font-weight: bold; color: #d97706;">Alya</span>
            </p>
            <h2 style="color: #1e293b; margin-bottom: 20px;">Recuperação de Senha</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.5;">Olá <strong>${user.firstName || user.username}</strong>,</p>
            <p style="color: #475569; font-size: 16px; line-height: 1.5;">Você solicitou a recuperação de senha no sistema Alya.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Redefinir Senha</a>
            </div>
            <p style="color: #64748b; font-size: 14px; text-align: center;">Este link é válido por 60 minutos.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">Se você não solicitou a alteração de senha, pode ignorar este e-mail em segurança.</p>
          </div>
        `,
        };

        try {
          await sgMail.send(msg);
          console.log(`E-mail de recuperação enviado para: ${user.email}`);
        } catch (sgError) {
          console.error("Erro ao enviar e-mail pelo SendGrid:", sgError);
          if (sgError.response) {
            console.error(sgError.response.body);
          }
          return res.status(500).json({
            error:
              "Erro ao tentar enviar o e-mail de recuperação. Tente novamente mais tarde.",
          });
        }
      } else {
        //Apenas logar se não houver sendgrid no env
        // 🔒 FASE 3: Log sanitizado - não expõe o token completo
        console.log(
          `Recuperação de senha solicitada para ${user.email}. Token gerado: ${tokenRecord.token.substring(0, 8)}...`,
        );
      }

      return res.json({
        success: true,
        message:
          "Se as informações estiverem corretas, você receberá um e-mail com as instruções para redefinir sua senha.",
      });
    } catch (error) {
      console.error("Erro no recuperar senha:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// Validação do token na view
app.get(
  "/api/auth/validar-token/:token",
  passwordTokenValidationLimiter,
  async (req, res) => {
    try {
      const { token } = req.params;
      if (!token) {
        return res.status(400).json({ error: "Token não fornecido" });
      }

      const tokenData = await db.validarTokenRecuperacao(token);
      if (!tokenData) {
        return res.status(400).json({ error: "Token inválido ou expirado" });
      }

      res.json({ success: true, username: tokenData.username });
    } catch (error) {
      console.error("Erro ao validar token:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// Execução do Reset
app.post(
  "/api/auth/resetar-senha",
  passwordResetLimiter,
  validatePasswordReset,
  async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res
          .status(400)
          .json({ error: "Token e nova senha são obrigatórios" });
      }

      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "A senha deve ter no mínimo 6 caracteres" });
      }

      // Validar token novamente
      const tokenData = await db.validarTokenRecuperacao(token);
      if (!tokenData) {
        return res.status(400).json({ error: "Token inválido ou expirado" });
      }

      // Hash da nova senha
      const hashedPassword = bcrypt.hashSync(newPassword, 10);

      // Resetar no banco
      const updatedUser = await db.resetarSenhaComToken(token, hashedPassword);

      // Logar atividade
      await logActivity(
        updatedUser.id,
        updatedUser.username,
        "reset_password_token",
        "auth",
        "user",
        updatedUser.id,
      );

      res.json({ success: true, message: "Senha redefinida com sucesso!" });
    } catch (error) {
      console.error("Erro no resetar senha:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// Endpoint para buscar dados do próprio perfil
app.get("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: "Usuário não encontrado" });
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
        updatedAt: safeUser.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});

// Endpoint para upload de foto de perfil
app.post(
  "/api/user/upload-photo",
  authenticateToken,
  uploadLimiter,
  uploadAvatar.single("photo"),
  (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "Nenhum arquivo enviado" });
      }

      // Retornar caminho relativo da foto
      const photoUrl = `/api/avatars/${req.file.filename}`;

      res.json({
        success: true,
        data: {
          photoUrl,
        },
      });
    } catch (error) {
      // Se houver erro, tentar deletar arquivo se foi criado
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.log("Erro ao deletar arquivo após erro:", e.message);
        }
      }
      res.status(500).json({
        success: false,
        error: error.message || "Erro ao fazer upload da foto",
      });
    }
  },
);

// Endpoint para atualizar perfil do próprio usuário
app.put(
  "/api/user/profile",
  authenticateToken,
  validateProfileUpdate,
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        photoUrl,
        password,
        cpf,
        birthDate,
        gender,
        position,
        address,
      } = req.body;

      // Buscar usuário atual
      const currentUser = await db.getUserById(req.user.id);
      if (!currentUser) {
        return res
          .status(404)
          .json({ success: false, error: "Usuário não encontrado" });
      }

      // Validar senha atual se fornecida (obrigatória para segurança)
      if (!password) {
        return res.status(400).json({
          success: false,
          error: "Senha atual é obrigatória para atualizar o perfil",
        });
      }

      const isValidPassword = bcrypt.compareSync(
        password,
        currentUser.password,
      );
      if (!isValidPassword) {
        return res
          .status(401)
          .json({ success: false, error: "Senha atual incorreta" });
      }

      if (!firstName || firstName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Nome é obrigatório e deve ter pelo menos 2 caracteres",
        });
      }

      if (!lastName || lastName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Sobrenome é obrigatório e deve ter pelo menos 2 caracteres",
        });
      }

      if (email !== undefined && email !== null && email !== "") {
        if (!email || !email.trim()) {
          return res
            .status(400)
            .json({ success: false, error: "Email é obrigatório" });
        }
        if (!validateEmailFormat(email)) {
          return res
            .status(400)
            .json({ success: false, error: "Formato de email inválido" });
        }
      } else {
        return res
          .status(400)
          .json({ success: false, error: "Email é obrigatório" });
      }

      if (phone !== undefined && phone !== null && phone !== "") {
        if (!phone) {
          return res
            .status(400)
            .json({ success: false, error: "Telefone é obrigatório" });
        }
        const phoneDigits = phone.replace(/\D/g, "");
        if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
          return res.status(400).json({
            success: false,
            error: "Telefone deve ter 10 ou 11 dígitos",
          });
        }
      } else {
        return res
          .status(400)
          .json({ success: false, error: "Telefone é obrigatório" });
      }

      if (cpf !== undefined && cpf !== null && cpf !== "") {
        if (!cpf) {
          return res
            .status(400)
            .json({ success: false, error: "CPF é obrigatório" });
        }
        const cpfDigits = cpf.replace(/\D/g, "");
        if (cpfDigits.length !== 11) {
          return res
            .status(400)
            .json({ success: false, error: "CPF deve ter 11 dígitos" });
        }
      } else {
        return res
          .status(400)
          .json({ success: false, error: "CPF é obrigatório" });
      }

      if (!birthDate) {
        return res
          .status(400)
          .json({ success: false, error: "Data de nascimento é obrigatória" });
      }

      if (!gender) {
        return res
          .status(400)
          .json({ success: false, error: "Gênero é obrigatório" });
      }

      if (!position || !position.trim()) {
        return res
          .status(400)
          .json({ success: false, error: "Cargo é obrigatório" });
      }

      // Preparar dados para atualização - todos os campos são obrigatórios
      const updateData = {};

      if (
        firstName === undefined ||
        !firstName ||
        firstName.trim().length < 2
      ) {
        return res.status(400).json({
          success: false,
          error: "Nome é obrigatório e deve ter pelo menos 2 caracteres",
        });
      }
      updateData.firstName = firstName.trim();

      if (lastName === undefined || !lastName || lastName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Sobrenome é obrigatório e deve ter pelo menos 2 caracteres",
        });
      }
      updateData.lastName = lastName.trim();

      if (email === undefined || !email || !email.trim()) {
        return res
          .status(400)
          .json({ success: false, error: "Email é obrigatório" });
      }
      if (!validateEmailFormat(email)) {
        return res
          .status(400)
          .json({ success: false, error: "Formato de email inválido" });
      }
      updateData.email = email.trim();

      if (phone === undefined || !phone) {
        return res
          .status(400)
          .json({ success: false, error: "Telefone é obrigatório" });
      }
      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
        return res.status(400).json({
          success: false,
          error: "Telefone deve ter 10 ou 11 dígitos",
        });
      }
      updateData.phone = phoneDigits;

      if (cpf === undefined || !cpf) {
        return res
          .status(400)
          .json({ success: false, error: "CPF é obrigatório" });
      }
      const cpfDigits = cpf.replace(/\D/g, "");
      if (cpfDigits.length !== 11) {
        return res
          .status(400)
          .json({ success: false, error: "CPF deve ter 11 dígitos" });
      }
      updateData.cpf = cpfDigits;

      if (!birthDate) {
        return res
          .status(400)
          .json({ success: false, error: "Data de nascimento é obrigatória" });
      }
      updateData.birthDate = birthDate;

      if (!gender) {
        return res
          .status(400)
          .json({ success: false, error: "Gênero é obrigatório" });
      }
      updateData.gender = gender;

      if (!position || !position.trim()) {
        return res
          .status(400)
          .json({ success: false, error: "Cargo é obrigatório" });
      }
      updateData.position = position.trim();

      if (!address || !address.cep) {
        return res
          .status(400)
          .json({ success: false, error: "CEP é obrigatório" });
      }
      const cepDigits = address.cep.replace(/\D/g, "");
      if (cepDigits.length !== 8) {
        return res
          .status(400)
          .json({ success: false, error: "CEP deve ter 8 dígitos" });
      }
      if (!address.street || !address.street.trim()) {
        return res
          .status(400)
          .json({ success: false, error: "Rua/Logradouro é obrigatório" });
      }
      if (!address.number || !address.number.trim()) {
        return res
          .status(400)
          .json({ success: false, error: "Número do endereço é obrigatório" });
      }
      if (!address.neighborhood || !address.neighborhood.trim()) {
        return res
          .status(400)
          .json({ success: false, error: "Bairro é obrigatório" });
      }
      if (!address.city || !address.city.trim()) {
        return res
          .status(400)
          .json({ success: false, error: "Cidade é obrigatória" });
      }
      if (
        !address.state ||
        !address.state.trim() ||
        address.state.length !== 2
      ) {
        return res.status(400).json({
          success: false,
          error: "Estado (UF) é obrigatório e deve ter 2 caracteres",
        });
      }
      updateData.address = {
        cep: cepDigits,
        street: address.street.trim(),
        number: address.number.trim(),
        complement: address.complement ? address.complement.trim() : "",
        neighborhood: address.neighborhood.trim(),
        city: address.city.trim(),
        state: address.state.trim().toUpperCase(),
      };

      // Se foto está sendo atualizada, deletar foto antiga
      if (photoUrl !== undefined) {
        if (currentUser.photoUrl && currentUser.photoUrl !== photoUrl) {
          deleteAvatarFile(currentUser.photoUrl);
        }
        updateData.photoUrl = photoUrl || null;
      }

      // Atualizar usuário
      const updatedUser = await db.updateUser(req.user.id, updateData);

      // Gerar novo token
      const token = jwt.sign(
        {
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.role,
        },
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      const { password: _, ...safeUser } = updatedUser;

      await logActivity(
        req.user.id,
        req.user.username,
        "edit",
        "admin",
        "user",
        req.user.id,
        {
          fields: Object.keys(updateData),
        },
      );

      res.json({
        success: true,
        data: safeUser,
        token,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message || "Erro interno do servidor",
      });
    }
  },
);

// Endpoint para alterar senha do próprio usuário
app.put("/api/user/password", authenticateToken, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({
        success: false,
        error: "Senha atual e nova senha são obrigatórias",
      });
    }

    if (novaSenha.length < 6) {
      return res.status(400).json({
        success: false,
        error: "A nova senha deve ter no mínimo 6 caracteres",
      });
    }

    // Buscar usuário atual
    const user = await db.getUserById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: "Usuário não encontrado" });
    }

    // Validar senha atual
    const isValidPassword = bcrypt.compareSync(senhaAtual, user.password);
    if (!isValidPassword) {
      return res
        .status(401)
        .json({ success: false, error: "Senha atual incorreta" });
    }

    // Verificar se nova senha é diferente da atual
    const isSamePassword = bcrypt.compareSync(novaSenha, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: "A nova senha deve ser diferente da senha atual",
      });
    }

    // Hash da nova senha
    const hashedPassword = bcrypt.hashSync(novaSenha, 10);

    // Atualizar senha
    await db.updateUser(req.user.id, { password: hashedPassword });

    // Logar ação
    await logActivity(
      req.user.id,
      user.username,
      "update_password",
      "user",
      "user",
      req.user.id,
    );

    res.json({
      success: true,
      message: "Senha alterada com sucesso",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Erro interno do servidor",
    });
  }
});

// Rota para importar arquivos
app.post(
  "/api/import",
  authenticateToken,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo foi enviado!" });
      }

      const { type } = req.body; // 'transactions', 'products' ou 'clients'

      if (!type || !["transactions", "products", "clients"].includes(type)) {
        return res.status(400).json({
          error: 'Tipo inválido! Use "transactions", "products" ou "clients"',
        });
      }

      console.log(`Processando arquivo: ${req.file.originalname} (${type})`);

      // Ler o arquivo Excel
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0]; // Pegar a primeira aba
      const worksheet = workbook.Sheets[sheetName];

      let processedData = [];
      let message = "";

      if (type === "transactions") {
        const parsed = processTransactions(worksheet);
        const saved = [];
        for (const t of parsed) {
          try {
            const savedT = await db.saveTransaction(t);
            await logActivity(
              req.user.id,
              req.user.username,
              "create",
              "transactions",
              "transaction",
              savedT.id,
              { before: null, after: savedT },
            );
            saved.push(savedT);
          } catch (error) {
            console.error("Erro ao salvar transação importada:", error);
          }
        }
        processedData = saved;
        message = `${saved.length} transações importadas com sucesso!`;
      } else if (type === "products") {
        const parsed = processProducts(worksheet);
        const saved = [];
        for (const p of parsed) {
          try {
            const savedP = await db.saveProduct(p);
            await logActivity(
              req.user.id,
              req.user.username,
              "create",
              "products",
              "product",
              savedP.id,
              { before: null, after: savedP },
            );
            saved.push(savedP);
          } catch (error) {
            console.error("Erro ao salvar produto importado:", error);
          }
        }
        processedData = saved;
        message = `${saved.length} produtos importados com sucesso!`;
      } else if (type === "clients") {
        processedData = processClients(worksheet);
        message = `${processedData.length} clientes importados com sucesso!`;

        for (const client of processedData) {
          try {
            await db.saveClient(client);
          } catch (error) {
            console.error("Erro ao salvar cliente:", error);
          }
        }
      }

      // Limpar o arquivo temporário
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        message: message,
        data: processedData,
        count: processedData.length,
        type: type,
      });
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);

      // Limpar arquivo em caso de erro
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        error: "Erro interno do servidor",
        message: error.message,
      });
    }
  },
);

// Rota para exportar dados
// 🔒 CORREÇÃO DE SEGURANÇA: Adicionar autenticação obrigatória
app.post("/api/export", authenticateToken, (req, res) => {
  const { type, data } = req.body;

  try {
    // Criar um novo workbook
    const workbook = XLSX.utils.book_new();
    let worksheet;

    if (type === "transactions") {
      // Mapear dados para formato Excel
      const excelData = data.map((t) => ({
        Data: t.date,
        Descrição: t.description,
        Valor: t.value,
        Tipo: t.type,
        Categoria: t.category,
      }));
      worksheet = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transações");
    } else if (type === "products") {
      // Mapear dados para formato Excel
      const excelData = data.map((p) => ({
        Nome: p.name,
        Categoria: p.category,
        Preço: p.price,
        Custo: p.cost,
        Estoque: p.stock,
        Vendido: p.sold,
      }));
      worksheet = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos");
    } else if (type === "clients") {
      // Mapear dados para formato Excel
      const excelData = data.map((c) => ({
        Nome: c.name,
        Email: c.email,
        Telefone: c.phone,
        Endereço: c.address,
        CPF: c.cpf || "",
        CNPJ: c.cnpj || "",
      }));
      worksheet = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
    }

    // Gerar buffer do arquivo
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Configurar headers para download
    const filename = `${type}_${new Date().toISOString().split("T")[0]}.xlsx`;
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });

    res.send(buffer);
  } catch (error) {
    console.error("Erro ao exportar dados:", error);
    res.status(500).json({
      error: "Erro ao exportar dados",
      message: error.message,
    });
  }
});

// APIs para Transações
// 🔒 CORREÇÃO DE SEGURANÇA: Adicionar autenticação obrigatória
app.get("/api/transactions", authenticateToken, async (req, res) => {
  try {
    const transactions = await db.getAllTransactions();
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post(
  "/api/transactions",
  authenticateToken,
  createLimiter,
  validateTransaction,
  async (req, res) => {
    try {
      const transaction = await db.saveTransaction(req.body);
      await logActivity(
        req.user.id,
        req.user.username,
        "create",
        "transactions",
        "transaction",
        transaction.id,
        { before: null, after: transaction },
      );
      res.json({ success: true, data: transaction });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.put("/api/transactions/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const before = await db.getTransactionById(id);
    const transaction = await db.updateTransaction(id, req.body);
    await logActivity(
      req.user.id,
      req.user.username,
      "edit",
      "transactions",
      "transaction",
      id,
      { before, after: transaction },
    );
    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/transactions/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const before = await db.getTransactionById(id);
    await db.deleteTransaction(id);
    await logActivity(
      req.user.id,
      req.user.username,
      "delete",
      "transactions",
      "transaction",
      id,
      { before, after: null },
    );
    res.json({ success: true, message: "Transação deletada com sucesso" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/transactions", authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res
        .status(400)
        .json({ success: false, error: "IDs devem ser um array" });
    }
    await db.deleteMultipleTransactions(ids);
    await logActivity(
      req.user.id,
      req.user.username,
      "delete",
      "transactions",
      "transaction",
      null,
      { count: ids.length },
    );
    res.json({
      success: true,
      message: `${ids.length} transações deletadas com sucesso`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// APIs para Produtos
// 🔒 CORREÇÃO DE SEGURANÇA: Adicionar autenticação obrigatória
app.get("/api/products", authenticateToken, async (req, res) => {
  try {
    const products = await db.getAllProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/products", authenticateToken, async (req, res) => {
  try {
    const product = await db.saveProduct(req.body);
    await logActivity(
      req.user.id,
      req.user.username,
      "create",
      "products",
      "product",
      product.id,
      { before: null, after: product },
    );
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/products/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const before = await db.getProductById(id);
    const product = await db.updateProduct(id, req.body);
    await logActivity(
      req.user.id,
      req.user.username,
      "edit",
      "products",
      "product",
      id,
      { before, after: product },
    );
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/products/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const before = await db.getProductById(id);
    await db.deleteProduct(id);
    await logActivity(
      req.user.id,
      req.user.username,
      "delete",
      "products",
      "product",
      id,
      { before, after: null },
    );
    res.json({ success: true, message: "Produto deletado com sucesso" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/products", authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res
        .status(400)
        .json({ success: false, error: "IDs devem ser um array" });
    }
    await db.deleteMultipleProducts(ids);
    await logActivity(
      req.user.id,
      req.user.username,
      "delete",
      "products",
      "product",
      null,
      { count: ids.length },
    );
    res.json({
      success: true,
      message: `${ids.length} produtos deletados com sucesso`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// APIs para Clientes
// 🔒 CORREÇÃO DE SEGURANÇA: Adicionar autenticação obrigatória
app.get("/api/clients", authenticateToken, async (req, res) => {
  try {
    const clients = await db.getAllClients();
    res.json({ success: true, data: clients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post(
  "/api/clients",
  authenticateToken,
  createLimiter,
  validateClientCreation,
  async (req, res) => {
    try {
      const client = await db.saveClient(req.body);
      await logActivity(
        req.user.id,
        req.user.username,
        "create",
        "clients",
        "client",
        client.id,
        { before: null, after: client },
      );
      res.json({ success: true, data: client });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.put("/api/clients/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const before = await db.getClientById(id);
    const client = await db.updateClient(id, req.body);
    await logActivity(
      req.user.id,
      req.user.username,
      "edit",
      "clients",
      "client",
      id,
      { before, after: client },
    );
    res.json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/clients/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const before = await db.getClientById(id);
    await db.deleteClient(id);
    await logActivity(
      req.user.id,
      req.user.username,
      "delete",
      "clients",
      "client",
      id,
      { before, after: null },
    );
    res.json({ success: true, message: "Cliente deletado com sucesso" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/clients", authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res
        .status(400)
        .json({ success: false, error: "IDs devem ser um array" });
    }
    await db.deleteMultipleClients(ids);
    await logActivity(
      req.user.id,
      req.user.username,
      "delete",
      "clients",
      "client",
      null,
      { count: ids.length },
    );
    res.json({
      success: true,
      message: `${ids.length} clientes deletados com sucesso`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== PROJEÇÃO (impgeo-style, adaptada ao Alya) =====
// Regras:
// - auth-all: todas as rotas exigem token
// - admin-only: config/sync/clear-all exigem admin
// - base do ano anterior + overrides: impgeo-style (projection-base.json)

app.get("/api/projection", authenticateToken, async (req, res) => {
  try {
    const snapshot = await db.getProjectionSnapshot();
    if (!snapshot) {
      const synced = await db.syncProjectionData();
      return res.json({ success: true, data: synced });
    }
    res.json({ success: true, data: snapshot });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Base (Resultado do Ano Anterior + overrides manuais)
app.get("/api/projection/base", authenticateToken, async (req, res) => {
  try {
    const base = await db.getProjectionBase();
    res.json({ success: true, data: base });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/projection/base", authenticateToken, async (req, res) => {
  try {
    const current = await db.getProjectionBase();
    const body = req.body || {};

    const merged = {
      ...current,
      ...body,
      growth: { ...(current.growth || {}), ...(body.growth || {}) },
      prevYear: {
        ...(current.prevYear || {}),
        ...(body.prevYear || {}),
        revenueStreams: {
          ...(current.prevYear?.revenueStreams || {}),
          ...(body.prevYear?.revenueStreams || {}),
        },
        mktComponents: {
          ...(current.prevYear?.mktComponents || {}),
          ...(body.prevYear?.mktComponents || {}),
        },
      },
      manualOverrides: {
        ...(current.manualOverrides || {}),
        ...(body.manualOverrides || {}),
        revenueManual: {
          ...(current.manualOverrides?.revenueManual || {}),
          ...(body.manualOverrides?.revenueManual || {}),
        },
      },
    };

    // merge profundo por stream (para não perder campos quando vierem parciais)
    if (
      body?.manualOverrides?.revenueManual &&
      typeof body.manualOverrides.revenueManual === "object"
    ) {
      for (const [streamId, v] of Object.entries(
        body.manualOverrides.revenueManual,
      )) {
        const prev = current.manualOverrides?.revenueManual?.[streamId] || {};
        merged.manualOverrides.revenueManual[streamId] = {
          ...prev,
          ...(v || {}),
        };
      }
    }

    const updatedBase = await db.updateProjectionBase(merged);
    const synced = await db.syncProjectionData();
    await logActivity(
      req.user.id,
      req.user.username,
      "edit",
      "projecao",
      "projection_base",
      null,
    );
    res.json({ success: true, data: updatedBase, projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post(
  "/api/projection/sync",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const synced = await db.syncProjectionData();
      await logActivity(
        req.user.id,
        req.user.username,
        "sync",
        "projecao",
        "projection",
        null,
      );
      res.json({ success: true, data: synced });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Importar base da projeção a partir das transações reais (ano anterior)
app.post(
  "/api/projection/sync-from-transactions",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const year = req.body?.year || new Date().getFullYear() - 1;
      const synced = await db.syncProjectionBaseFromTransactions(year);
      await logActivity(
        req.user.id,
        req.user.username,
        "sync",
        "projecao",
        "projection_from_transactions",
        { year },
      );
      res.json({
        success: true,
        data: synced,
        message: `Base importada das transações de ${year}`,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.get("/api/projection/config", authenticateToken, async (req, res) => {
  try {
    const cfg = await db.getProjectionConfig();
    res.json({ success: true, data: cfg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put(
  "/api/projection/config",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const updated = await db.updateProjectionConfig(req.body || {});
      // Persistir chaves novas no projection-base (streams/componentes recém-criados)
      try {
        const base = await db.getProjectionBase();
        await db.updateProjectionBase(base);
      } catch (e) {
        // não falhar a rota por isso
      }
      const synced = await db.syncProjectionData();
      await logActivity(
        req.user.id,
        req.user.username,
        "edit",
        "projecao",
        "projection_config",
        null,
      );
      res.json({ success: true, data: updated, projection: synced });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Growth (percentuais de cenários)
app.put("/api/projection/growth", authenticateToken, async (req, res) => {
  try {
    const { minimo, medio, maximo } = req.body || {};
    const current = await db.getProjectionBase();
    const updated = await db.updateProjectionBase({
      ...current,
      growth: {
        minimo: Number(minimo) || 0,
        medio: Number(medio) || 0,
        maximo: Number(maximo) || 0,
      },
    });
    const synced = await db.syncProjectionData();
    await logActivity(
      req.user.id,
      req.user.username,
      "edit",
      "projecao",
      "growth",
      null,
    );
    res.json({ success: true, data: updated.growth, projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Revenue (por stream)
app.get("/api/projection/revenue", authenticateToken, async (req, res) => {
  try {
    const data = await db.getRevenueData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/projection/revenue", authenticateToken, async (req, res) => {
  try {
    const updated = await db.updateRevenueData(req.body || {});
    const synced = await db.syncProjectionData();
    await logActivity(
      req.user.id,
      req.user.username,
      "edit",
      "projecao",
      "revenue",
      null,
    );
    res.json({ success: true, data: updated, projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/projection/revenue", authenticateToken, async (req, res) => {
  try {
    const cfg = await db.getProjectionConfig();
    const months12 = new Array(12).fill(0);
    const base = await db.getProjectionBase();
    const next = { ...base };
    for (const s of cfg.revenueStreams || []) {
      if (!s?.id) continue;
      next.prevYear.revenueStreams[s.id] = [...months12];
      if (next.manualOverrides?.revenueManual?.[s.id]) {
        next.manualOverrides.revenueManual[s.id] = {
          previsto: new Array(12).fill(null),
          medio: new Array(12).fill(null),
          maximo: new Array(12).fill(null),
        };
      }
    }
    const cleared = await db.updateProjectionBase(next);
    const synced = await db.syncProjectionData();
    await logActivity(
      req.user.id,
      req.user.username,
      "delete",
      "projecao",
      "revenue",
      null,
    );
    res.json({ success: true, data: cleared, projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// MKT components (por componente)
app.get(
  "/api/projection/mkt-components",
  authenticateToken,
  async (req, res) => {
    try {
      const data = await db.getMktComponentsData();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.put(
  "/api/projection/mkt-components",
  authenticateToken,
  async (req, res) => {
    try {
      const updated = await db.updateMktComponentsData(req.body || {});
      const synced = await db.syncProjectionData();
      await logActivity(
        req.user.id,
        req.user.username,
        "edit",
        "projecao",
        "mkt_components",
        null,
      );
      res.json({ success: true, data: updated, projection: synced });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.delete(
  "/api/projection/mkt-components",
  authenticateToken,
  async (req, res) => {
    try {
      const cfg = await db.getProjectionConfig();
      const months12 = new Array(12).fill(0);
      const base = await db.getProjectionBase();
      const next = { ...base };
      for (const c of cfg.mktComponents || []) {
        if (!c?.id) continue;
        next.prevYear.mktComponents[c.id] = [...months12];
      }
      // também limpar overrides do MKT do ano corrente
      next.manualOverrides.mktPrevistoManual = new Array(12).fill(null);
      next.manualOverrides.mktMedioManual = new Array(12).fill(null);
      next.manualOverrides.mktMaximoManual = new Array(12).fill(null);
      const cleared = await db.updateProjectionBase(next);
      const synced = await db.syncProjectionData();
      await logActivity(
        req.user.id,
        req.user.username,
        "delete",
        "projecao",
        "mkt_components",
        null,
      );
      res.json({ success: true, data: cleared, projection: synced });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Fixed expenses
app.get(
  "/api/projection/fixed-expenses",
  authenticateToken,
  async (req, res) => {
    try {
      const data = await db.getFixedExpensesData();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.put(
  "/api/projection/fixed-expenses",
  authenticateToken,
  async (req, res) => {
    try {
      const body = req.body || {};
      const months = Array.isArray(body?.previsto) ? body.previsto : [];
      const base = await db.getProjectionBase();
      const updated = await db.updateProjectionBase({
        ...base,
        prevYear: { ...(base.prevYear || {}), fixedExpenses: months },
      });
      const synced = await db.syncProjectionData();
      await logActivity(
        req.user.id,
        req.user.username,
        "edit",
        "projecao",
        "fixed_expenses",
        null,
      );
      const fixedData = await db.getFixedExpensesData();
      res.json({ success: true, data: fixedData, projection: synced });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.delete(
  "/api/projection/fixed-expenses",
  authenticateToken,
  async (req, res) => {
    try {
      const months12 = new Array(12).fill(0);
      const base = await db.getProjectionBase();
      const cleared = await db.updateProjectionBase({
        ...base,
        prevYear: { ...(base.prevYear || {}), fixedExpenses: [...months12] },
        manualOverrides: {
          ...(base.manualOverrides || {}),
          fixedPrevistoManual: new Array(12).fill(null),
          fixedMediaManual: new Array(12).fill(null),
          fixedMaximoManual: new Array(12).fill(null),
        },
      });
      const synced = await db.syncProjectionData();
      await logActivity(
        req.user.id,
        req.user.username,
        "delete",
        "projecao",
        "fixed_expenses",
        null,
      );
      res.json({ success: true, data: cleared, projection: synced });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Variable expenses
app.get(
  "/api/projection/variable-expenses",
  authenticateToken,
  async (req, res) => {
    try {
      const data = await db.getVariableExpensesData();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.put(
  "/api/projection/variable-expenses",
  authenticateToken,
  async (req, res) => {
    try {
      const body = req.body || {};
      const months = Array.isArray(body?.previsto) ? body.previsto : [];
      const base = await db.getProjectionBase();
      const updated = await db.updateProjectionBase({
        ...base,
        prevYear: { ...(base.prevYear || {}), variableExpenses: months },
      });
      const synced = await db.syncProjectionData();
      await logActivity(
        req.user.id,
        req.user.username,
        "edit",
        "projecao",
        "variable_expenses",
        null,
      );
      const varData = await db.getVariableExpensesData();
      res.json({ success: true, data: varData, projection: synced });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.delete(
  "/api/projection/variable-expenses",
  authenticateToken,
  async (req, res) => {
    try {
      const months12 = new Array(12).fill(0);
      const base = await db.getProjectionBase();
      const cleared = await db.updateProjectionBase({
        ...base,
        prevYear: { ...(base.prevYear || {}), variableExpenses: [...months12] },
        manualOverrides: {
          ...(base.manualOverrides || {}),
          variablePrevistoManual: new Array(12).fill(null),
          variableMedioManual: new Array(12).fill(null),
          variableMaximoManual: new Array(12).fill(null),
        },
      });
      const synced = await db.syncProjectionData();
      await logActivity(
        req.user.id,
        req.user.username,
        "delete",
        "projecao",
        "variable_expenses",
        null,
      );
      res.json({ success: true, data: cleared, projection: synced });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Investments
app.get("/api/projection/investments", authenticateToken, async (req, res) => {
  try {
    const data = await db.getInvestmentsData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/projection/investments", authenticateToken, async (req, res) => {
  try {
    const body = req.body || {};
    const months = Array.isArray(body?.previsto) ? body.previsto : [];
    const base = await db.getProjectionBase();
    const updated = await db.updateProjectionBase({
      ...base,
      prevYear: { ...(base.prevYear || {}), investments: months },
    });
    const synced = await db.syncProjectionData();
    await logActivity(
      req.user.id,
      req.user.username,
      "edit",
      "projecao",
      "investments",
      null,
    );
    const invData = await db.getInvestmentsData();
    res.json({ success: true, data: invData, projection: synced });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete(
  "/api/projection/investments",
  authenticateToken,
  async (req, res) => {
    try {
      const months12 = new Array(12).fill(0);
      const base = await db.getProjectionBase();
      const cleared = await db.updateProjectionBase({
        ...base,
        prevYear: { ...(base.prevYear || {}), investments: [...months12] },
        manualOverrides: {
          ...(base.manualOverrides || {}),
          investimentosPrevistoManual: new Array(12).fill(null),
          investimentosMedioManual: new Array(12).fill(null),
          investimentosMaximoManual: new Array(12).fill(null),
        },
      });
      const synced = await db.syncProjectionData();
      await logActivity(
        req.user.id,
        req.user.username,
        "delete",
        "projecao",
        "investments",
        null,
      );
      res.json({ success: true, data: cleared, projection: synced });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Derived read-only endpoints (budget/resultado)
app.get("/api/projection/budget", authenticateToken, async (req, res) => {
  try {
    const data = await db.getBudgetData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/projection/resultado", authenticateToken, async (req, res) => {
  try {
    const data = await db.getResultadoData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear all projection data (admin)
app.delete(
  "/api/clear-all-projection-data",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const months12 = new Array(12).fill(0);
      const cfg = await db.getProjectionConfig();
      const base = await db.getProjectionBase();
      const next = { ...base };
      next.growth = { minimo: 0, medio: 0, maximo: 0 };
      next.prevYear.fixedExpenses = [...months12];
      next.prevYear.variableExpenses = [...months12];
      next.prevYear.investments = [...months12];
      for (const s of cfg.revenueStreams || []) {
        if (!s?.id) continue;
        next.prevYear.revenueStreams[s.id] = [...months12];
        next.manualOverrides.revenueManual[s.id] = {
          previsto: new Array(12).fill(null),
          medio: new Array(12).fill(null),
          maximo: new Array(12).fill(null),
        };
      }
      for (const c of cfg.mktComponents || []) {
        if (!c?.id) continue;
        next.prevYear.mktComponents[c.id] = [...months12];
      }
      next.manualOverrides.fixedPrevistoManual = new Array(12).fill(null);
      next.manualOverrides.fixedMediaManual = new Array(12).fill(null);
      next.manualOverrides.fixedMaximoManual = new Array(12).fill(null);
      next.manualOverrides.variablePrevistoManual = new Array(12).fill(null);
      next.manualOverrides.variableMedioManual = new Array(12).fill(null);
      next.manualOverrides.variableMaximoManual = new Array(12).fill(null);
      next.manualOverrides.investimentosPrevistoManual = new Array(12).fill(
        null,
      );
      next.manualOverrides.investimentosMedioManual = new Array(12).fill(null);
      next.manualOverrides.investimentosMaximoManual = new Array(12).fill(null);
      next.manualOverrides.mktPrevistoManual = new Array(12).fill(null);
      next.manualOverrides.mktMedioManual = new Array(12).fill(null);
      next.manualOverrides.mktMaximoManual = new Array(12).fill(null);

      await db.updateProjectionBase(next);
      const synced = await db.syncProjectionData();

      await logActivity(
        req.user.id,
        req.user.username,
        "delete",
        "projecao",
        "clear_all",
        null,
      );
      res.json({
        success: true,
        message: "Dados de Projeção limpos com sucesso",
        data: synced,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// ===== ROTAS ADMINISTRATIVAS =====

// Rotas de Usuários
app.get(
  "/api/admin/users",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const users = await db.getAllUsers();
      // Remover senhas antes de enviar
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json({ success: true, data: safeUsers });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.get(
  "/api/admin/users/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = await db.getUserById(id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "Usuário não encontrado" });
      }
      const { password: _, ...safeUser } = user;
      res.json({ success: true, data: safeUser });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.post(
  "/api/admin/users",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
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
        isActive,
      } = req.body;

      if (!username) {
        return res
          .status(400)
          .json({ success: false, error: "Username é obrigatório" });
      }

      if (!firstName || firstName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Nome é obrigatório e deve ter pelo menos 2 caracteres",
        });
      }

      if (!lastName || lastName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Sobrenome é obrigatório e deve ter pelo menos 2 caracteres",
        });
      }

      if (!email || !email.trim()) {
        return res
          .status(400)
          .json({ success: false, error: "Email é obrigatório" });
      }

      if (!validateEmailFormat(email)) {
        return res
          .status(400)
          .json({ success: false, error: "Formato de email inválido" });
      }

      if (!phone) {
        return res
          .status(400)
          .json({ success: false, error: "Telefone é obrigatório" });
      }

      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
        return res.status(400).json({
          success: false,
          error: "Telefone deve ter 10 ou 11 dígitos",
        });
      }

      if (!cpf) {
        return res
          .status(400)
          .json({ success: false, error: "CPF é obrigatório" });
      }

      const cpfDigits = cpf.replace(/\D/g, "");
      if (cpfDigits.length !== 11) {
        return res
          .status(400)
          .json({ success: false, error: "CPF deve ter 11 dígitos" });
      }

      if (!birthDate) {
        return res
          .status(400)
          .json({ success: false, error: "Data de nascimento é obrigatória" });
      }

      if (!gender) {
        return res
          .status(400)
          .json({ success: false, error: "Gênero é obrigatório" });
      }

      if (!position || !position.trim()) {
        return res
          .status(400)
          .json({ success: false, error: "Cargo é obrigatório" });
      }

      if (!address || !address.cep) {
        return res
          .status(400)
          .json({ success: false, error: "CEP é obrigatório" });
      }

      const cepDigits = address.cep.replace(/\D/g, "");
      if (cepDigits.length !== 8) {
        return res
          .status(400)
          .json({ success: false, error: "CEP deve ter 8 dígitos" });
      }

      if (!address.street || !address.street.trim()) {
        return res
          .status(400)
          .json({ success: false, error: "Rua/Logradouro é obrigatório" });
      }

      if (!address.number || !address.number.trim()) {
        return res
          .status(400)
          .json({ success: false, error: "Número do endereço é obrigatório" });
      }

      if (!address.neighborhood || !address.neighborhood.trim()) {
        return res
          .status(400)
          .json({ success: false, error: "Bairro é obrigatório" });
      }

      if (!address.city || !address.city.trim()) {
        return res
          .status(400)
          .json({ success: false, error: "Cidade é obrigatória" });
      }

      if (
        !address.state ||
        !address.state.trim() ||
        address.state.length !== 2
      ) {
        return res.status(400).json({
          success: false,
          error: "Estado (UF) é obrigatório e deve ter 2 caracteres",
        });
      }

      // Verificar se usuário já existe
      if (await db.getUserByUsername(username)) {
        return res
          .status(400)
          .json({ success: false, error: "Usuário já existe" });
      }

      // 🔒 CORREÇÃO DE SEGURANÇA: Gerar senha temporária forte para convite
      const tempPassword = generateRandomPassword();
      const tempPasswordHash = bcrypt.hashSync(tempPassword, 10);

      // Se módulos não foram fornecidos, usar módulos padrão da role
      const userRole = role || "user";
      const defaultModules = getDefaultModulesForRole(userRole);
      const userModules =
        modules && modules.length > 0 ? modules : defaultModules;

      const newUser = {
        username,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        phone: phone ? phone.replace(/\D/g, "") : undefined, // Remover máscara
        photoUrl: photoUrl || undefined,
        cpf: cpf ? cpf.replace(/\D/g, "") : undefined, // Remover máscara
        birthDate: birthDate || undefined,
        gender: gender || undefined,
        position: position || undefined,
        address: address || undefined,
        password: tempPasswordHash, // Senha temporária
        role: userRole,
        modules: userModules,
        isActive: isActive !== undefined ? isActive : true,
        lastLogin: null, // null indica que nunca fez login
      };

      const user = await db.saveUser(newUser);

      // Criar convite de usuário (expira em 7 dias)
      const invite = await db.createUserInvite(
        user.id,
        tempPasswordHash,
        7,
        req.user.id,
      );

      // Enviar email com credenciais (se SendGrid configurado)
      if (SENDGRID_API_KEY && user.email) {
        const inviteLink = `${process.env.FRONTEND_URL || "https://alya.sistemas.viverdepj.com.br"}/login?invite=${invite.inviteToken}`;

        const msg = {
          to: user.email,
          from: {
            email: SENDGRID_FROM_EMAIL,
            name: process.env.SENDGRID_FROM_NAME || "Alya Sistemas",
          },
          subject: "Alya - Bem-vindo(a) ao Sistema",
          text: `Olá ${user.firstName || user.username},\n\nVocê foi cadastrado no sistema Alya.\n\nSuas credenciais temporárias:\nUsuário: ${user.username}\nSenha Temporária: ${tempPassword}\n\nLink de acesso:\n${inviteLink}\n\nEste convite expira em 7 dias.\n\nApós o primeiro acesso, você receberá uma nova senha que deverá ser alterada.\n\nAtenciosamente,\nEquipe Alya`,
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <p style="text-align: center; margin-bottom: 30px;">
              <span style="font-size: 24px; font-weight: bold; color: #d97706;">Alya</span>
            </p>
            <h2 style="color: #1e293b; margin-bottom: 20px;">Bem-vindo(a) ao Sistema!</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.5;">Olá <strong>${user.firstName || user.username}</strong>,</p>
            <p style="color: #475569; font-size: 16px; line-height: 1.5;">Você foi cadastrado no sistema Alya.</p>
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 5px 0; color: #78350f;"><strong>Usuário:</strong> ${user.username}</p>
              <p style="margin: 5px 0; color: #78350f;"><strong>Senha Temporária:</strong> <code style="background-color: #fde68a; padding: 2px 6px; border-radius: 3px;">${tempPassword}</code></p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Acessar Sistema</a>
            </div>
            <p style="color: #64748b; font-size: 14px; text-align: center;">Este convite expira em 7 dias.</p>
            <p style="color: #64748b; font-size: 14px;">Após o primeiro acesso, você receberá uma nova senha que deverá ser alterada nas configurações do seu perfil.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">Se você não solicitou este cadastro, pode ignorar este e-mail.</p>
          </div>
        `,
        };

        try {
          await sgMail.send(msg);
          console.log(`Email de convite enviado para: ${user.email}`);
        } catch (sgError) {
          console.error("Erro ao enviar e-mail de convite:", sgError);
        }
      }

      await logActivity(
        req.user.id,
        req.user.username,
        "create",
        "admin",
        "user",
        user.id,
        { username: user.username, role: user.role },
      );

      const { password: _, ...safeUser } = user;
      res.json({
        success: true,
        data: safeUser,
        invite: {
          token: invite.inviteToken,
          expiresAt: invite.expiresAt,
          tempPassword: SENDGRID_API_KEY ? undefined : tempPassword, // Só retornar se não enviou email
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.put(
  "/api/admin/users/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = { ...req.body };

      // Admin não pode atribuir role superadmin
      if (req.user.role === "admin" && updates.role === "superadmin") {
        return res.status(403).json({
          success: false,
          error: "Você não tem permissão para atribuir a role de super administrador.",
        });
      }

      // Módulos exclusivos do superadmin — admin não pode conceder nem revogar
      const superadminOnlyModules = ["activeSessions", "anomalies", "securityAlerts"];
      if (req.user.role === "admin" && updates.modules) {
        const targetUser = await db.getUserById(id);
        const currentModules = targetUser?.modules || [];
        // Preservar o estado atual dos módulos restritos, ignorando qualquer mudança
        const restricted = currentModules.filter(m => superadminOnlyModules.includes(m));
        const nonRestricted = updates.modules.filter(m => !superadminOnlyModules.includes(m));
        updates.modules = [...nonRestricted, ...restricted];
      }

      // Se houver senha, hash ela
      if (updates.password) {
        if (updates.password.length < 6) {
          return res.status(400).json({
            success: false,
            error: "Senha deve ter no mínimo 6 caracteres",
          });
        }
        updates.password = bcrypt.hashSync(updates.password, 10);
      }

      // Não permitir mudar role para admin de outro usuário (apenas o próprio admin pode ser admin)
      // Isso pode ser ajustado conforme necessário

      const beforeUser = await db.getUserById(id);
      const updatedUser = await db.updateUser(id, updates);
      const { password: _bp, ...safeBefore } = beforeUser || {};
      const { password: _ap, ...safeAfter } = updatedUser;
      await logActivity(
        req.user.id,
        req.user.username,
        "edit",
        "admin",
        "user",
        id,
        { before: safeBefore, after: safeAfter },
      );

      const { password: _, ...safeUser } = updatedUser;
      res.json({ success: true, data: safeUser });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Impersonação: superadmin loga como outro usuário
app.post(
  "/api/admin/impersonate/:userId",
  authenticateToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Não pode impersonar a si mesmo
      if (userId === req.user.id) {
        return res.status(400).json({ success: false, error: "Você não pode impersonar a si mesmo." });
      }

      const targetUser = await db.getUserById(userId);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: "Usuário não encontrado." });
      }

      // Não pode impersonar outro superadmin
      if (targetUser.role === "superadmin") {
        return res.status(403).json({ success: false, error: "Não é possível impersonar outro super administrador." });
      }

      const impersonationToken = jwt.sign(
        { id: targetUser.id, username: targetUser.username, role: targetUser.role, impersonatedBy: req.user.id },
        JWT_SECRET,
        { expiresIn: "2h" }
      );

      // Criar sessão temporária para o usuário impersonado (visível na aba de sessões)
      try {
        await sessionManager.createSession(targetUser.username, null, req);
      } catch (sessionError) {
        // Não bloqueia a impersonação se falhar
      }

      await logActivity(
        req.user.id,
        req.user.username,
        "impersonate",
        "admin",
        "user",
        targetUser.id,
        { targetUsername: targetUser.username }
      );

      const { password: _, ...safeTarget } = targetUser;
      res.json({ success: true, token: impersonationToken, user: safeTarget });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

app.delete(
  "/api/admin/users/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Não permitir deletar a si mesmo
      if (id === req.user.id) {
        return res.status(400).json({
          success: false,
          error: "Não é possível deletar seu próprio usuário",
        });
      }

      const user = await db.getUserById(id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "Usuário não encontrado" });
      }

      // Deletar foto do usuário se existir
      if (user.photoUrl) {
        deleteAvatarFile(user.photoUrl);
      }

      const { password: _dp, ...safeDeletedUser } = user;
      await db.deleteUser(id);
      await logActivity(
        req.user.id,
        req.user.username,
        "delete",
        "admin",
        "user",
        id,
        { before: safeDeletedUser, after: null },
      );

      res.json({ success: true, message: "Usuário deletado com sucesso" });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Rota pública para listar módulos (todos os usuários precisam ver módulos disponíveis)
app.get("/api/modules", authenticateToken, async (req, res) => {
  try {
    const modules = await db.getAllSystemModules();
    // Retornar apenas módulos ativos para usuários não-admin
    if (req.user.role !== "superadmin" && req.user.role !== "admin") {
      const activeModules = modules.filter((m) => m.isActive);
      return res.json({ success: true, data: activeModules });
    }
    res.json({ success: true, data: modules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rotas de Módulos (Admin)
app.get(
  "/api/admin/modules",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const modules = await db.getAllSystemModules();
      res.json({ success: true, data: modules });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.get(
  "/api/admin/modules/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const module = await db.getSystemModuleById(id);
      if (!module) {
        return res
          .status(404)
          .json({ success: false, error: "Módulo não encontrado" });
      }
      res.json({ success: true, data: module });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.post(
  "/api/admin/modules",
  authenticateToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { name, key, icon, description, route, isActive } = req.body;

      if (!name || !key) {
        return res
          .status(400)
          .json({ success: false, error: "Nome e key são obrigatórios" });
      }

      const moduleData = {
        name,
        key,
        icon: icon || "Package",
        description: description || "",
        route: route || null,
        isActive: isActive !== undefined ? isActive : true,
        isSystem: false,
      };

      const module = await db.saveSystemModule(moduleData);
      await logActivity(
        req.user.id,
        req.user.username,
        "create",
        "admin",
        "module",
        module.id,
        { name: module.name, key: module.key },
      );

      res.json({ success: true, data: module });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.put(
  "/api/admin/modules/:id",
  authenticateToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Não permitir mudar isSystem
      delete updates.isSystem;

      const module = await db.updateSystemModule(id, updates);
      await logActivity(
        req.user.id,
        req.user.username,
        "edit",
        "admin",
        "module",
        id,
        { changes: Object.keys(updates) },
      );

      res.json({ success: true, data: module });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.delete(
  "/api/admin/modules/:id",
  authenticateToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const module = await db.getSystemModuleById(id);
      if (!module) {
        return res
          .status(404)
          .json({ success: false, error: "Módulo não encontrado" });
      }

      await db.deleteSystemModule(id);
      await logActivity(
        req.user.id,
        req.user.username,
        "delete",
        "admin",
        "module",
        id,
        { name: module.name, key: module.key },
      );

      res.json({ success: true, message: "Módulo deletado com sucesso" });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Rotas de Activity Log
app.get(
  "/api/admin/activity-log",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId, module, action, startDate, endDate, limit, page } =
        req.query;

      const filters = {};
      if (userId) filters.userId = userId;
      if (module) filters.module = module;
      if (action) filters.action = action;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (limit) filters.limit = limit;
      if (page) filters.page = page;

      const logs = await db.getActivityLogs(filters);
      res.json({ success: true, data: logs, count: logs.length });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Rotas de Estatísticas
app.get(
  "/api/admin/statistics",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const stats = await db.getSystemStatistics();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.get(
  "/api/admin/statistics/users/:userId",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const stats = await db.getUserStatistics(userId);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.get(
  "/api/admin/statistics/modules/:moduleKey",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { moduleKey } = req.params;
      const stats = await db.getModuleStatistics(moduleKey);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

app.get(
  "/api/admin/statistics/usage-timeline",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { startDate, endDate, groupBy } = req.query;
      const timeline = await db.getUsageTimeline(
        startDate,
        endDate,
        groupBy || "day",
      );
      res.json({ success: true, data: timeline });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// Rota de teste
app.get("/api/test", (req, res) => {
  res.json({
    message: "API funcionando!",
    timestamp: new Date().toISOString(),
    endpoints: [
      "GET /api/transactions - Listar transações",
      "POST /api/transactions - Criar transação",
      "PUT /api/transactions/:id - Atualizar transação",
      "DELETE /api/transactions/:id - Deletar transação",
      "DELETE /api/transactions - Deletar múltiplas transações",
      "GET /api/products - Listar produtos",
      "POST /api/products - Criar produto",
      "PUT /api/products/:id - Atualizar produto",
      "DELETE /api/products/:id - Deletar produto",
      "DELETE /api/products - Deletar múltiplos produtos",
      "GET /api/clients - Listar clientes",
      "POST /api/clients - Criar cliente",
      "PUT /api/clients/:id - Atualizar cliente",
      "DELETE /api/clients/:id - Deletar cliente",
      "DELETE /api/clients - Deletar múltiplos clientes",
      "POST /api/import - Importar arquivos Excel",
      "POST /api/export - Exportar dados para Excel",
      "POST /api/auth/login - Fazer login",
      "POST /api/auth/verify - Verificar token",
      "GET /api/test - Testar API",
      "GET /api/bluetooth/devices - Listar dispositivos Bluetooth próximos",
    ],
  });
});

// 📡 Bluetooth: Escanear dispositivos BLE próximos
const { scanDevices: scanBluetoothDevices } = require("./utils/bluetooth");

app.get("/api/bluetooth/devices", authenticateToken, async (req, res) => {
  try {
    const duration = Math.min(
      Math.max(parseInt(req.query.duration) || 5000, 1000),
      15000
    );
    const devices = await scanBluetoothDevices(duration);
    res.json({
      success: true,
      devices,
      count: devices.length,
      duration,
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: error.message,
    });
  }
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error("[ERROR] Erro capturado:", error);
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "Arquivo muito grande! Máximo 5MB." });
    }
  }

  res.status(400).json({ error: error.message });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`📡 API disponível em http://localhost:${port}`);
  console.log(`🧪 Teste a API em http://localhost:${port}/api/test`);

  // 🔍 Iniciar monitoramento contínuo de anomalias
  const monitoringInterval =
    parseInt(process.env.ANOMALY_MONITORING_INTERVAL) || 15;
  anomalyDetection.startAnomalyMonitoring(monitoringInterval);
  console.log(
    `🔍 Monitoramento de anomalias ativado (intervalo: ${monitoringInterval}min)`,
  );
});
