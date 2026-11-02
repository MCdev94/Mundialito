-- Struttura del maschile: nessun livello viene assegnato all'anagrafica.
alter table public.champs add column divisione text;
update public.champs set divisione='avanzato', name='GonéPadelCup Maschile Avanzato', ordine=0
where type='maschile';
update public.champs set ordine=2 where type='femminile';
update public.champs set ordine=3 where type='misto';
insert into public.champs(id,name,type,divisione,ordine,soglia,bonus,carry,v)
values(gen_random_uuid()::text,'GonéPadelCup Maschile Intermedio','maschile','intermedio',1,0,0,'{}'::jsonb,5);
alter table public.champs add constraint divisione_solo_maschile check (
  case when type='maschile' then divisione is not null and divisione in ('avanzato','intermedio')
       else divisione is null end
);
create unique index champs_type_divisione_key on public.champs(type,coalesce(divisione,''));
update public.settings set data=jsonb_set(data,'{structure}','"male-divisions-v1"'::jsonb),updated_at=now();
do $$
declare tabella text;
begin
  foreach tabella in array array['players','champs','events','settings','albo'] loop
    execute format('update public.%I set v=5',tabella);
    execute format('alter table public.%I add constraint gone_divisions_v5 check(v>=5)',tabella);
    -- Le versioni precedenti non distinguono le divisioni e potrebbero unirle.
    execute format(
      'alter policy competition_generation on public.%I
       using ((select coalesce(nullif(current_setting(''request.headers'',true),'''')::jsonb->>''x-app-generation'','''') = ''gone-padel-cup-2026-11-02''
         and coalesce(nullif(current_setting(''request.headers'',true),'''')::jsonb->>''x-app-structure'','''') = ''male-divisions-v1''))
       with check ((select coalesce(nullif(current_setting(''request.headers'',true),'''')::jsonb->>''x-app-generation'','''') = ''gone-padel-cup-2026-11-02''
         and coalesce(nullif(current_setting(''request.headers'',true),'''')::jsonb->>''x-app-structure'','''') = ''male-divisions-v1''))',tabella);
  end loop;
end $$;
notify pgrst, 'reload schema';
