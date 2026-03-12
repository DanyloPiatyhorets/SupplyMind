-- SupplyMind Seed Data
-- 3 EU suppliers, 2 products, 6 owned contracts, 8 market offers
-- 2 owned contracts are intentionally 12-18% above market price for data correction demo

-- Companies
INSERT INTO companies (id, name, country) VALUES
    (1, 'GermSteel GmbH', 'Germany'),
    (2, 'FranceMetal SA', 'France'),
    (3, 'PolyChem Ltd', 'United Kingdom');

-- Products
INSERT INTO products (id, name, unit) VALUES
    (1, 'Industrial Steel', 'metric ton'),
    (2, 'Aluminium Alloy', 'metric ton');

-- Reset sequences
SELECT setval('companies_id_seq', 3);
SELECT setval('products_id_seq', 2);

-- =====================================================
-- OWNED CONTRACTS (6 total, 2 per company)
-- 2 of these are intentionally overpriced for data correction demo
-- =====================================================

INSERT INTO contracts (product_id, company_id, direction, source, unit_price, volume, currency, delivery_days, credibility_score, deadline) VALUES
    -- GermSteel GmbH
    -- Contract 1: Industrial Steel supply — OVERPRICED (market ~€850, this is €980 = +15.3%)
    (1, 1, 'IN', 'OWNED', 980.00, 500, 'EUR', 14, 0.92, '2025-09-30'),
    -- Contract 2: Aluminium Alloy supply — fair price
    (2, 1, 'IN', 'OWNED', 2420.00, 200, 'EUR', 21, 0.92, '2025-10-15'),

    -- FranceMetal SA
    -- Contract 3: Industrial Steel supply — fair price
    (1, 2, 'IN', 'OWNED', 870.00, 300, 'EUR', 18, 0.85, '2025-08-31'),
    -- Contract 4: Aluminium Alloy supply — OVERPRICED (market ~€2350, this is €2700 = +14.9%)
    (2, 2, 'OUT', 'OWNED', 2700.00, 150, 'EUR', 10, 0.85, '2025-09-15'),

    -- PolyChem Ltd
    -- Contract 5: Industrial Steel demand
    (1, 3, 'OUT', 'OWNED', 910.00, 400, 'EUR', 25, 0.78, '2025-11-01'),
    -- Contract 6: Aluminium Alloy supply — fair price
    (2, 3, 'IN', 'OWNED', 2380.00, 250, 'EUR', 30, 0.78, '2025-10-01');

-- =====================================================
-- MARKET OFFERS (8 total)
-- These represent available offers from the broader market
-- =====================================================

INSERT INTO contracts (product_id, company_id, direction, source, unit_price, volume, currency, delivery_days, credibility_score, deadline) VALUES
    -- Industrial Steel market offers (market avg ~€850)
    (1, 1, 'IN', 'MARKET', 840.00, 1000, 'EUR', 21, 0.88, '2025-12-31'),
    (1, 2, 'IN', 'MARKET', 855.00, 600, 'EUR', 14, 0.90, '2025-11-30'),
    (1, 3, 'IN', 'MARKET', 830.00, 800, 'EUR', 28, 0.75, '2025-12-15'),
    (1, 1, 'IN', 'MARKET', 865.00, 400, 'EUR', 7, 0.95, '2025-09-30'),

    -- Aluminium Alloy market offers (market avg ~€2350)
    (2, 2, 'IN', 'MARKET', 2340.00, 500, 'EUR', 18, 0.87, '2025-12-31'),
    (2, 3, 'IN', 'MARKET', 2310.00, 300, 'EUR', 25, 0.80, '2025-11-15'),
    (2, 1, 'IN', 'MARKET', 2380.00, 200, 'EUR', 10, 0.93, '2025-10-31'),
    (2, 2, 'IN', 'MARKET', 2370.00, 400, 'EUR', 14, 0.85, '2025-12-01');
