-- SupplyMind Database Schema

CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id),
    company_id INT REFERENCES companies(id),
    direction VARCHAR(3) NOT NULL CHECK (direction IN ('IN', 'OUT')),
    source VARCHAR(10) NOT NULL CHECK (source IN ('OWNED', 'MARKET')),
    unit_price NUMERIC NOT NULL,
    volume INT NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    delivery_days INT NOT NULL,
    credibility_score NUMERIC DEFAULT 0.5 CHECK (credibility_score >= 0 AND credibility_score <= 1),
    deadline DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_jobs (
    id UUID PRIMARY KEY,
    goal TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETE', 'FAILED')),
    result JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
