-- DaaS Use Case Builder
-- Stores intended use exhibits for DaaS licensing deals

-- Enums
CREATE TYPE use_case_status AS ENUM ('draft', 'review', 'final', 'attached');
CREATE TYPE delivery_method_uc AS ENUM ('api', 'flat_file', 'sftp', 'cloud_delivery');
CREATE TYPE access_tier AS ENUM ('display_only', 'crm_append', 'bulk_export');
CREATE TYPE overage_model AS ENUM ('per_query', 'hard_shutoff');

-- Main table
CREATE TABLE daas_use_cases (
  use_case_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id             uuid REFERENCES deals(deal_id) ON DELETE SET NULL,
  customer_name       text NOT NULL,
  status              use_case_status NOT NULL DEFAULT 'draft',

  -- Delivery & access
  delivery_method     delivery_method_uc,
  access_tier         access_tier,

  -- Licensed fields (array of field key strings)
  licensed_fields     jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Intended use workflow (array of {step_number, description} objects)
  permitted_workflows jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Caching
  caching_permitted   boolean NOT NULL DEFAULT false,
  cache_ttl_days      integer,

  -- End-user provisions
  end_user_access     boolean NOT NULL DEFAULT false,
  end_user_can_export boolean NOT NULL DEFAULT false,

  -- Restrictions
  anti_competitive_clause boolean NOT NULL DEFAULT true,
  custom_restrictions     text,

  -- Volume & pricing
  volume_annual_minimum   integer,
  volume_monthly_queries  integer,
  overage_model           overage_model,

  -- Notes
  notes               text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_daas_use_cases_user_id ON daas_use_cases(user_id);
CREATE INDEX idx_daas_use_cases_user_status ON daas_use_cases(user_id, status);
CREATE INDEX idx_daas_use_cases_deal_id ON daas_use_cases(deal_id);

-- Updated_at trigger
CREATE TRIGGER set_daas_use_cases_updated_at
  BEFORE UPDATE ON daas_use_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE daas_use_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daas_use_cases_select" ON daas_use_cases
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "daas_use_cases_insert" ON daas_use_cases
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daas_use_cases_update" ON daas_use_cases
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "daas_use_cases_delete" ON daas_use_cases
  FOR DELETE USING (auth.uid() = user_id);
