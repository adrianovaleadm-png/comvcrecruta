-- Fix companies policies
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Company members can view their company" ON public.companies;
DROP POLICY IF EXISTS "Company admins can update their company" ON public.companies;

CREATE POLICY "Authenticated users can create companies"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Company members can view their company"
ON public.companies FOR SELECT
TO authenticated
USING (is_company_member(auth.uid(), id));

CREATE POLICY "Company admins can update their company"
ON public.companies FOR UPDATE
TO authenticated
USING (is_company_admin(auth.uid(), id));

-- Fix company_members policies
DROP POLICY IF EXISTS "Admins can insert company members" ON public.company_members;
DROP POLICY IF EXISTS "Members can view their company members" ON public.company_members;
DROP POLICY IF EXISTS "Admins can update company members" ON public.company_members;
DROP POLICY IF EXISTS "Admins can delete company members" ON public.company_members;

CREATE POLICY "Admins can insert company members"
ON public.company_members FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR is_company_admin(auth.uid(), company_id)));

CREATE POLICY "Members can view their company members"
ON public.company_members FOR SELECT
TO authenticated
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can update company members"
ON public.company_members FOR UPDATE
TO authenticated
USING (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins can delete company members"
ON public.company_members FOR DELETE
TO authenticated
USING (is_company_admin(auth.uid(), company_id));