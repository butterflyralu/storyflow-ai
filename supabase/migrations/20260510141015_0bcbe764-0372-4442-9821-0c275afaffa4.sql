ALTER TABLE public.product_contexts
ADD COLUMN IF NOT EXISTS dor_rules jsonb NOT NULL DEFAULT '[
  {"id":"ac","name":"Acceptance Criteria","description":"Acceptance criteria are present, grouped, and specific."},
  {"id":"desc","name":"Description","description":"Description is clear and sufficient for development."}
]'::jsonb;

UPDATE public.product_contexts
SET dor_rules = '[
  {"id":"ac","name":"Acceptance Criteria","description":"Acceptance criteria are present, grouped, and specific."},
  {"id":"desc","name":"Description","description":"Description is clear and sufficient for development."}
]'::jsonb
WHERE dor_rules IS NULL OR jsonb_array_length(dor_rules) = 0;