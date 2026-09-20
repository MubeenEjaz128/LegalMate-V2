const { execFileSync } = require('child_process');

try {
  const out = execFileSync('npm', ['audit', '--json'], {
    cwd: require('path').join(__dirname, '..'),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024
  });

  print(out);
} catch (error) {
  const out = error.stdout ? String(error.stdout) : '';
  if (out) print(out);
  else {
    console.log('[AUDIT] Unable to obtain npm audit JSON:', error.message);
  }
}

function print(raw) {
  try {
    const audit = JSON.parse(raw);
    const vulnerabilities = audit.vulnerabilities || {};
    const rows = Object.entries(vulnerabilities)
      .map(([name, v]) => ({
        name,
        severity: v.severity,
        direct: Boolean(v.isDirect),
        range: v.range,
        via: Array.isArray(v.via)
          ? v.via.map(x => typeof x === 'string' ? x : x.title || x.name || 'advisory').slice(0, 4)
          : [],
        fix: v.fixAvailable
      }))
      .sort((a, b) => {
        const rank = { critical: 4, high: 3, moderate: 2, low: 1, info: 0 };
        return (rank[b.severity] || 0) - (rank[a.severity] || 0);
      });

    console.log('[AUDIT] SUMMARY', JSON.stringify(audit.metadata?.vulnerabilities || {}));
    for (const row of rows) {
      console.log('[AUDIT]', JSON.stringify(row));
    }
  } catch (e) {
    console.log('[AUDIT] Could not parse npm audit JSON:', e.message);
  }
}
