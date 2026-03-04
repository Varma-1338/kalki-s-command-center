
-- Add login_key to teams
ALTER TABLE public.teams ADD COLUMN login_key text UNIQUE;

-- Add member_name and member_email to team_members, make user_id nullable
ALTER TABLE public.team_members ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.team_members ADD COLUMN member_name text NOT NULL DEFAULT '';
ALTER TABLE public.team_members ADD COLUMN member_email text NOT NULL DEFAULT '';

-- Create attendance table
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  present boolean NOT NULL DEFAULT false,
  marked_at timestamp with time zone DEFAULT now(),
  marked_by uuid,
  UNIQUE(team_member_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage attendance" ON public.attendance FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Team members can view own attendance" ON public.attendance FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.team_members tm2 ON tm.team_id = tm2.team_id
    WHERE tm2.id = attendance.team_member_id AND tm.user_id = auth.uid()
  )
);
