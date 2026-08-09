
ALTER TABLE public.ingredients
  ADD COLUMN evidence_strength text,
  ADD COLUMN confidence_score integer;
