-- ═══════════════════════════════════════════════════════════
-- FinPulse — FULL DATABASE RESET & SETUP
-- Run this ENTIRE script in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ███ STEP 1: DROP EVERYTHING ███
DROP TABLE IF EXISTS net_worth_history CASCADE;
DROP TABLE IF EXISTS budget_limits CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ███ STEP 2: CREATE TABLES ███

-- 1. PROFILES
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text DEFAULT 'User',
  age integer,
  phone text,
  bank_balance numeric DEFAULT 0,
  cash_balance numeric DEFAULT 0,
  liabilities numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own profile" ON profiles FOR ALL USING (auth.uid() = user_id);

-- 2. GOALS
CREATE TABLE goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  target_amount numeric NOT NULL,
  current_amount numeric DEFAULT 0,
  target_date date,
  icon text DEFAULT '🎯',
  color text DEFAULT '#4F46E5',
  priority integer DEFAULT 0,
  status text CHECK (status IN ('active', 'paused', 'completed', 'archived')) DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own goals" ON goals FOR ALL USING (auth.uid() = user_id);

-- 3. TRANSACTIONS
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date_time timestamptz NOT NULL,
  type text CHECK (type IN ('income', 'expense', 'transfer')) NOT NULL,
  amount numeric NOT NULL,
  payment_method text CHECK (payment_method IN ('cash', 'bank', 'upi', 'card', 'other')) NOT NULL,
  category text CHECK (category IN ('Food', 'Rent', 'Salary', 'EMI', 'Medical', 'Entertainment', 'Shopping', 'Investment', 'Goal Payment', 'Other')) NOT NULL,
  linked_goal_id uuid REFERENCES goals(id) ON DELETE SET NULL,
  note text,
  receipt_url text,
  is_split boolean DEFAULT false,
  split_cash_amount numeric,
  split_bank_amount numeric,
  is_recurring boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_tx_user_date ON transactions(user_id, date_time DESC);
CREATE INDEX idx_tx_category ON transactions(user_id, category);

-- 4. BUDGET LIMITS
CREATE TABLE budget_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  monthly_limit numeric NOT NULL,
  UNIQUE(user_id, category)
);

ALTER TABLE budget_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own budgets" ON budget_limits FOR ALL USING (auth.uid() = user_id);

-- 5. NET WORTH HISTORY
CREATE TABLE net_worth_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  net_worth numeric NOT NULL,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE net_worth_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own net worth" ON net_worth_history FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_nw_user_date ON net_worth_history(user_id, recorded_at DESC);
