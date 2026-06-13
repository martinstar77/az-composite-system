ALTER TABLE produkty 
ADD COLUMN min_skladova_zasoba NUMERIC(10,2) DEFAULT 0,
ADD COLUMN opt_skladova_zasoba NUMERIC(10,2) DEFAULT 0,
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Update the GIN index or ensure it's healthy
-- (No change needed to GIN index for these columns)
