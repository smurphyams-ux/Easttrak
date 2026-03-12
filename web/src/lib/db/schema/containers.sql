-- Add location fields to containers table
ALTER TABLE containers ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE containers ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE containers ADD COLUMN IF NOT EXISTS current_location TEXT;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS route_id VARCHAR(50);
ALTER TABLE containers ADD COLUMN IF NOT EXISTS last_service_date DATE;

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_containers_location ON containers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_containers_route ON containers(route_id);