import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TraceabilityGraph } from './graph';
import { loadSampleData } from './data/sample-data';

const graph = new TraceabilityGraph();
loadSampleData(graph);

const server = new Server(
  { name: 'sdlc-traceability-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// --- Register Tools ---

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'find_requirement_implementation',
      description: 'Find code artifacts that implement a given requirement. Returns linked code files and confidence score.',
      inputSchema: {
        type: 'object' as const,
        properties: { requirementId: { type: 'string', description: 'Requirement ID (e.g., REQ-104)' } },
        required: ['requirementId'],
      },
    },
    {
      name: 'find_code_without_test_link',
      description: 'Find all code artifacts that have no linked test cases. Useful for identifying testing gaps.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'trace_doc_to_code_change',
      description: 'Trace a documentation artifact back to its linked code and requirements.',
      inputSchema: {
        type: 'object' as const,
        properties: { docId: { type: 'string', description: 'Documentation artifact ID' } },
        required: ['docId'],
      },
    },
    {
      name: 'find_orphaned_tests',
      description: 'Find test cases not linked to any requirement or code artifact.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'summarize_requirement_coverage',
      description: 'Summarize implementation, test, and documentation coverage for a requirement. Shows gaps and confidence levels.',
      inputSchema: {
        type: 'object' as const,
        properties: { requirementId: { type: 'string', description: 'Requirement ID (e.g., REQ-104)' } },
        required: ['requirementId'],
      },
    },
    {
      name: 'show_change_impact_path',
      description: 'Show what artifacts would be impacted if a given artifact changes. Performs BFS traversal with confidence propagation.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          artifactId: { type: 'string', description: 'Artifact ID to analyze impact from' },
          maxDepth: { type: 'number', description: 'Max traversal depth (default: 3)' },
        },
        required: ['artifactId'],
      },
    },
    {
      name: 'get_graph_stats',
      description: 'Get overall statistics about the traceability graph (artifact counts, link counts).',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'list_requirements',
      description: 'List all requirements in the traceability graph with their metadata.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'find_requirement_implementation': {
      const { requirementId } = args as { requirementId: string };
      const result = graph.findRequirementImplementation(requirementId);
      const req = graph.getArtifact(requirementId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            requirement: req ? { id: req.id, title: req.title } : null,
            implementations: result.code.map(c => ({
              id: c.id,
              title: c.title,
              path: c.metadata.path,
              description: c.description,
            })),
            confidence: result.confidence,
            count: result.code.length,
          }, null, 2),
        }],
      };
    }

    case 'find_code_without_test_link': {
      const orphans = graph.findCodeWithoutTestLink();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            untestedCode: orphans.map(o => ({
              id: o.artifact.id,
              title: o.artifact.title,
              path: o.artifact.metadata.path,
              reason: o.reason,
            })),
            count: orphans.length,
            recommendation: orphans.length > 0
              ? 'These code artifacts need test coverage. Consider adding unit or integration tests.'
              : 'All code artifacts have linked tests. Great coverage!',
          }, null, 2),
        }],
      };
    }

    case 'trace_doc_to_code_change': {
      const { docId } = args as { docId: string };
      const result = graph.traceDocToCodeChange(docId);
      const doc = graph.getArtifact(docId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            document: doc ? { id: doc.id, title: doc.title } : null,
            linkedCode: result.code.map(c => ({ id: c.id, title: c.title, path: c.metadata.path })),
            linkedRequirements: result.requirements.map(r => ({ id: r.id, title: r.title })),
          }, null, 2),
        }],
      };
    }

    case 'find_orphaned_tests': {
      const orphans = graph.findOrphanedTests();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            orphanedTests: orphans.map(o => ({
              id: o.artifact.id,
              title: o.artifact.title,
              path: o.artifact.metadata.path,
              reason: o.reason,
            })),
            count: orphans.length,
            recommendation: orphans.length > 0
              ? 'These tests should be linked to requirements or code for traceability.'
              : 'All tests are properly linked.',
          }, null, 2),
        }],
      };
    }

    case 'summarize_requirement_coverage': {
      const { requirementId } = args as { requirementId: string };
      const coverage = graph.summarizeRequirementCoverage(requirementId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
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
            gaps: coverage.gaps.length > 0 ? coverage.gaps : ['No gaps detected - fully covered!'],
            releaseReadiness: coverage.gaps.length === 0 ? '🟢 Ready' : coverage.gaps.length <= 1 ? '🟡 Minor gaps' : '🔴 Not ready',
          }, null, 2),
        }],
      };
    }

    case 'show_change_impact_path': {
      const { artifactId, maxDepth } = args as { artifactId: string; maxDepth?: number };
      const impact = graph.showChangeImpactPath(artifactId, maxDepth || 3);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            source: { id: impact.sourceArtifact.id, title: impact.sourceArtifact.title, type: impact.sourceArtifact.type },
            impactedArtifacts: impact.impactedArtifacts.map(i => ({
              id: i.artifact.id,
              title: i.artifact.title,
              type: i.artifact.type,
              relationship: i.linkType,
              distance: i.distance,
              confidence: `${(i.confidence * 100).toFixed(0)}%`,
            })),
            totalImpacted: impact.impactedArtifacts.length,
            summary: `Changing "${impact.sourceArtifact.title}" may impact ${impact.impactedArtifacts.length} artifacts across ${Math.max(...impact.impactedArtifacts.map(i => i.distance), 0)} levels.`,
          }, null, 2),
        }],
      };
    }

    case 'get_graph_stats': {
      const stats = graph.getStats();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            ...stats,
            health: {
              codeWithoutTests: graph.findCodeWithoutTestLink().length,
              orphanedTests: graph.findOrphanedTests().length,
            },
          }, null, 2),
        }],
      };
    }

    case 'list_requirements': {
      const reqs = graph.getArtifactsByType('requirement');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            requirements: reqs.map(r => ({
              id: r.id,
              title: r.title,
              description: r.description,
              priority: r.metadata.priority,
              jira: r.metadata.jira,
            })),
            count: reqs.length,
          }, null, 2),
        }],
      };
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }
});

// --- Start Server ---
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SDLC Traceability MCP Server running on stdio');
}

main().catch(console.error);
