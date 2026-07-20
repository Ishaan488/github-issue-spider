-- Create rules table
CREATE TABLE IF NOT EXISTS public.rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  labels TEXT[] NOT NULL,
  languages TEXT[] NOT NULL,
  min_stars INTEGER NOT NULL DEFAULT 0,
  last_run_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create processed_issues table
CREATE TABLE IF NOT EXISTS public.processed_issues (
  issue_id BIGINT PRIMARY KEY,
  repo_name TEXT NOT NULL,
  rule_id UUID REFERENCES public.rules(id) ON DELETE CASCADE,
  discovered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_issues ENABLE ROW LEVEL SECURITY;

-- Policies for rules table (Users can only see and manage their own rules)
CREATE POLICY "Users can view their own rules"
  ON public.rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rules"
  ON public.rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules"
  ON public.rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules"
  ON public.rules FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for processed_issues (Bot will use a service key to bypass RLS, users just need read access if we ever show it to them, but for now we can restrict it entirely)
CREATE POLICY "Users can view issues processed by their rules"
  ON public.processed_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rules
      WHERE rules.id = processed_issues.rule_id
      AND rules.user_id = auth.uid()
    )
  );
