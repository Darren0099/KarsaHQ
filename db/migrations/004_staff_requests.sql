ALTER TABLE hris.requests DROP CONSTRAINT IF EXISTS requests_type_check;
ALTER TABLE hris.requests ADD CONSTRAINT requests_type_check
  CHECK (type IN ('Cuti tahunan','Lembur','Koreksi absensi','Izin','Pengunduran diri'));
ALTER TABLE hris.requests ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE hris.requests ADD COLUMN IF NOT EXISTS end_date date CHECK (end_date >= work_date);
ALTER TABLE hris.requests ADD COLUMN IF NOT EXISTS resignation_letter bytea
  CHECK (octet_length(resignation_letter) BETWEEN 1 AND 2097152);
ALTER TABLE hris.requests DROP CONSTRAINT IF EXISTS resignation_requires_letter;
ALTER TABLE hris.requests ADD CONSTRAINT resignation_requires_letter
  CHECK ((type='Pengunduran diri')=(resignation_letter IS NOT NULL));
