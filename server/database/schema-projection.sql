-- Schema de projeção para PostgreSQL (módulo Projeção do Alya)
-- Execute após schema.sql: psql -U postgres -d alya -f database/schema-projection.sql
-- Convenção: array[i] no JSON = month_num = i + 1 no PostgreSQL

-- ===== 1.1 Configuração =====
CREATE TABLE IF NOT EXISTS projection_revenue_streams (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS projection_mkt_components (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS projection_growth (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    minimo DECIMAL(10, 2) DEFAULT 0,
    medio DECIMAL(10, 2) DEFAULT 0,
    maximo DECIMAL(10, 2) DEFAULT 0
);

INSERT INTO projection_growth (id, minimo, medio, maximo) VALUES (1, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- ===== 1.2 Base (ano anterior) =====
CREATE TABLE IF NOT EXISTS projection_base_revenue (
    stream_id VARCHAR(50) NOT NULL,
    month_num INTEGER NOT NULL CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2) DEFAULT 0,
    PRIMARY KEY (stream_id, month_num)
);

CREATE TABLE IF NOT EXISTS projection_base_mkt (
    component_id VARCHAR(50) NOT NULL,
    month_num INTEGER NOT NULL CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2) DEFAULT 0,
    PRIMARY KEY (component_id, month_num)
);

CREATE TABLE IF NOT EXISTS projection_base_fixed_expenses (
    month_num INTEGER PRIMARY KEY CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projection_base_variable_expenses (
    month_num INTEGER PRIMARY KEY CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projection_base_investments (
    month_num INTEGER PRIMARY KEY CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2) DEFAULT 0
);

-- ===== 1.3 Overrides manuais =====
CREATE TABLE IF NOT EXISTS projection_override_fixed (
    scenario VARCHAR(20) NOT NULL CHECK (scenario IN ('previsto', 'medio', 'maximo')),
    month_num INTEGER NOT NULL CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2),
    PRIMARY KEY (scenario, month_num)
);

CREATE TABLE IF NOT EXISTS projection_override_variable (
    scenario VARCHAR(20) NOT NULL CHECK (scenario IN ('previsto', 'medio', 'maximo')),
    month_num INTEGER NOT NULL CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2),
    PRIMARY KEY (scenario, month_num)
);

CREATE TABLE IF NOT EXISTS projection_override_investments (
    scenario VARCHAR(20) NOT NULL CHECK (scenario IN ('previsto', 'medio', 'maximo')),
    month_num INTEGER NOT NULL CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2),
    PRIMARY KEY (scenario, month_num)
);

CREATE TABLE IF NOT EXISTS projection_override_mkt (
    scenario VARCHAR(20) NOT NULL CHECK (scenario IN ('previsto', 'medio', 'maximo')),
    month_num INTEGER NOT NULL CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2),
    PRIMARY KEY (scenario, month_num)
);

CREATE TABLE IF NOT EXISTS projection_override_revenue (
    stream_id VARCHAR(50) NOT NULL,
    scenario VARCHAR(20) NOT NULL CHECK (scenario IN ('previsto', 'medio', 'maximo')),
    month_num INTEGER NOT NULL CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2),
    PRIMARY KEY (stream_id, scenario, month_num)
);

-- ===== 1.4 Dados derivados =====
CREATE TABLE IF NOT EXISTS projection_fixed_expenses (
    scenario VARCHAR(20) NOT NULL CHECK (scenario IN ('previsto', 'medio', 'maximo')),
    month_num INTEGER NOT NULL CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2) DEFAULT 0,
    PRIMARY KEY (scenario, month_num)
);

CREATE TABLE IF NOT EXISTS projection_variable_expenses (
    scenario VARCHAR(20) NOT NULL CHECK (scenario IN ('previsto', 'medio', 'maximo')),
    month_num INTEGER NOT NULL CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2) DEFAULT 0,
    PRIMARY KEY (scenario, month_num)
);

CREATE TABLE IF NOT EXISTS projection_investments (
    scenario VARCHAR(20) NOT NULL CHECK (scenario IN ('previsto', 'medio', 'maximo')),
    month_num INTEGER NOT NULL CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2) DEFAULT 0,
    PRIMARY KEY (scenario, month_num)
);

CREATE TABLE IF NOT EXISTS projection_budget (
    scenario VARCHAR(20) NOT NULL CHECK (scenario IN ('previsto', 'medio', 'maximo')),
    month_num INTEGER NOT NULL CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2) DEFAULT 0,
    PRIMARY KEY (scenario, month_num)
);

CREATE TABLE IF NOT EXISTS projection_resultado (
    scenario VARCHAR(20) NOT NULL CHECK (scenario IN ('previsto', 'medio', 'maximo')),
    month_num INTEGER NOT NULL CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2) DEFAULT 0,
    PRIMARY KEY (scenario, month_num)
);

CREATE TABLE IF NOT EXISTS projection_revenue_values (
    stream_id VARCHAR(50) NOT NULL,
    scenario VARCHAR(20) NOT NULL CHECK (scenario IN ('previsto', 'medio', 'maximo')),
    month_num INTEGER NOT NULL CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2) DEFAULT 0,
    PRIMARY KEY (stream_id, scenario, month_num)
);

CREATE TABLE IF NOT EXISTS projection_mkt_values (
    component_id VARCHAR(50) NOT NULL,
    scenario VARCHAR(20) NOT NULL CHECK (scenario IN ('previsto', 'medio', 'maximo')),
    month_num INTEGER NOT NULL CHECK (month_num >= 1 AND month_num <= 12),
    value DECIMAL(15, 2) DEFAULT 0,
    PRIMARY KEY (component_id, scenario, month_num)
);

-- ===== 1.5 Índices =====
CREATE INDEX IF NOT EXISTS idx_projection_base_revenue_stream ON projection_base_revenue(stream_id);
CREATE INDEX IF NOT EXISTS idx_projection_base_revenue_month ON projection_base_revenue(month_num);
CREATE INDEX IF NOT EXISTS idx_projection_base_mkt_component ON projection_base_mkt(component_id);
CREATE INDEX IF NOT EXISTS idx_projection_base_mkt_month ON projection_base_mkt(month_num);
CREATE INDEX IF NOT EXISTS idx_projection_override_revenue_stream ON projection_override_revenue(stream_id);
CREATE INDEX IF NOT EXISTS idx_projection_override_revenue_scenario ON projection_override_revenue(scenario);
CREATE INDEX IF NOT EXISTS idx_projection_fixed_expenses_scenario ON projection_fixed_expenses(scenario);
CREATE INDEX IF NOT EXISTS idx_projection_revenue_values_stream ON projection_revenue_values(stream_id);
CREATE INDEX IF NOT EXISTS idx_projection_mkt_values_component ON projection_mkt_values(component_id);
