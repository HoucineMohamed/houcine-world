-- Create submissions table for all form submissions
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_name TEXT NOT NULL,
  form_type TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_phone TEXT,
  service_type TEXT,
  message TEXT,
  additional_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscriptions table for newsletter subscriptions
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous inserts (public forms)
CREATE POLICY "Allow anonymous inserts to submissions"
ON public.submissions
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous inserts to subscriptions"
ON public.subscriptions
FOR INSERT
TO anon
WITH CHECK (true);

-- Create policy for authenticated users to read (for admin purposes in future)
CREATE POLICY "Allow authenticated users to read submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to read subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (true);