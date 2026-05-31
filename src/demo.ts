import { TraceabilityGraph } from './graph';
import { loadSampleData } from './data/sample-data';

/**
 * Interactive demo script that showcases the MVP capabilities.
 * Run with: npm run demo
 */

const graph = new TraceabilityGraph();
loadSampleData(graph);

function printSection(title: string) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

function printJSON(obj: any) {
  console.log(JSON.stringify(obj, null, 2));
}

// --- Demo ---

printSection('📊 SDLC TRACEABILITY GRAPH - MVP DEMO');
console.log('\nThis demo shows how the MCP server answers traceability questions.');

// 1. Graph Stats
printSection('1. Graph Statistics');
const stats = graph.getStats();
printJSON(stats);

// 2. The main demo question: "Is REQ-104 fully implemented, tested, and documented?"
printSection('2. Requirement Coverage: REQ-104 (Data Export API)');
const coverage104 = graph.summarizeRequirementCoverage('REQ-104');
printJSON({
  requirement: { id: coverage104.requirementId, title: coverage104.title },
  implementation: {
    status: coverage104.implementation.artifacts.length > 0 ? '✅ Implemented' : '❌ Not implemented',
    files: coverage104.implementation.artifacts.map(a => a.metadata.path),
    confidence: `${(coverage104.implementation.confidence * 100).toFixed(0)}%`,
  },
  testing: {
    status: coverage104.testing.artifacts.length > 0 ? '✅ Tested' : '❌ No tests',
    tests: coverage104.testing.artifacts.map(a => a.title),
    confidence: `${(coverage104.testing.confidence * 100).toFixed(0)}%`,
  },
  documentation: {
    status: coverage104.documentation.artifacts.length > 0 ? '✅ Documented' : '❌ No docs',
    docs: coverage104.documentation.artifacts.map(a => a.title),
    confidence: `${(coverage104.documentation.confidence * 100).toFixed(0)}%`,
  },
  overallConfidence: `${(coverage104.overallConfidence * 100).toFixed(0)}%`,
  gaps: coverage104.gaps.length > 0 ? coverage104.gaps : ['None - fully covered!'],
  releaseReadiness: coverage104.gaps.length === 0 ? '🟢 READY' : '🔴 NOT READY',
});

// 3. Show a requirement with gaps
printSection('3. Requirement with Gaps: REQ-105 (Rate Limiting)');
const coverage105 = graph.summarizeRequirementCoverage('REQ-105');
printJSON({
  requirement: { id: coverage105.requirementId, title: coverage105.title },
  implementation: {
    status: '✅ Implemented',
    files: coverage105.implementation.artifacts.map(a => a.metadata.path),
    confidence: `${(coverage105.implementation.confidence * 100).toFixed(0)}%`,
  },
  testing: { status: '❌ No tests', confidence: '0%' },
  documentation: { status: '❌ No docs', confidence: '0%' },
  gaps: coverage105.gaps,
  releaseReadiness: '🔴 NOT READY',
});

// 4. Code without test links
printSection('4. Code Without Test Coverage');
const untested = graph.findCodeWithoutTestLink();
printJSON({
  untestedCode: untested.map(o => ({ id: o.artifact.id, title: o.artifact.title, path: o.artifact.metadata.path })),
  count: untested.length,
});

// 5. Orphaned tests
printSection('5. Orphaned Tests (not linked to requirements or code)');
const orphans = graph.findOrphanedTests();
printJSON({
  orphanedTests: orphans.map(o => ({ id: o.artifact.id, title: o.artifact.title, reason: o.reason })),
  count: orphans.length,
});

// 6. Change Impact Analysis
printSection('6. Change Impact: What breaks if REQ-101 changes?');
const impact = graph.showChangeImpactPath('REQ-101');
printJSON({
  source: impact.sourceArtifact.title,
  impactedArtifacts: impact.impactedArtifacts.map(i => ({
    artifact: i.artifact.title,
    type: i.artifact.type,
    distance: i.distance,
    confidence: `${(i.confidence * 100).toFixed(0)}%`,
  })),
  totalImpacted: impact.impactedArtifacts.length,
});

// 7. All requirements overview
printSection('7. All Requirements - Release Readiness Matrix');
const allReqs = graph.getArtifactsByType('requirement');
const matrix = allReqs.map(r => {
  const cov = graph.summarizeRequirementCoverage(r.id);
  return {
    id: r.id,
    title: r.title,
    implemented: cov.implementation.artifacts.length > 0 ? '✅' : '❌',
    tested: cov.testing.artifacts.length > 0 ? '✅' : '❌',
    documented: cov.documentation.artifacts.length > 0 ? '✅' : '❌',
    confidence: `${(cov.overallConfidence * 100).toFixed(0)}%`,
    ready: cov.gaps.length === 0 ? '🟢' : '🔴',
  };
});
console.log('\n  ID       | Title                      | Impl | Test | Doc  | Conf | Ready');
console.log('  ' + '-'.repeat(85));
for (const r of matrix) {
  console.log(`  ${r.id.padEnd(9)}| ${r.title.padEnd(27)}| ${r.implemented.padEnd(5)}| ${r.tested.padEnd(5)}| ${r.documented.padEnd(5)}| ${r.confidence.padEnd(5)}| ${r.ready}`);
}

printSection('✅ DEMO COMPLETE');
console.log('\nThis MCP server exposes all these capabilities as tools that AI agents can call.');
console.log('Configure it in your MCP client to start asking traceability questions!\n');
