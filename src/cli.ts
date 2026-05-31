import * as readline from 'readline';
import { TraceabilityGraph } from './graph';
import { loadSampleData } from './data/sample-data';

const graph = new TraceabilityGraph();
loadSampleData(graph);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function print(obj: any) {
  console.log(JSON.stringify(obj, null, 2));
}

function showMenu() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          SDLC TRACEABILITY MCP — Interactive CLI             ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  1. Find requirement implementation                          ║
║  2. Find code without test links                             ║
║  3. Trace doc to code change                                 ║
║  4. Find orphaned tests                                      ║
║  5. Summarize requirement coverage                           ║
║  6. Show change impact path                                  ║
║  7. Get graph stats                                          ║
║  8. List all requirements                                    ║
║  9. Release readiness matrix                                 ║
║  0. Exit                                                     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);
}

function ask(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

async function run() {
  console.clear();
  console.log('\n🚀 Welcome to SDLC Traceability MCP Interactive CLI\n');
  console.log('This simulates what an AI agent sees when it calls MCP tools.\n');

  while (true) {
    showMenu();
    const choice = await ask('  Select option (0-9): ');

    console.log('\n' + '─'.repeat(60));

    switch (choice.trim()) {
      case '1': {
        console.log('\n📋 Available Requirements:');
        graph.getArtifactsByType('requirement').forEach(r => console.log(`   ${r.id} - ${r.title}`));
        const id = await ask('\n  Enter requirement ID (e.g. REQ-104): ');
        const result = graph.findRequirementImplementation(id.trim());
        const req = graph.getArtifact(id.trim());
        console.log('\n📦 Result:');
        print({
          requirement: req ? { id: req.id, title: req.title } : 'Not found',
          implementations: result.code.map(c => ({
            id: c.id, title: c.title, path: c.metadata.path,
          })),
          confidence: `${(result.confidence * 100).toFixed(0)}%`,
          count: result.code.length,
        });
        break;
      }

      case '2': {
        const orphans = graph.findCodeWithoutTestLink();
        console.log('\n🔍 Code Without Test Coverage:');
        print({
          untestedCode: orphans.map(o => ({
            id: o.artifact.id, title: o.artifact.title,
            path: o.artifact.metadata.path, reason: o.reason,
          })),
          count: orphans.length,
          recommendation: orphans.length > 0
            ? '⚠️  These code artifacts need test coverage!'
            : '✅ All code has linked tests.',
        });
        break;
      }

      case '3': {
        console.log('\n📄 Available Documents:');
        graph.getArtifactsByType('documentation').forEach(d => console.log(`   ${d.id} - ${d.title}`));
        const docId = await ask('\n  Enter document ID (e.g. DOC-auth-guide): ');
        const result = graph.traceDocToCodeChange(docId.trim());
        const doc = graph.getArtifact(docId.trim());
        console.log('\n📦 Result:');
        print({
          document: doc ? { id: doc.id, title: doc.title } : 'Not found',
          linkedCode: result.code.map(c => ({ id: c.id, title: c.title, path: c.metadata.path })),
          linkedRequirements: result.requirements.map(r => ({ id: r.id, title: r.title })),
        });
        break;
      }

      case '4': {
        const orphans = graph.findOrphanedTests();
        console.log('\n🧪 Orphaned Tests:');
        print({
          orphanedTests: orphans.map(o => ({
            id: o.artifact.id, title: o.artifact.title, reason: o.reason,
          })),
          count: orphans.length,
        });
        break;
      }

      case '5': {
        console.log('\n📋 Available Requirements:');
        graph.getArtifactsByType('requirement').forEach(r => console.log(`   ${r.id} - ${r.title}`));
        const reqId = await ask('\n  Enter requirement ID (e.g. REQ-104): ');
        try {
          const coverage = graph.summarizeRequirementCoverage(reqId.trim());
          console.log('\n📊 Coverage Summary:');
          print({
            requirement: { id: coverage.requirementId, title: coverage.title },
            implementation: {
              status: coverage.implementation.artifacts.length > 0 ? '✅ Implemented' : '❌ Not implemented',
              artifacts: coverage.implementation.artifacts.map(a => ({ id: a.id, title: a.title, path: a.metadata.path })),
              confidence: `${(coverage.implementation.confidence * 100).toFixed(0)}%`,
            },
            testing: {
              status: coverage.testing.artifacts.length > 0 ? '✅ Tested' : '❌ No tests',
              artifacts: coverage.testing.artifacts.map(a => ({ id: a.id, title: a.title })),
              confidence: `${(coverage.testing.confidence * 100).toFixed(0)}%`,
            },
            documentation: {
              status: coverage.documentation.artifacts.length > 0 ? '✅ Documented' : '❌ No documentation',
              artifacts: coverage.documentation.artifacts.map(a => ({ id: a.id, title: a.title })),
              confidence: `${(coverage.documentation.confidence * 100).toFixed(0)}%`,
            },
            overallConfidence: `${(coverage.overallConfidence * 100).toFixed(0)}%`,
            gaps: coverage.gaps.length > 0 ? coverage.gaps : ['None - fully covered!'],
            releaseReadiness: coverage.gaps.length === 0 ? '🟢 Ready' : coverage.gaps.length <= 1 ? '🟡 Minor gaps' : '🔴 Not ready',
          });
        } catch (e: any) {
          console.log(`\n❌ Error: ${e.message}`);
        }
        break;
      }

      case '6': {
        console.log('\n📋 All Artifacts:');
        const allTypes = ['requirement', 'code', 'test', 'documentation'] as const;
        for (const type of allTypes) {
          const artifacts = graph.getArtifactsByType(type);
          console.log(`\n  ${type.toUpperCase()}:`);
          artifacts.forEach(a => console.log(`    ${a.id} - ${a.title}`));
        }
        const artId = await ask('\n  Enter artifact ID (e.g. REQ-101): ');
        try {
          const impact = graph.showChangeImpactPath(artId.trim());
          console.log('\n💥 Change Impact:');
          print({
            source: { id: impact.sourceArtifact.id, title: impact.sourceArtifact.title, type: impact.sourceArtifact.type },
            impactedArtifacts: impact.impactedArtifacts.map(i => ({
              id: i.artifact.id, title: i.artifact.title, type: i.artifact.type,
              relationship: i.linkType, distance: i.distance,
              confidence: `${(i.confidence * 100).toFixed(0)}%`,
            })),
            totalImpacted: impact.impactedArtifacts.length,
            summary: `Changing "${impact.sourceArtifact.title}" may impact ${impact.impactedArtifacts.length} artifact(s).`,
          });
        } catch (e: any) {
          console.log(`\n❌ Error: ${e.message}`);
        }
        break;
      }

      case '7': {
        const stats = graph.getStats();
        console.log('\n📊 Graph Statistics:');
        print({
          ...stats,
          health: {
            codeWithoutTests: graph.findCodeWithoutTestLink().length,
            orphanedTests: graph.findOrphanedTests().length,
          },
        });
        break;
      }

      case '8': {
        const reqs = graph.getArtifactsByType('requirement');
        console.log('\n📋 All Requirements:');
        print({
          requirements: reqs.map(r => ({
            id: r.id, title: r.title, description: r.description,
            priority: r.metadata.priority, jira: r.metadata.jira,
          })),
          count: reqs.length,
        });
        break;
      }

      case '9': {
        const allReqs = graph.getArtifactsByType('requirement');
        console.log('\n🏁 Release Readiness Matrix:\n');
        console.log('  ID       │ Title                      │ Impl │ Test │ Doc  │ Conf │ Ready');
        console.log('  ' + '─'.repeat(82));
        for (const r of allReqs) {
          const cov = graph.summarizeRequirementCoverage(r.id);
          const impl = cov.implementation.artifacts.length > 0 ? '✅' : '❌';
          const test = cov.testing.artifacts.length > 0 ? '✅' : '❌';
          const doc = cov.documentation.artifacts.length > 0 ? '✅' : '❌';
          const conf = `${(cov.overallConfidence * 100).toFixed(0)}%`;
          const ready = cov.gaps.length === 0 ? '🟢' : '🔴';
          console.log(`  ${r.id.padEnd(9)}│ ${r.title.padEnd(27)}│ ${impl.padEnd(5)}│ ${test.padEnd(5)}│ ${doc.padEnd(5)}│ ${conf.padEnd(5)}│ ${ready}`);
        }
        console.log();
        break;
      }

      case '0': {
        console.log('\n👋 Goodbye!\n');
        rl.close();
        return;
      }

      default:
        console.log('\n❌ Invalid option. Please enter 0-9.');
    }

    await ask('\n  Press Enter to continue...');
  }
}

run().catch(console.error);
