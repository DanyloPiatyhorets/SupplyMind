-- SupplyMind Seed Data
-- SolGrid Technologies supply chain: 6 suppliers, 5 products
-- 3 owned contracts are intentionally overpriced for data correction demo

-- Companies (suppliers)
INSERT INTO companies (id, name, country) VALUES
    (1, 'GermSteel GmbH', 'Germany'),
    (2, 'FranceMetal SA', 'France'),
    (3, 'CopperLine AG', 'Austria'),
    (4, 'AndesLithium SpA', 'Chile'),
    (5, 'TaiwanSilicon Corp', 'Taiwan'),
    (6, 'PolyChem Ltd', 'United Kingdom');

-- Products (supply chain materials)
INSERT INTO products (id, name, unit) VALUES
    (1, 'Industrial Steel', 'metric ton'),
    (2, 'Aluminium Alloy', 'metric ton'),
    (3, 'Copper Cathode', 'metric ton'),
    (4, 'Lithium Carbonate', 'metric ton'),
    (5, 'Silicon Wafers', 'lot (1000 units)');

-- Reset sequences
SELECT setval('companies_id_seq', 6);
SELECT setval('products_id_seq', 5);

-- =====================================================
-- OWNED CONTRACTS (10 total)
-- 3 are intentionally overpriced for data correction demo
-- =====================================================

INSERT INTO contracts (product_id, company_id, direction, source, unit_price, volume, currency, delivery_days, credibility_score, deadline) VALUES
    -- Industrial Steel — 2 suppliers
    -- OVERPRICED (market ~€850, this is €980 = +15.3%)
    (1, 1, 'IN', 'OWNED', 980.00, 500, 'EUR', 14, 0.92, '2025-09-30'),
    (1, 2, 'IN', 'OWNED', 870.00, 300, 'EUR', 18, 0.85, '2025-08-31'),

    -- Aluminium Alloy — 2 suppliers
    (2, 1, 'IN', 'OWNED', 2420.00, 200, 'EUR', 21, 0.92, '2025-10-15'),
    -- OVERPRICED (market ~€2350, this is €2700 = +14.9%)
    (2, 2, 'IN', 'OWNED', 2700.00, 150, 'EUR', 10, 0.85, '2025-09-15'),

    -- Copper Cathode — 2 suppliers
    (3, 3, 'IN', 'OWNED', 8450.00, 80, 'EUR', 12, 0.91, '2025-10-01'),
    -- OVERPRICED (market ~€8200, this is €9500 = +15.9%)
    (3, 6, 'IN', 'OWNED', 9500.00, 60, 'EUR', 20, 0.76, '2025-11-01'),

    -- Lithium Carbonate — 1 supplier
    (4, 4, 'IN', 'OWNED', 14200.00, 40, 'EUR', 35, 0.82, '2025-10-30'),

    -- Silicon Wafers — 1 supplier
    (5, 5, 'IN', 'OWNED', 320.00, 500, 'EUR', 28, 0.88, '2025-09-15'),

    -- Outbound sales
    (1, 6, 'OUT', 'OWNED', 910.00, 400, 'EUR', 25, 0.78, '2025-11-01'),
    (2, 6, 'OUT', 'OWNED', 2380.00, 250, 'EUR', 30, 0.78, '2025-10-01');

-- =====================================================
-- MARKET OFFERS (20 total — 4 per product)
-- =====================================================

INSERT INTO contracts (product_id, company_id, direction, source, unit_price, volume, currency, delivery_days, credibility_score, deadline) VALUES
    -- Industrial Steel market offers (avg ~€850)
    (1, 1, 'IN', 'MARKET', 840.00, 1000, 'EUR', 21, 0.88, '2025-12-31'),
    (1, 2, 'IN', 'MARKET', 855.00, 600, 'EUR', 14, 0.90, '2025-11-30'),
    (1, 6, 'IN', 'MARKET', 830.00, 800, 'EUR', 28, 0.75, '2025-12-15'),
    (1, 1, 'IN', 'MARKET', 865.00, 400, 'EUR', 7, 0.95, '2025-09-30'),

    -- Aluminium Alloy market offers (avg ~€2350)
    (2, 2, 'IN', 'MARKET', 2340.00, 500, 'EUR', 18, 0.87, '2025-12-31'),
    (2, 6, 'IN', 'MARKET', 2310.00, 300, 'EUR', 25, 0.80, '2025-11-15'),
    (2, 1, 'IN', 'MARKET', 2380.00, 200, 'EUR', 10, 0.93, '2025-10-31'),
    (2, 2, 'IN', 'MARKET', 2370.00, 400, 'EUR', 14, 0.85, '2025-12-01'),

    -- Copper Cathode market offers (avg ~€8200)
    (3, 3, 'IN', 'MARKET', 8100.00, 200, 'EUR', 14, 0.92, '2025-12-31'),
    (3, 6, 'IN', 'MARKET', 8250.00, 150, 'EUR', 18, 0.80, '2025-11-30'),
    (3, 3, 'IN', 'MARKET', 8180.00, 100, 'EUR', 10, 0.94, '2025-10-31'),
    (3, 6, 'IN', 'MARKET', 8300.00, 120, 'EUR', 25, 0.77, '2025-12-15'),

    -- Lithium Carbonate market offers (avg ~€14000)
    (4, 4, 'IN', 'MARKET', 13800.00, 80, 'EUR', 30, 0.84, '2025-12-31'),
    (4, 4, 'IN', 'MARKET', 14100.00, 50, 'EUR', 21, 0.88, '2025-11-30'),
    (4, 4, 'IN', 'MARKET', 13600.00, 100, 'EUR', 42, 0.79, '2025-12-15'),
    (4, 4, 'IN', 'MARKET', 14500.00, 30, 'EUR', 14, 0.92, '2025-10-31'),

    -- Silicon Wafers market offers (avg ~€310/lot)
    (5, 5, 'IN', 'MARKET', 305.00, 1000, 'EUR', 25, 0.90, '2025-12-31'),
    (5, 5, 'IN', 'MARKET', 315.00, 500, 'EUR', 18, 0.93, '2025-11-30'),
    (5, 5, 'IN', 'MARKET', 298.00, 800, 'EUR', 35, 0.82, '2025-12-15'),
    (5, 5, 'IN', 'MARKET', 325.00, 300, 'EUR', 10, 0.96, '2025-10-31');
