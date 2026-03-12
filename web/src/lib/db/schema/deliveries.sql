-- Deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_number VARCHAR(50) NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  delivery_address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-transit', 'delivered', 'failed')),
  scheduled_date TIMESTAMP NOT NULL,
  delivered_date TIMESTAMP,
  driver_id UUID REFERENCES drivers(id),
  route_id VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deliveries_scheduled_date ON deliveries(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_route ON deliveries(route_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_location ON deliveries(latitude, longitude);
