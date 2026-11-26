ALTER TABLE hris.employees
  ADD COLUMN IF NOT EXISTS work_email text,
  ADD COLUMN IF NOT EXISTS started_on date,
  ADD COLUMN IF NOT EXISTS ended_on date,
  ADD COLUMN IF NOT EXISTS contract_ends_on date,
  ADD COLUMN IF NOT EXISTS contract_type text;

CREATE TABLE IF NOT EXISTS hris.employment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  effective_on date NOT NULL,
  role text NOT NULL,
  department text NOT NULL,
  note text NOT NULL,
  FOREIGN KEY(company_id,employee_id) REFERENCES hris.employees(company_id,id)
);
CREATE TABLE IF NOT EXISTS hris.employee_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  name text NOT NULL,
  content bytea NOT NULL CHECK (octet_length(content) BETWEEN 1 AND 2097152),
  added_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(company_id,employee_id) REFERENCES hris.employees(company_id,id)
);
CREATE TABLE IF NOT EXISTS hris.salary_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  period date NOT NULL,
  snapshot jsonb NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,employee_id,period),
  FOREIGN KEY(company_id,employee_id) REFERENCES hris.employees(company_id,id)
);
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['employment_records','employee_files','salary_slips'] LOOP
    EXECUTE format('ALTER TABLE hris.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('DROP POLICY IF EXISTS by_company ON hris.%I',t);
    EXECUTE format('CREATE POLICY by_company ON hris.%I USING (company_id = nullif(current_setting(''app.company_id'',true),'''')::uuid)',t);
  END LOOP;
END;
$$;
GRANT UPDATE (name,role,department,work_email,started_on,ended_on,contract_ends_on,contract_type) ON hris.employees TO karsahq_app;
GRANT SELECT, INSERT ON hris.employment_records, hris.employee_files, hris.salary_slips TO karsahq_app;
