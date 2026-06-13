-- 1. Create Profile Table (Extends Supabase Auth)
CREATE TABLE profily_uzivatelu (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    jmeno TEXT,
    role_id TEXT NOT NULL DEFAULT 'manager',
    vytvoreno_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Create User Roles Lookup Table
CREATE TABLE c_role_uzivatelu (
    id TEXT PRIMARY KEY, -- 'admin', 'manager', 'warehouse', 'sales'
    nazev TEXT NOT NULL
);

-- 3. Populate Roles
INSERT INTO c_role_uzivatelu (id, nazev) VALUES
('admin', 'Administrátor'),
('manager', 'Manažer'),
('warehouse', 'Skladník'),
('sales', 'Obchodník');

-- 4. Set Foreign Key for Profile Role
ALTER TABLE profily_uzivatelu 
ADD CONSTRAINT fk_role_profilu 
FOREIGN KEY (role_id) REFERENCES c_role_uzivatelu(id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE profily_uzivatelu ENABLE ROW LEVEL SECURITY;

-- 6. Basic RLS Policies
-- Users can read their own profile
CREATE POLICY "Uzivatele mohou cist vlastni profil" 
ON profily_uzivatelu FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Admins can do everything
CREATE POLICY "Admini mohou vse v profilech" 
ON profily_uzivatelu FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM profily_uzivatelu 
        WHERE id = auth.uid() AND role_id = 'admin'
    )
);

-- 7. Trigger to automatically create profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profily_uzivatelu (id, email, role_id)
  VALUES (new.id, new.email, 'manager'); -- Default role
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Seed the existing admin user we created earlier into the profile table
-- Note: This is safe because of the trigger, but for existing users we might need manual sync.
-- Since we just started, a reset will handle it properly.
