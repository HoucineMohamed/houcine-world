-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy: Only admins can view user_roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policy: Only admins can insert user_roles
CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create page_views table for analytics
CREATE TABLE public.page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_path TEXT NOT NULL,
    page_name TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'desktop',
    referrer TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on page_views
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts to page_views
CREATE POLICY "Allow anonymous inserts to page_views"
ON public.page_views
FOR INSERT
WITH CHECK (true);

-- Only admins can read page_views
CREATE POLICY "Admins can read page_views"
ON public.page_views
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create cta_events table for tracking CTA clicks
CREATE TABLE public.cta_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    page_path TEXT NOT NULL,
    page_name TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'desktop',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on cta_events
ALTER TABLE public.cta_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts to cta_events
CREATE POLICY "Allow anonymous inserts to cta_events"
ON public.cta_events
FOR INSERT
WITH CHECK (true);

-- Only admins can read cta_events
CREATE POLICY "Admins can read cta_events"
ON public.cta_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add status column to submissions table
ALTER TABLE public.submissions
ADD COLUMN status TEXT NOT NULL DEFAULT 'new';

-- Create index for faster queries
CREATE INDEX idx_submissions_status ON public.submissions(status);
CREATE INDEX idx_submissions_created_at ON public.submissions(created_at DESC);
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX idx_cta_events_created_at ON public.cta_events(created_at DESC);