CREATE SCHEMA IF NOT EXISTS hris;

CREATE TABLE IF NOT EXISTS hris.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  latitude double precision,
  longitude double precision,
  radius_m integer NOT NULL DEFAULT 200 CHECK (radius_m BETWEEN 20 AND 5000)
);

CREATE TABLE IF NOT EXISTS hris.memberships (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES hris.companies(id),
  role text NOT NULL CHECK (role IN ('admin','employee'))
);

CREATE TABLE IF NOT EXISTS hris.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES hris.companies(id),
  name text NOT NULL,
  role text NOT NULL,
  department text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,id)
);

CREATE TABLE IF NOT EXISTS hris.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES hris.companies(id),
  employee_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('Cuti tahunan','Lembur','Koreksi absensi')),
  work_date date NOT NULL,
  status text NOT NULL DEFAULT 'Menunggu' CHECK (status IN ('Menunggu','Disetujui','Ditolak')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id,employee_id) REFERENCES hris.employees(company_id,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS requests_open_unique
ON hris.requests(company_id,employee_id,type,work_date) WHERE status <> 'Ditolak';

CREATE TABLE IF NOT EXISTS hris.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES hris.companies(id),
  user_id text NOT NULL REFERENCES public."user"(id),
  work_date date NOT NULL,
  event text NOT NULL CHECK (event IN ('Masuk','Pulang')),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_m double precision NOT NULL CHECK (accuracy_m >= 0),
  distance_m integer,
  review text NOT NULL CHECK (review IN ('Dalam area','Di luar area','Lokasi kurang akurat','Area belum diatur')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,user_id,work_date,event)
);

CREATE TABLE IF NOT EXISTS hris.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES hris.companies(id),
  actor_id text NOT NULL,
  action text NOT NULL,
  entity_id text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_company_time ON hris.audit_logs(company_id,created_at DESC);

CREATE OR REPLACE FUNCTION hris.prevent_audit_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are append-only';
END;
$$;
DROP TRIGGER IF EXISTS audit_append_only ON hris.audit_logs;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON hris.audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION hris.prevent_audit_change();

DO $$
DECLARE table_name text;
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='karsahq_app') THEN
    CREATE ROLE karsahq_app NOLOGIN;
  END IF;
  EXECUTE format('GRANT karsahq_app TO %I', current_user);
  FOREACH table_name IN ARRAY ARRAY['employees','requests','attendance','audit_logs'] LOOP
    EXECUTE format('ALTER TABLE hris.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('DROP POLICY IF EXISTS by_company ON hris.%I',table_name);
    EXECUTE format('CREATE POLICY by_company ON hris.%I USING (company_id = nullif(current_setting(''app.company_id'',true),'''')::uuid)',table_name);
  END LOOP;
END;
$$;
GRANT USAGE ON SCHEMA hris TO karsahq_app;
GRANT SELECT, INSERT ON hris.employees,hris.requests,hris.attendance,hris.audit_logs TO karsahq_app;
GRANT UPDATE (status) ON hris.requests TO karsahq_app;
