ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS login_42 VARCHAR(255);

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_login_42_key'
    ) THEN
        ALTER TABLE public.users
        ADD CONSTRAINT users_login_42_key UNIQUE (login_42);
    END IF;
END
$$;
