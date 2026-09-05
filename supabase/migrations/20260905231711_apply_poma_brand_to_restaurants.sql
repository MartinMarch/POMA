begin;

set local lock_timeout = '5s';

alter table public.restaurants
  alter column accent_color set default '#936624';

update public.restaurants
set accent_color = '#936624'
where slug = 'demo'
  and accent_color is distinct from '#936624';

commit;
