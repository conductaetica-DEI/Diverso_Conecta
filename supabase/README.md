# supabase/

Directorio de trabajo para Supabase CLI y migraciones SQL.

## Estructura

```
supabase/
  migrations/         ← Archivos SQL que se ejecutan contra la BD remota
  package.json        ← Dependencia de Supabase CLI (npx supabase ...)
  supabase/.temp/     ← Estado local del CLI (generado por supabase link, NO subir a git)
  node_modules/       ← Dependencias npm (NO subir a git)
```

## Uso

```bash
cd supabase/

# Vincular al proyecto remoto (una sola vez por máquina)
npx supabase link --project-ref nrqmnaktnpcgqrqpoksi

# Ejecutar una migración contra la BD remota
npx supabase db query --linked -f migrations/001_schema.sql

# Consultar la BD remota
npx supabase db query --linked "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
```

## Notas

- `supabase/supabase/.temp/` se genera al hacer `supabase link`. Contiene la referencia al proyecto, versiones cacheadas y URLs del pooler. Se regenera automáticamente — no eliminarlo manualmente.
- Cada desarrollador debe hacer su propio `supabase link` después de clonar.
