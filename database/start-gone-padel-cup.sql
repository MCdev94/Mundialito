-- Reset autorizzato: conserva l'anagrafica; elimina i dati della competizione precedente.
-- Eseguire soltanto dopo avere salvato e verificato un backup esterno al repository.
do $$
begin
  if exists (select 1 from public.settings where data->>'generation' = 'gone-padel-cup-2026-11-02') then
    raise exception 'La nuova competizione è già stata inizializzata: reset annullato';
  end if;
end $$;

lock table public.players, public.champs, public.events, public.albo, public.settings in share row exclusive mode;

-- La generazione è una barriera contro le vecchie code offline, non una credenziale.
-- Rimangono obbligatori l'accesso autenticato e tutte le policy esistenti.
do $$
declare tabella text;
begin
  foreach tabella in array array['players','champs','events','settings','albo'] loop
    execute format(
      'create policy competition_generation on public.%I as restrictive for all to authenticated
       using ((select coalesce(nullif(current_setting(''request.headers'',true),'''')::jsonb->>''x-app-generation'','''') = ''gone-padel-cup-2026-11-02''))
       with check ((select coalesce(nullif(current_setting(''request.headers'',true),'''')::jsonb->>''x-app-generation'','''') = ''gone-padel-cup-2026-11-02''))', tabella);
  end loop;
end $$;

delete from public.events;
delete from public.albo;
update public.champs
set name = 'GonéPadelCup ' || case type when 'maschile' then 'Maschile' when 'femminile' then 'Femminile' when 'misto' then 'Misto' end,
    ed = '', soglia = 0, bonus = 0, carry = '{}'::jsonb, settimane = 8,
    bonus_ass = null, giornate_base = 0, ultima = null,
    data_finale = null, ora_finale = null, v = 4, updated_at = now();
update public.players set v = 4, updated_at = now();
update public.settings
set data = jsonb_build_object('campi',coalesce(data->'campi','5'::jsonb),
      'logo',coalesce(data->'logo','""'::jsonb),'firma','GonéPadelCup',
      'generation','gone-padel-cup-2026-11-02','regolePronte',false),
    v = 4, updated_at = now();

alter table public.champs alter column soglia set default 0, alter column bonus set default 0;
do $$
declare tabella text;
begin
  foreach tabella in array array['players','champs','events','settings','albo'] loop
    execute format('alter table public.%I add constraint gone_generation_v4 check (v >= 4)', tabella);
  end loop;
end $$;
