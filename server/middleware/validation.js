/**
 * Middleware de Validação de Entrada - Fase 2 e 3
 * Valida e sanitiza dados de entrada usando express-validator
 */

const { body, param, query, validationResult } = require("express-validator");
const {
  validateCPF,
  validateCNPJ,
  validateDocument,
} = require("../utils/security-utils");
const securityAlerts = require("../utils/security-alerts");

/**
 * Detecta padrões suspeitos de SQL injection
 */
const detectSQLInjection = (value) => {
  if (typeof value !== "string") return false;

  const sqlPatterns = [
    /(\bOR\b|\bAND\b).*=.*=/i,
    /UNION.*SELECT/i,
    /DROP\s+TABLE/i,
    /INSERT\s+INTO/i,
    /DELETE\s+FROM/i,
    /UPDATE.*SET/i,
    /--;/,
    /\/\*.*\*\//,
    /'.*OR.*'.*=.*'/i,
    /".*OR.*".*=.*"/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(value));
};

/**
 * Detecta padrões suspeitos de XSS
 */
const detectXSS = (value) => {
  if (typeof value !== "string") return false;

  const xssPatterns = [
    /<script[^>]*>.*<\/script>/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    /onclick\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
  ];

  return xssPatterns.some((pattern) => pattern.test(value));
};

/**
 * Middleware para verificar resultados da validação
 */
const handleValidationErrors = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    console.warn("⚠️ Erro de validação:", errorMessages);

    // 🚨 ALERTA: Detectar tentativas de SQL injection ou XSS
    try {
      const allValues = Object.values(req.body).concat(
        Object.values(req.query),
      );

      for (const value of allValues) {
        if (detectSQLInjection(value)) {
          await securityAlerts.alertSQLInjection(
            req.ip || req.connection?.remoteAddress,
            req.path,
            String(value).substring(0, 100),
          );
          break;
        }

        if (detectXSS(value)) {
          await securityAlerts.alertXSS(
            req.ip || req.connection?.remoteAddress,
            req.path,
            String(value).substring(0, 100),
          );
          break;
        }
      }
    } catch (alertError) {
      console.error("Erro ao enviar alerta de segurança:", alertError);
    }

    return res.status(400).json({
      success: false,
      error: "Dados inválidos",
      details: errorMessages,
    });
  }

  next();
};

/**
 * Validações para registro de usuário
 */
const validateUserRegistration = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Username deve ter entre 3 e 50 caracteres")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username deve conter apenas letras, números, underscore ou hífen",
    )
    .escape(),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Senha deve ter no mínimo 8 caracteres")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Senha deve conter ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial",
    ),

  body("firstName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Nome deve ter entre 2 e 100 caracteres")
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage("Nome contém caracteres inválidos")
    .escape(),

  body("lastName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Sobrenome deve ter entre 2 e 100 caracteres")
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage("Sobrenome contém caracteres inválidos")
    .escape(),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Email inválido")
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage("Email muito longo"),

  body("phone")
    .optional()
    .trim()
    .matches(/^\d{10,11}$/)
    .withMessage("Telefone deve ter 10 ou 11 dígitos"),

  body("cpf")
    .optional()
    .trim()
    .matches(/^\d{11}$/)
    .withMessage("CPF deve ter 11 dígitos")
    .custom((value) => {
      if (value && !validateCPF(value)) {
        throw new Error("CPF inválido");
      }
      return true;
    }),

  body("role")
    .optional()
    .isIn(["admin", "user", "guest"])
    .withMessage("Role inválida"),

  handleValidationErrors,
];

/**
 * Validações para login
 */
const validateLogin = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username é obrigatório")
    .escape(),

  body("password").notEmpty().withMessage("Senha é obrigatória"),

  handleValidationErrors,
];

/**
 * Validações para atualização de perfil
 */
const validateProfileUpdate = [
  body("firstName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Nome deve ter entre 2 e 100 caracteres")
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage("Nome contém caracteres inválidos")
    .escape(),

  body("lastName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Sobrenome deve ter entre 2 e 100 caracteres")
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage("Sobrenome contém caracteres inválidos")
    .escape(),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Email inválido")
    .normalizeEmail(),

  body("phone")
    .optional()
    .trim()
    .matches(/^\d{10,11}$/)
    .withMessage("Telefone deve ter 10 ou 11 dígitos"),

  body("cpf")
    .optional()
    .trim()
    .matches(/^\d{11}$/)
    .withMessage("CPF deve ter 11 dígitos")
    .custom((value) => {
      if (value && !validateCPF(value)) {
        throw new Error("CPF inválido");
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * Validações para criação de cliente
 */
const validateClientCreation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("Nome do cliente deve ter entre 2 e 200 caracteres")
    .escape(),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Email inválido")
    .normalizeEmail(),

  body("phone")
    .optional()
    .trim()
    .matches(/^\d{10,11}$/)
    .withMessage("Telefone deve ter 10 ou 11 dígitos"),

  body("cpfCnpj")
    .optional()
    .trim()
    .matches(/^\d{11}$|^\d{14}$/)
    .withMessage("CPF/CNPJ deve ter 11 ou 14 dígitos")
    .custom((value) => {
      if (value) {
        const validation = validateDocument(value);
        if (!validation.valid) {
          throw new Error(
            `${validation.type === "cpf" ? "CPF" : "CNPJ"} inválido`,
          );
        }
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * Validações para transações
 */
const validateTransaction = [
  body("description")
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Descrição deve ter entre 1 e 500 caracteres")
    .escape(),

  body("value")
    .isFloat({ min: -999999999, max: 999999999 })
    .withMessage("Valor inválido"),

  body("date").isISO8601().withMessage("Data inválida"),

  body("type")
    .isIn(["income", "expense", "Receita", "Despesa"])
    .withMessage("Tipo deve ser Receita ou Despesa"),

  body("category")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Categoria muito longa")
    .escape(),

  handleValidationErrors,
];

/**
 * Validação de ID numérico (para parâmetros de rota)
 */
const validateNumericId = [
  param("id").isInt({ min: 1 }).withMessage("ID inválido"),

  handleValidationErrors,
];

/**
 * Validações para recuperação de senha
 */
const validatePasswordRecovery = [
  body("email").trim().isEmail().withMessage("Email inválido").normalizeEmail(),

  handleValidationErrors,
];

/**
 * Validações para reset de senha
 */
const validatePasswordReset = [
  body("token")
    .trim()
    .notEmpty()
    .withMessage("Token é obrigatório")
    .isLength({ min: 32, max: 256 })
    .withMessage("Token inválido"),

  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Nova senha deve ter no mínimo 8 caracteres")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Senha deve conter ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial",
    ),

  handleValidationErrors,
];

/**
 * Validações para paginação
 */
const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Página deve ser um número inteiro positivo"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limite deve ser entre 1 e 100"),

  handleValidationErrors,
];

/**
 * Sanitização genérica de string (remove HTML e scripts)
 */
const sanitizeString = (value) => {
  if (typeof value !== "string") return value;

  return value
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .substring(0, 10000); // Limitar tamanho máximo
};

/**
 * Middleware customizado para sanitização adicional
 */
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    for (const key in req.body) {
      if (typeof req.body[key] === "string") {
        req.body[key] = sanitizeString(req.body[key]);
      }
    }
  }
  next();
};

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateLogin,
  validateProfileUpdate,
  validateClientCreation,
  validateTransaction,
  validateNumericId,
  validatePasswordRecovery,
  validatePasswordReset,
  validatePagination,
  sanitizeBody,
  sanitizeString,
};
