const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const sql = fs.readFileSync(path.join(root,'supabase/migrations/202610290001_initial.sql'),'utf8');
const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map(m=>m[1]);
let failures=0;
for (const table of tables) {
 if (!sql.includes(`alter table public.${table} enable row level security;`)) {
  console.error(`Missing RLS: ${table}`);failures++;
 }
}
for(const file of ['src/proxy.ts','src/lib/auth.ts','src/app/actions.ts','src/app/auth/callback/route.ts',
  'src/app/(platform)/feed/page.tsx','src/app/(platform)/network/page.tsx','src/app/(platform)/admin/page.tsx','.env.example']){
 if(!fs.existsSync(path.join(root,file))){console.error(`Missing file: ${file}`);failures++;}
}
if (/(sk_(?:live|test)_[a-z0-9]{10,}|supabase_service_role_key\s*=\s*eyJ)/i.test(sql)) {console.error('Possible embedded secret');failures++;}
console.log(`Checked ${tables.length} RLS tables and required project files: ${failures?'FAILED':'PASS'}`);
process.exitCode=failures?1:0;
