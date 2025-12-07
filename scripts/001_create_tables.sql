-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Create categories table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  type text not null check (type in ('income', 'expense')),
  created_at timestamptz default now()
);

-- Create transactions table
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  amount decimal(12, 2) not null,
  type text not null check (type in ('income', 'expense')),
  date date not null default current_date,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create index for better query performance
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_date_idx on public.transactions(date);
create index if not exists transactions_category_id_idx on public.transactions(category_id);
create index if not exists categories_user_id_idx on public.categories(user_id);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
