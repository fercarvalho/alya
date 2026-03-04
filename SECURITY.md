# Security Policy

## 🔒 Supported Versions

We release security updates for the following versions:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 1.x     | ✅ Yes             | Current stable release |
| < 1.0   | ❌ No              | Legacy, no longer supported |

---

## 🐛 Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### ⚠️ DO NOT Create Public Issues

**Do not** disclose security vulnerabilities through public GitHub issues, discussions, or pull requests.

### ✅ Responsible Disclosure Process

1. **Email us:** [fernando@viverdepj.com.br](mailto:fernando@viverdepj.com.br)
2. **Subject:** `[SECURITY] Brief description of the issue`
3. **Include:**
   - Detailed description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact assessment
   - Affected versions
   - Suggested fix (if available)
   - Your contact information

### 🕒 What to Expect

- **Initial Response:** Within 48 hours (weekdays)
- **Status Update:** Within 5 business days
- **Fix Timeline:**
  - **Critical:** 24-72 hours
  - **High:** 7 days
  - **Medium:** 14 days
  - **Low:** 30 days

### 🎁 Recognition

Security researchers who responsibly disclose vulnerabilities will be acknowledged in:
- Release notes
- SECURITY.md (with permission)
- Hall of Fame (coming soon)

---

## 🛡️ Security Features

### Current Implementation (v1.x)

#### Authentication & Authorization
- ✅ JWT-based authentication with refresh tokens
- ✅ Access tokens: 15-minute expiration
- ✅ Refresh tokens: 7-day expiration with rotation
- ✅ Bcrypt password hashing (cost factor: 10)
- ✅ Rate limiting on authentication endpoints (100 req/15min)
- ✅ Account lockout after failed login attempts
- ✅ Secure password reset flow with time-limited tokens

#### Input Validation & Sanitization
- ✅ Express-validator for input validation
- ✅ Mongo-sanitize for NoSQL injection prevention
- ✅ XSS-clean middleware
- ✅ HPP (HTTP Parameter Pollution) protection
- ✅ Prepared statements for SQL queries (100% coverage)

#### Security Headers
- ✅ Helmet.js configured with:
  - Content Security Policy (CSP)
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Strict-Transport-Security (HSTS)
  - Referrer-Policy: no-referrer
- ✅ CORS properly configured

#### Logging & Monitoring
- ✅ Comprehensive audit logging system
- ✅ Automated log rotation (90-day retention)
- ✅ Sensitive data masking in logs (CPF, passwords)
- ✅ Failed login attempt tracking
- ✅ IP address and User-Agent logging

#### Dependency Management
- ✅ Regular npm audit scans
- ✅ Automated dependency updates via Dependabot
- ✅ No known critical vulnerabilities

#### Data Protection
- ✅ Sensitive environment variables (.env not committed)
- ✅ Secrets rotation policy (every 6 months)
- ✅ Password strength requirements enforced
- ✅ HTTPS enforced in production
- ✅ Secure cookie settings

---

## 📋 Security Audit History

### 2026-03-04 - Comprehensive Security Audit
**Auditor:** Claude (Anthropic AI)
**Score:** 8.5/10
**OWASP Top 10 Compliance:** 85%

**Issues Fixed:**
1. ✅ **CRITICAL:** JWT_SECRET was weak → Rotated to cryptographically strong secret
2. ✅ **CRITICAL:** jspdf vulnerabilities (8 CVEs) → Updated to v4.2.0
3. ✅ **HIGH:** Refresh tokens not implemented → Full implementation complete
4. ✅ **MEDIUM:** Console.log in production → Terser configured to remove
5. ✅ **MEDIUM:** CORS hardcoded → Moved to environment variables

**Remaining Issues:**
1. ⚠️ **HIGH:** xlsx library vulnerability → Documented as technical debt, mitigations in place
2. ⚠️ **LOW:** CSP uses unsafe-inline → Acceptable for internal app, nonce implementation planned

**Full Report:** [SECURITY-AUDIT-REPORT.md](SECURITY-AUDIT-REPORT.md)

---

### 2026-03-03 - Initial Security Review
**Auditor:** Internal Team
**Score:** 7.0/10

**Issues Fixed:**
1. ✅ Implemented audit logging system
2. ✅ Added rate limiting on sensitive endpoints
3. ✅ Configured Helmet security headers
4. ✅ Implemented input validation middleware

---

## 🔄 Security Update Schedule

### Routine Maintenance
- **Dependency Audits:** Weekly (automated via Dependabot)
- **Manual Security Review:** Monthly
- **Penetration Testing:** Quarterly (planned)
- **Credential Rotation:** Every 6 months

### Next Scheduled Actions
- **Next Credential Rotation:** 2026-09-03
- **Next Full Audit:** 2026-06-03
- **Next Dependency Update:** Automated (ongoing)

---

## 🚨 Known Vulnerabilities

### Active

#### 1. xlsx Library - Prototype Pollution & ReDoS
**Severity:** HIGH
**Discovered:** 2026-03-03
**Status:** Documented as Technical Debt
**CVEs:** Multiple (see npm audit)

**Mitigation:**
- File size limits enforced (5MB)
- Rate limiting on upload endpoints
- Filename sanitization
- User input validation
- Uploads isolated from application code

**Planned Fix:** Migration to `exceljs` library (Q2 2026)
**Tracking:** [TECH-DEBT.md](TECH-DEBT.md) #1

---

### Resolved

#### jspdf Multiple Vulnerabilities (Resolved 2026-03-03)
**Severity:** CRITICAL
**CVEs:** LFI, PDF Injection, XSS, DoS, XMP Injection
**Fixed:** Updated from v3.0.4 → v4.2.0
**Details:** [JSPDF-UPDATE-NOTES.md](JSPDF-UPDATE-NOTES.md)

#### Weak JWT Secret (Resolved 2026-03-03)
**Severity:** CRITICAL
**Issue:** JWT_SECRET was potentially weak
**Fixed:** Rotated to cryptographically strong 256-bit secret
**Details:** [SECURITY-CREDENTIALS-ROTATION.md](SECURITY-CREDENTIALS-ROTATION.md)

---

## 🎯 Scope

### In Scope
- ✅ Web application (frontend + backend API)
- ✅ Authentication & authorization mechanisms
- ✅ Data validation and sanitization
- ✅ Session management
- ✅ API endpoints
- ✅ File upload functionality
- ✅ Database interactions
- ✅ Third-party dependencies

### Out of Scope
- ❌ Infrastructure (hosting, network, firewall)
- ❌ Physical security
- ❌ Social engineering
- ❌ DDoS attacks (handled at infrastructure level)
- ❌ DNS vulnerabilities

---

## 🔐 Security Best Practices for Contributors

### For Developers

#### 1. Authentication
```javascript
// ✅ GOOD: Use refresh tokens
const { accessToken, refreshToken } = await auth.login(username, password);

// ❌ BAD: Long-lived tokens
const token = jwt.sign(payload, secret, { expiresIn: '30d' });
```

#### 2. Input Validation
```javascript
// ✅ GOOD: Validate and sanitize
const schema = {
  email: { isEmail: true, normalizeEmail: true },
  amount: { isFloat: { min: 0 } },
};
app.post('/api/endpoint', validate(schema), handler);

// ❌ BAD: Trust user input
const { email, amount } = req.body;
await db.query(`INSERT INTO table VALUES ('${email}', ${amount})`);
```

#### 3. SQL Queries
```javascript
// ✅ GOOD: Prepared statements
await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// ❌ BAD: String concatenation
await pool.query(`SELECT * FROM users WHERE id = '${userId}'`);
```

#### 4. Secrets Management
```javascript
// ✅ GOOD: Environment variables
const apiKey = process.env.API_KEY;

// ❌ BAD: Hardcoded secrets
const apiKey = 'sk_live_1234567890abcdef';
```

#### 5. Error Handling
```javascript
// ✅ GOOD: Generic error messages to client
res.status(500).json({ error: 'Internal server error' });
console.error('Database error:', error); // Log detailed error server-side

// ❌ BAD: Expose internal details
res.status(500).json({ error: error.stack });
```

---

### Security Checklist for Pull Requests

Before submitting a PR, verify:

- [ ] No hardcoded secrets or API keys
- [ ] All user inputs are validated and sanitized
- [ ] SQL queries use prepared statements
- [ ] Sensitive data is not logged
- [ ] New endpoints have authentication/authorization
- [ ] Rate limiting applied to sensitive endpoints
- [ ] Error messages don't expose internal details
- [ ] Dependencies are up to date (`npm audit`)
- [ ] No console.log in production code
- [ ] CORS properly configured for new endpoints
- [ ] Audit logging added for sensitive operations

---

## 📚 Security Resources

### Internal Documentation
- [SECURITY-AUDIT-REPORT.md](SECURITY-AUDIT-REPORT.md) - Comprehensive security audit
- [SECURITY-CREDENTIALS-ROTATION.md](SECURITY-CREDENTIALS-ROTATION.md) - Credential management
- [TECH-DEBT.md](TECH-DEBT.md) - Known technical debt and planned fixes
- [REFRESH-TOKENS-GUIDE.md](server/REFRESH-TOKENS-GUIDE.md) - Refresh token implementation
- [AUDIT-LOG-ROTATION-SETUP.md](server/AUDIT-LOG-ROTATION-SETUP.md) - Log management

### External Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## 🏆 Hall of Fame

Security researchers who have responsibly disclosed vulnerabilities:

| Date | Researcher | Vulnerability | Severity |
|------|------------|---------------|----------|
| *Coming soon* | - | - | - |

---

## 📞 Contact

For security-related questions or concerns:

- **Email:** [fernando@viverdepj.com.br](mailto:fernando@viverdepj.com.br)
- **Emergency Escalation:** [Contact form](https://viverdepj.com.br/contact)
- **GPG Key:** Available upon request

**Response Time:** Within 48 hours (weekdays)

---

## 📄 License

This security policy is part of the ALYA project and is provided for transparency and responsible disclosure.

---

**Last Updated:** 2026-03-04
**Next Review:** 2026-06-04
**Version:** 1.0
