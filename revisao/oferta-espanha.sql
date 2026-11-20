begin;

create table public.oferta_espanha_checkout (
  callback uuid primary key,
  created_at timestamptz not null default now(),
  plan text not null check (plan in ('basic','premium','upsell','ds6','ds3','ds1')),
  offer_id text not null,
  buyer_name text not null,
  buyer_email text not null,
  amount_cents integer not null check (amount_cents > 0)
);

create table public.oferta_espanha_orders (
  id text primary key check (id ~ '^pi_[a-zA-Z0-9]+$'),
  callback uuid not null references public.oferta_espanha_checkout(callback),
  plan text not null,
  amount_cents integer not null check (amount_cents > 0),
  status text not null check (status in ('paid', 'chargedback', 'refunded')),
  created_at timestamptz not null,
  name text not null,
  email text not null,
  payment_method text not null
);
create index oferta_espanha_orders_by_checkout on public.oferta_espanha_orders (callback);
create index oferta_espanha_orders_in_admin on public.oferta_espanha_orders (created_at desc, id desc);

alter table public.oferta_espanha_checkout enable row level security;
alter table public.oferta_espanha_orders enable row level security;
revoke all on public.oferta_espanha_checkout, public.oferta_espanha_orders from public, anon, authenticated;
grant select, insert on public.oferta_espanha_checkout to service_role;
grant select, insert, update on public.oferta_espanha_orders to service_role;

create function public.oferta_espanha_record_payment(
  p_callback uuid, p_offer text, p_transaction text, p_status text,
  p_amount integer, p_created timestamptz, p_name text, p_email text, p_method text
) returns text
language plpgsql security invoker
set search_path = ''
as $$
declare
  checkout public.oferta_espanha_checkout%rowtype;
begin
  select * into checkout from public.oferta_espanha_checkout where callback = p_callback;
  if not found then
    return 'unknown_checkout';
  end if;
  if checkout.offer_id is distinct from p_offer
    or checkout.amount_cents is distinct from p_amount then
    return 'mismatch';
  end if;

  insert into public.oferta_espanha_orders as saved
    (id, callback, plan, amount_cents, status, created_at, name, email, payment_method)
  values
    (p_transaction, p_callback, checkout.plan, p_amount, p_status, p_created, p_name, p_email, p_method)
  on conflict (id) do update set status = excluded.status
    where saved.callback = excluded.callback
      and saved.amount_cents = excluded.amount_cents
      and saved.status <> 'refunded';

  if not exists (
    select 1 from public.oferta_espanha_orders
    where id = p_transaction and callback = p_callback and amount_cents = p_amount
  ) then
    return 'mismatch';
  end if;
  return 'ok';
end;
$$;
revoke all on function public.oferta_espanha_record_payment(uuid,text,text,text,integer,timestamptz,text,text,text)
  from public, anon, authenticated;
grant execute on function public.oferta_espanha_record_payment(uuid,text,text,text,integer,timestamptz,text,text,text)
  to service_role;

notify pgrst, 'reload schema';
commit;
