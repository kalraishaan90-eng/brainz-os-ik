const fs = require('fs');
const path = require('path');

const migDir = path.resolve(__dirname, '../supabase/migrations');
const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql') && !f.includes('_down'));

const tables = new Set();
const views = new Set();
const funcs = new Set();
const triggers = new Set();
const policies = [];

files.forEach(f => {
  const content = fs.readFileSync(path.join(migDir, f), 'utf8');
  // tables
  const tblMatches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi);
  for (const m of tblMatches) tables.add(m[1]);

  // views
  const viewMatches = content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:public\.)?([a-zA-Z0-9_]+)/gi);
  for (const m of viewMatches) views.add(m[1]);

  // funcs
  const fnMatches = content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)/gi);
  for (const m of fnMatches) funcs.add(m[1]);

  // triggers
  const trgMatches = content.matchAll(/CREATE\s+TRIGGER\s+([a-zA-Z0-9_]+)/gi);
  for (const m of trgMatches) triggers.add(m[1]);

  // policies
  const polMatches = content.matchAll(/CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)/gi);
  for (const m of polMatches) policies.push({ table: m[2], name: m[1], file: f });
});

console.log("TABLES (" + tables.size + "):", Array.from(tables).sort());
console.log("VIEWS (" + views.size + "):", Array.from(views).sort());
console.log("FUNCTIONS (" + funcs.size + "):", Array.from(funcs).sort());
console.log("TRIGGERS (" + triggers.size + "):", Array.from(triggers).sort());
console.log("POLICIES COUNT:", policies.length);

// Also check storage buckets and realtime publications
files.forEach(f => {
  const content = fs.readFileSync(path.join(migDir, f), 'utf8');
  if (content.includes('storage.buckets')) {
    console.log("Storage in:", f);
  }
  if (content.includes('supabase_realtime')) {
    console.log("Realtime in:", f);
  }
});

const eduviaPath = path.resolve(__dirname, '../Eduvia.html');
if (fs.existsSync(eduviaPath)) {
  const content = fs.readFileSync(eduviaPath, 'utf8');
  const fromMatches = new Set();
  for (const m of content.matchAll(/supabase\s*\.\s*from\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    fromMatches.add(m[1]);
  }
  console.log('FRONTEND supabase.from tables:', Array.from(fromMatches).sort());

  const authMatches = new Set();
  for (const m of content.matchAll(/supabase\s*\.\s*auth\s*\.\s*([a-zA-Z0-9_]+)/g)) {
    authMatches.add(m[1]);
  }
  console.log('FRONTEND supabase.auth methods:', Array.from(authMatches).sort());

  const channelMatches = new Set();
  for (const m of content.matchAll(/supabase\s*\.\s*channel\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    channelMatches.add(m[1]);
  }
  console.log('FRONTEND supabase.channel names:', Array.from(channelMatches).sort());

  const fnMatches = new Set();
  for (const m of content.matchAll(/supabase\s*\.\s*functions\s*\.\s*invoke\(\s*['"]([^'"]+)['"]/g)) {
    fnMatches.add(m[1]);
  }
  console.log('FRONTEND supabase.functions invokes:', Array.from(fnMatches).sort());

  const rpcMatches = new Set();
  for (const m of content.matchAll(/supabase\s*\.\s*rpc\(\s*['"]([^'"]+)['"]/g)) {
    rpcMatches.add(m[1]);
  }
  console.log('FRONTEND supabase.rpc calls:', Array.from(rpcMatches).sort());

  const storageMatches = new Set();
  for (const m of content.matchAll(/supabase\s*\.\s*storage\s*\.\s*([a-zA-Z0-9_]+)/g)) {
    storageMatches.add(m[1]);
  }
  console.log('FRONTEND supabase.storage:', Array.from(storageMatches).sort());
}

