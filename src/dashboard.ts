import { TraceabilityGraph } from './graph';
import { loadSampleData } from './data/sample-data';

/**
 * HTTP Dashboard - Visual browser-based demo of the traceability graph.
 * Run with: npm run dashboard
 * Open: http://localhost:3000
 */

const http = require('http');
const graph = new TraceabilityGraph();
loadSampleData(graph);

const PORT = 3000;

function getHTML(): string {
  const stats = graph.getStats();
  const reqs = graph.getArtifactsByType('requirement');
  const untested = graph.findCodeWithoutTestLink();
  const orphans = graph.findOrphanedTests();

  const coverageRows = reqs.map(r => {
    const cov = graph.summarizeRequirementCoverage(r.id);
    const impl = cov.implementation.artifacts.length > 0 ? '✅' : '❌';
    const test = cov.testing.artifacts.length > 0 ? '✅' : '❌';
    const doc = cov.documentation.artifacts.length > 0 ? '✅' : '❌';
    const conf = `${(cov.overallConfidence * 100).toFixed(0)}%`;
    const ready = cov.gaps.length === 0 ? '🟢 Ready' : '🔴 Gaps';
    const gaps = cov.gaps.length > 0 ? cov.gaps.join(', ') : 'None';
    return `<tr>
      <td><strong>${r.id}</strong></td>
      <td>${r.title}</td>
      <td>${impl}</td>
      <td>${test}</td>
      <td>${doc}</td>
      <td>${conf}</td>
      <td>${ready}</td>
      <td><small>${gaps}</small></td>
    </tr>`;
  }).join('\n');

  const untestedRows = untested.map(o => `<tr>
    <td>${o.artifact.id}</td>
    <td>${o.artifact.title}</td>
    <td><code>${o.artifact.metadata.path}</code></td>
  </tr>`).join('\n');

  const orphanRows = orphans.map(o => `<tr>
    <td>${o.artifact.id}</td>
    <td>${o.artifact.title}</td>
    <td>${o.reason}</td>
  </tr>`).join('\n');

  // Impact analysis for REQ-101
  const impact = graph.showChangeImpactPath('REQ-101');
  const impactRows = impact.impactedArtifacts.map(i => `<tr>
    <td>${i.artifact.id}</td>
    <td>${i.artifact.title}</td>
    <td><span class="badge badge-${i.artifact.type}">${i.artifact.type}</span></td>
    <td>${i.distance}</td>
    <td>${(i.confidence * 100).toFixed(0)}%</td>
  </tr>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SDLC Traceability Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #f1f5f9; }
    h2 { font-size: 1.3rem; margin: 2rem 0 1rem; color: #94a3b8; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; }
    .subtitle { color: #64748b; margin-bottom: 2rem; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; text-align: center; }
    .stat-card .number { font-size: 2.5rem; font-weight: bold; color: #38bdf8; }
    .stat-card .label { color: #94a3b8; margin-top: 0.5rem; }
    table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; margin-bottom: 2rem; }
    th { background: #334155; padding: 0.75rem 1rem; text-align: left; font-weight: 600; color: #f1f5f9; }
    td { padding: 0.75rem 1rem; border-top: 1px solid #334155; }
    tr:hover td { background: #263548; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .badge-requirement { background: #7c3aed22; color: #a78bfa; border: 1px solid #7c3aed44; }
    .badge-code { background: #059669 22; color: #6ee7b7; border: 1px solid #05966944; }
    .badge-test { background: #d9770622; color: #fdba74; border: 1px solid #d9770644; }
    .badge-documentation { background: #0284c722; color: #7dd3fc; border: 1px solid #0284c744; }
    .mermaid-container { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 2rem; margin-bottom: 2rem; }
    .health-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
    .health-card { background: #1e293b; border-radius: 8px; padding: 1.5rem; border: 1px solid #334155; }
    .health-card.danger { border-color: #ef444488; }
    .health-card.warning { border-color: #f59e0b88; }
    .health-card.success { border-color: #10b98188; }
    .footer { margin-top: 3rem; text-align: center; color: #475569; font-size: 0.875rem; }
    code { background: #334155; padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>🔗 SDLC Traceability Dashboard</h1>
  <p class="subtitle">Real-time traceability graph connecting requirements → code → tests → documentation</p>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="number">${stats.totalArtifacts}</div>
      <div class="label">Total Artifacts</div>
    </div>
    <div class="stat-card">
      <div class="number">${stats.totalLinks}</div>
      <div class="label">Trace Links</div>
    </div>
    <div class="stat-card">
      <div class="number">${stats.byType.requirement}</div>
      <div class="label">Requirements</div>
    </div>
    <div class="stat-card">
      <div class="number">${reqs.filter(r => graph.summarizeRequirementCoverage(r.id).gaps.length === 0).length}/${reqs.length}</div>
      <div class="label">Release Ready</div>
    </div>
  </div>

  <h2>📊 Requirement Coverage Matrix</h2>
  <table>
    <thead>
      <tr><th>ID</th><th>Requirement</th><th>Code</th><th>Tests</th><th>Docs</th><th>Confidence</th><th>Status</th><th>Gaps</th></tr>
    </thead>
    <tbody>${coverageRows}</tbody>
  </table>

  <h2>🔍 Graph Visualization</h2>
  <div class="mermaid-container">
    <pre class="mermaid">
graph LR
    REQ101[REQ-101: User Auth] --> CODE_AUTH[auth.service.ts]
    REQ101 --> CODE_OAUTH[oauth.handler.ts]
    REQ101 --> TEST_AUTH_U[auth.spec.ts]
    REQ101 --> TEST_AUTH_I[auth.integration.spec.ts]
    REQ101 --> DOC_AUTH[Auth Guide]

    REQ102[REQ-102: RBAC] --> CODE_RBAC[rbac.middleware.ts]
    REQ102 --> TEST_RBAC[rbac.spec.ts]

    REQ103[REQ-103: Audit] --> CODE_AUDIT[audit.logger.ts]

    REQ104[REQ-104: Export] --> CODE_EXPORT[export.controller.ts]
    REQ104 --> TEST_EXPORT[export.spec.ts]
    REQ104 --> DOC_EXPORT[Export API Docs]

    REQ105[REQ-105: Rate Limit] --> CODE_RATE[rate-limiter.ts]

    TEST_ORPHAN[performance.spec.ts]

    style REQ101 fill:#7c3aed,color:#fff
    style REQ102 fill:#7c3aed,color:#fff
    style REQ103 fill:#7c3aed,color:#fff
    style REQ104 fill:#7c3aed,color:#fff
    style REQ105 fill:#7c3aed,color:#fff
    style CODE_AUTH fill:#059669,color:#fff
    style CODE_OAUTH fill:#059669,color:#fff
    style CODE_RBAC fill:#059669,color:#fff
    style CODE_AUDIT fill:#059669,color:#fff
    style CODE_EXPORT fill:#059669,color:#fff
    style CODE_RATE fill:#059669,color:#fff
    style TEST_AUTH_U fill:#d97706,color:#fff
    style TEST_AUTH_I fill:#d97706,color:#fff
    style TEST_RBAC fill:#d97706,color:#fff
    style TEST_EXPORT fill:#d97706,color:#fff
    style TEST_ORPHAN fill:#dc2626,color:#fff
    style DOC_AUTH fill:#0284c7,color:#fff
    style DOC_EXPORT fill:#0284c7,color:#fff
    </pre>
  </div>

  <h2>💥 Change Impact Analysis (if REQ-101 changes)</h2>
  <table>
    <thead><tr><th>ID</th><th>Artifact</th><th>Type</th><th>Distance</th><th>Confidence</th></tr></thead>
    <tbody>${impactRows}</tbody>
  </table>

  <h2>⚠️ Health Issues</h2>
  <div class="health-grid">
    <div class="health-card danger">
      <h3>🔴 Untested Code (${untested.length})</h3>
      <table><thead><tr><th>ID</th><th>File</th><th>Path</th></tr></thead>
      <tbody>${untestedRows}</tbody></table>
    </div>
    <div class="health-card warning">
      <h3>🟡 Orphaned Tests (${orphans.length})</h3>
      <table><thead><tr><th>ID</th><th>File</th><th>Reason</th></tr></thead>
      <tbody>${orphanRows}</tbody></table>
    </div>
  </div>

  <h2>🔌 API Endpoints</h2>
  <table>
    <thead><tr><th>Endpoint</th><th>Description</th><th>Example</th></tr></thead>
    <tbody>
      <tr><td><code>GET /api/coverage/:id</code></td><td>Requirement coverage summary</td><td><a href="/api/coverage/REQ-104" style="color:#38bdf8">/api/coverage/REQ-104</a></td></tr>
      <tr><td><code>GET /api/impact/:id</code></td><td>Change impact analysis</td><td><a href="/api/impact/REQ-101" style="color:#38bdf8">/api/impact/REQ-101</a></td></tr>
      <tr><td><code>GET /api/untested</code></td><td>Code without test links</td><td><a href="/api/untested" style="color:#38bdf8">/api/untested</a></td></tr>
      <tr><td><code>GET /api/orphans</code></td><td>Orphaned tests</td><td><a href="/api/orphans" style="color:#38bdf8">/api/orphans</a></td></tr>
      <tr><td><code>GET /api/stats</code></td><td>Graph statistics</td><td><a href="/api/stats" style="color:#38bdf8">/api/stats</a></td></tr>
      <tr><td><code>GET /api/requirements</code></td><td>All requirements</td><td><a href="/api/requirements" style="color:#38bdf8">/api/requirements</a></td></tr>
      <tr><td><code>GET /api/export</code></td><td>Full audit export (JSON)</td><td><a href="/api/export" style="color:#38bdf8">/api/export</a></td></tr>
      <tr><td><code>GET /api/export?format=csv</code></td><td>Audit export (CSV)</td><td><a href="/api/export?format=csv" style="color:#38bdf8">/api/export?format=csv</a></td></tr>
    </tbody>
  </table>

  <div class="footer">
    <p>SDLC Traceability MCP Server v1.0.0 | Powered by Graph-Based Reasoning</p>
    <p>MCP Protocol compatible — connect any AI agent via stdio</p>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>mermaid.initialize({ startOnLoad: true, theme: 'dark' });</script>
</body>
</html>`;
}

const server = http.createServer((req: any, res: any) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // API Routes
  if (url.pathname === '/api/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(graph.getStats(), null, 2));
    return;
  }

  if (url.pathname === '/api/requirements') {
    const reqs = graph.getArtifactsByType('requirement');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ requirements: reqs, count: reqs.length }, null, 2));
    return;
  }

  if (url.pathname.startsWith('/api/coverage/')) {
    const id = url.pathname.split('/').pop()!;
    try {
      const coverage = graph.summarizeRequirementCoverage(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(coverage, null, 2));
    } catch (e: any) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (url.pathname.startsWith('/api/impact/')) {
    const id = url.pathname.split('/').pop()!;
    try {
      const impact = graph.showChangeImpactPath(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(impact, null, 2));
    } catch (e: any) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (url.pathname === '/api/untested') {
    const orphans = graph.findCodeWithoutTestLink();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ untestedCode: orphans.map(o => o.artifact), count: orphans.length }, null, 2));
    return;
  }

  if (url.pathname === '/api/orphans') {
    const orphans = graph.findOrphanedTests();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ orphanedTests: orphans.map(o => ({ ...o.artifact, reason: o.reason })), count: orphans.length }, null, 2));
    return;
  }

  if (url.pathname === '/api/export') {
    const format = url.searchParams.get('format');
    const reqs = graph.getArtifactsByType('requirement');
    const report = reqs.map(r => {
      const cov = graph.summarizeRequirementCoverage(r.id);
      return {
        requirementId: r.id,
        title: r.title,
        priority: r.metadata.priority,
        jira: r.metadata.jira,
        implemented: cov.implementation.artifacts.length > 0,
        implementationFiles: cov.implementation.artifacts.map(a => a.metadata.path),
        implementationConfidence: cov.implementation.confidence,
        tested: cov.testing.artifacts.length > 0,
        testCases: cov.testing.artifacts.map(a => a.title),
        testConfidence: cov.testing.confidence,
        documented: cov.documentation.artifacts.length > 0,
        documentationRefs: cov.documentation.artifacts.map(a => a.title),
        docConfidence: cov.documentation.confidence,
        overallConfidence: cov.overallConfidence,
        gaps: cov.gaps,
        releaseReady: cov.gaps.length === 0,
      };
    });

    if (format === 'csv') {
      const headers = 'Requirement ID,Title,Priority,Jira,Implemented,Tests,Documented,Confidence,Release Ready,Gaps\n';
      const rows = report.map(r =>
        `${r.requirementId},"${r.title}",${r.priority},${r.jira},${r.implemented},${r.tested},${r.documented},${(r.overallConfidence * 100).toFixed(0)}%,${r.releaseReady},"${r.gaps.join('; ')}"`
      ).join('\n');
      res.writeHead(200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="traceability-audit.csv"',
      });
      res.end(headers + rows);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      exportDate: new Date().toISOString(),
      projectName: 'SDLC Traceability Report',
      summary: {
        totalRequirements: reqs.length,
        releaseReady: report.filter(r => r.releaseReady).length,
        withGaps: report.filter(r => !r.releaseReady).length,
        averageConfidence: (report.reduce((s, r) => s + r.overallConfidence, 0) / report.length * 100).toFixed(0) + '%',
      },
      requirements: report,
    }, null, 2));
    return;
  }

  // Dashboard HTML
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(getHTML());
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║       🚀 SDLC Traceability Dashboard Running!               ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Dashboard:  http://localhost:${PORT}                           ║
║                                                              ║
║  API Endpoints:                                              ║
║    GET /api/stats              Graph statistics               ║
║    GET /api/requirements       All requirements               ║
║    GET /api/coverage/:id       Coverage for requirement       ║
║    GET /api/impact/:id         Change impact analysis         ║
║    GET /api/untested           Code without tests             ║
║    GET /api/orphans            Orphaned tests                 ║
║    GET /api/export             Full audit report (JSON)       ║
║    GET /api/export?format=csv  Audit report (CSV)             ║
║                                                              ║
║  Press Ctrl+C to stop                                        ║
╚══════════════════════════════════════════════════════════════╝
`);
});
