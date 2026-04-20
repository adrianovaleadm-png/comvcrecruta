DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Company admins can update their company" ON public.companies;
DROP POLICY IF EXISTS "Company members can view their company" ON public.companies;

CREATE POLICY "Allow all access to companies"
ON public.companies
FOR ALL
USING (true)
WITH CHECK (true);