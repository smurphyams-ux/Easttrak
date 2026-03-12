-- Contracts table
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  container_id UUID NOT NULL REFERENCES containers(id),
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_rate DECIMAL(10, 2) NOT NULL,
  overage_rate_per_day DECIMAL(10, 2) NOT NULL,
  allowed_days INTEGER NOT NULL DEFAULT 30,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  contract_id UUID NOT NULL REFERENCES contracts(id),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'void')),
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Invoice line items table
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('rental', 'overage', 'damage', 'missed_pickup', 'other')),
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL
);

-- Payment methods table
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('credit_card', 'ach')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  last4 VARCHAR(4) NOT NULL,
  expiry_month INTEGER,
  expiry_year INTEGER,
  stripe_payment_method_id VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Payment transactions table
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  transaction_id VARCHAR(100),
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contracts_customer ON contracts(customer_id);
CREATE INDEX idx_contracts_container ON contracts(container_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_payment_methods_customer ON payment_methods(customer_id);
