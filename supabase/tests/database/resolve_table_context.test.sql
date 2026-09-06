begin;

select plan(6);

select has_column(
  'public',
  'restaurants',
  'requires_table_token',
  'restaurants can require a table token'
);

select has_function(
  'public',
  'resolve_table_context',
  array['text', 'uuid'],
  'the Data API wrapper exists'
);

select function_returns(
  'public',
  'resolve_table_context',
  array['text', 'uuid'],
  'setof record',
  'the wrapper returns only a table context record'
);

select results_eq(
  $$
    select table_name
    from public.resolve_table_context(
      'demo',
      'c0ffee00-0000-4000-8000-000000000001'::uuid
    )
  $$,
  $$ values ('Mesa 1'::text) $$,
  'a valid active DEMO table resolves'
);

select is_empty(
  $$
    select *
    from public.resolve_table_context(
      'demo',
      'c0ffee00-0000-4000-8000-000000000099'::uuid
    )
  $$,
  'an unknown token does not resolve'
);

update public.dining_tables
set is_active = false
where public_token = 'c0ffee00-0000-4000-8000-000000000001'::uuid;

select is_empty(
  $$
    select *
    from public.resolve_table_context(
      'demo',
      'c0ffee00-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'an inactive table does not resolve'
);

select * from finish();
rollback;
