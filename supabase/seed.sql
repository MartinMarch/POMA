-- Identidad reservada únicamente para verificar el rol global en pruebas locales.
-- `seed.sql` no se despliega a producción.
insert into private.admin_email_allowlist (email)
values ('admin.e2e@example.com')
on conflict (email) do nothing;
