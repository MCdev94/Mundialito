-- Riattiva le logiche esistenti; non modifica risultati, anagrafica o date delle finali.
begin;
do $$ begin
  if not exists(select 1 from public.settings where data->>'structure'='male-divisions-v1') then
    raise exception 'Struttura dei campionati non aggiornata';
  end if;
  if exists(select 1 from public.settings where data->>'regolePronte'='true') then
    raise exception 'Regole già attive: configurazione non modificata';
  end if;
end $$;
update public.champs
set soglia=case type when 'maschile' then 8 when 'femminile' then 4 when 'misto' then 5 end,
    bonus=5, settimane=case when type='maschile' then 10 else 7 end,
    updated_at=now()
where type in ('maschile','femminile','misto');
update public.settings set data=jsonb_set(data,'{regolePronte}','true'::jsonb),updated_at=now() where id=1;
commit;
