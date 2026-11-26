ALTER TABLE hris.memberships ADD COLUMN IF NOT EXISTS employee_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conrelid='hris.memberships'::regclass AND conname='member_company_employee') THEN
    ALTER TABLE hris.memberships ADD CONSTRAINT member_company_employee
      FOREIGN KEY (company_id,employee_id) REFERENCES hris.employees(company_id,id);
  END IF;
END;
$$;
CREATE UNIQUE INDEX IF NOT EXISTS membership_employee_unique ON hris.memberships(employee_id) WHERE employee_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS hris.employee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES hris.companies(id),
  employee_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '48 hours',
  used_at timestamptz,
  FOREIGN KEY (company_id,employee_id) REFERENCES hris.employees(company_id,id)
);
CREATE INDEX IF NOT EXISTS invites_employee ON hris.employee_invitations(company_id,employee_id);
ALTER TABLE hris.employee_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS by_company ON hris.employee_invitations;
CREATE POLICY by_company ON hris.employee_invitations USING (company_id = nullif(current_setting('app.company_id',true),'')::uuid);
GRANT SELECT, INSERT ON hris.employee_invitations TO karsahq_app;
GRANT UPDATE (expires_at) ON hris.employee_invitations TO karsahq_app;
