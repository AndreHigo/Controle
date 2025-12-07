-- Adicionar coluna para vincular transações a cartões de crédito
alter table public.transactions 
add column if not exists credit_card_id uuid references public.credit_cards(id) on delete set null;

-- Criar índice para melhor performance
create index if not exists transactions_credit_card_id_idx on public.transactions(credit_card_id);

-- Atualizar RLS para incluir o novo campo
-- As políticas existentes já cobrem esse campo
