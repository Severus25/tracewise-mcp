import { TraceabilityGraph, Artifact, TraceLink } from '../graph';

/**
 * Loads sample SDLC data simulating a realistic project with
 * requirements, code modules, tests, and documentation.
 */
export function loadSampleData(graph: TraceabilityGraph): void {
  const now = new Date().toISOString();

  // --- Requirements ---
  const requirements: Artifact[] = [
    {
      id: 'REQ-101', type: 'requirement', title: 'User Authentication',
      description: 'System must support email/password and OAuth2 login flows',
      metadata: { priority: 'high', source: 'PRD-v2', jira: 'PROJ-201' },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'REQ-102', type: 'requirement', title: 'Role-Based Access Control',
      description: 'Users must have roles (admin, editor, viewer) with permission guards',
      metadata: { priority: 'high', source: 'PRD-v2', jira: 'PROJ-202' },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'REQ-103', type: 'requirement', title: 'Audit Logging',
      description: 'All sensitive actions must be logged with timestamp, user, and action type',
      metadata: { priority: 'medium', source: 'Compliance-v1', jira: 'PROJ-203' },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'REQ-104', type: 'requirement', title: 'Data Export API',
      description: 'Provide REST endpoint for exporting user data in CSV/JSON format',
      metadata: { priority: 'medium', source: 'PRD-v2', jira: 'PROJ-204' },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'REQ-105', type: 'requirement', title: 'Rate Limiting',
      description: 'API endpoints must enforce rate limits (100 req/min per user)',
      metadata: { priority: 'high', source: 'Security-Review', jira: 'PROJ-205' },
      createdAt: now, updatedAt: now,
    },
  ];

  // --- Code Artifacts ---
  const codeArtifacts: Artifact[] = [
    {
      id: 'CODE-auth-service', type: 'code', title: 'auth.service.ts',
      description: 'Authentication service with login, logout, token refresh',
      metadata: { path: 'src/services/auth.service.ts', language: 'typescript', branch: 'main' },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'CODE-oauth-handler', type: 'code', title: 'oauth.handler.ts',
      description: 'OAuth2 provider integration (Google, GitHub)',
      metadata: { path: 'src/handlers/oauth.handler.ts', language: 'typescript', branch: 'main' },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'CODE-rbac-middleware', type: 'code', title: 'rbac.middleware.ts',
      description: 'Role-based access control middleware for Express routes',
      metadata: { path: 'src/middleware/rbac.middleware.ts', language: 'typescript', branch: 'main' },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'CODE-audit-logger', type: 'code', title: 'audit.logger.ts',
      description: 'Audit logging utility writing to structured log store',
      metadata: { path: 'src/utils/audit.logger.ts', language: 'typescript', branch: 'main' },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'CODE-export-controller', type: 'code', title: 'export.controller.ts',
      description: 'REST controller for data export (CSV/JSON)',
      metadata: { path: 'src/controllers/export.controller.ts', language: 'typescript', branch: 'main' },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'CODE-rate-limiter', type: 'code', title: 'rate-limiter.middleware.ts',
      description: 'Token bucket rate limiting middleware',
      metadata: { path: 'src/middleware/rate-limiter.middleware.ts', language: 'typescript', branch: 'main' },
      createdAt: now, updatedAt: now,
    },
  ];

  // --- Test Artifacts ---
  const testArtifacts: Artifact[] = [
    {
      id: 'TEST-auth-unit', type: 'test', title: 'auth.service.spec.ts',
      description: 'Unit tests for authentication service',
      metadata: { path: 'tests/unit/auth.service.spec.ts', framework: 'jest' },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'TEST-auth-integration', type: 'test', title: 'auth.integration.spec.ts',
      description: 'Integration tests for login/logout flows',
      metadata: { path: 'tests/integration/auth.integration.spec.ts', framework: 'jest' },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'TEST-rbac-unit', type: 'test', title: 'rbac.middleware.spec.ts',
      description: 'Unit tests for RBAC middleware',
      metadata: { path: 'tests/unit/rbac.middleware.spec.ts', framework: 'jest' },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'TEST-export-unit', type: 'test', title: 'export.controller.spec.ts',
      description: 'Unit tests for export controller',
      metadata: { path: 'tests/unit/export.controller.spec.ts', framework: 'jest' },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'TEST-orphan-perf', type: 'test', title: 'performance.spec.ts',
      description: 'Performance benchmark tests (not linked to any requirement)',
      metadata: { path: 'tests/perf/performance.spec.ts', framework: 'jest' },
      createdAt: now, updatedAt: now,
    },
  ];

  // --- Documentation Artifacts ---
  const docArtifacts: Artifact[] = [
    {
      id: 'DOC-auth-guide', type: 'documentation', title: 'Authentication Guide',
      description: 'Developer guide for authentication setup and flows',
      metadata: { path: 'docs/auth-guide.md', format: 'markdown' },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'DOC-api-reference', type: 'documentation', title: 'API Reference',
      description: 'OpenAPI specification and endpoint documentation',
      metadata: { path: 'docs/api-reference.md', format: 'markdown' },
      createdAt: now, updatedAt: now,
    },
    {
      id: 'DOC-export-api', type: 'documentation', title: 'Data Export API Docs',
      description: 'Documentation for the data export REST endpoints',
      metadata: { path: 'docs/export-api.md', format: 'markdown' },
      createdAt: now, updatedAt: now,
    },
  ];

  // --- Load all artifacts ---
  [...requirements, ...codeArtifacts, ...testArtifacts, ...docArtifacts].forEach(a => graph.addArtifact(a));

  // --- Trace Links ---
  const links: TraceLink[] = [
    // REQ-101 (Auth) -> Code
    { id: 'L1', sourceId: 'CODE-auth-service', targetId: 'REQ-101', linkType: 'implements', confidence: 0.95, evidence: 'Direct implementation of login/logout per PRD', createdAt: now },
    { id: 'L2', sourceId: 'CODE-oauth-handler', targetId: 'REQ-101', linkType: 'implements', confidence: 0.90, evidence: 'OAuth2 flow implements REQ-101 OAuth requirement', createdAt: now },
    // REQ-101 -> Tests
    { id: 'L3', sourceId: 'TEST-auth-unit', targetId: 'REQ-101', linkType: 'validates', confidence: 0.90, evidence: 'Unit tests cover auth service logic', createdAt: now },
    { id: 'L4', sourceId: 'TEST-auth-integration', targetId: 'REQ-101', linkType: 'validates', confidence: 0.95, evidence: 'Integration tests cover full login flow', createdAt: now },
    // REQ-101 -> Docs
    { id: 'L5', sourceId: 'DOC-auth-guide', targetId: 'REQ-101', linkType: 'documents', confidence: 0.85, evidence: 'Auth guide covers setup and usage', createdAt: now },

    // REQ-102 (RBAC) -> Code, Tests
    { id: 'L6', sourceId: 'CODE-rbac-middleware', targetId: 'REQ-102', linkType: 'implements', confidence: 0.92, evidence: 'RBAC middleware enforces role checks', createdAt: now },
    { id: 'L7', sourceId: 'TEST-rbac-unit', targetId: 'REQ-102', linkType: 'validates', confidence: 0.88, evidence: 'Tests verify role permission logic', createdAt: now },
    // REQ-102 has NO documentation (gap!)

    // REQ-103 (Audit) -> Code only (no tests, no docs = gaps)
    { id: 'L8', sourceId: 'CODE-audit-logger', targetId: 'REQ-103', linkType: 'implements', confidence: 0.80, evidence: 'Audit logger captures actions', createdAt: now },

    // REQ-104 (Export) -> Code, Tests, Docs (fully covered)
    { id: 'L9', sourceId: 'CODE-export-controller', targetId: 'REQ-104', linkType: 'implements', confidence: 0.93, evidence: 'Export controller handles CSV/JSON endpoints', createdAt: now },
    { id: 'L10', sourceId: 'TEST-export-unit', targetId: 'REQ-104', linkType: 'validates', confidence: 0.90, evidence: 'Unit tests cover export formats', createdAt: now },
    { id: 'L11', sourceId: 'DOC-export-api', targetId: 'REQ-104', linkType: 'documents', confidence: 0.92, evidence: 'Export API fully documented', createdAt: now },

    // REQ-105 (Rate Limiting) -> Code only (no tests = gap, no docs = gap)
    { id: 'L12', sourceId: 'CODE-rate-limiter', targetId: 'REQ-105', linkType: 'implements', confidence: 0.88, evidence: 'Rate limiter middleware implements token bucket', createdAt: now },

    // Code -> Test links
    { id: 'L13', sourceId: 'TEST-auth-unit', targetId: 'CODE-auth-service', linkType: 'validates', confidence: 0.92, evidence: 'Direct unit tests for auth service', createdAt: now },
    { id: 'L14', sourceId: 'TEST-rbac-unit', targetId: 'CODE-rbac-middleware', linkType: 'validates', confidence: 0.90, evidence: 'Direct unit tests for RBAC', createdAt: now },
    { id: 'L15', sourceId: 'TEST-export-unit', targetId: 'CODE-export-controller', linkType: 'validates', confidence: 0.88, evidence: 'Direct unit tests for export', createdAt: now },

    // Doc -> Code links
    { id: 'L16', sourceId: 'DOC-auth-guide', targetId: 'CODE-auth-service', linkType: 'documents', confidence: 0.82, evidence: 'Auth guide references auth service', createdAt: now },
    { id: 'L17', sourceId: 'DOC-export-api', targetId: 'CODE-export-controller', linkType: 'documents', confidence: 0.90, evidence: 'Export docs describe controller endpoints', createdAt: now },
  ];

  links.forEach(l => graph.addLink(l));
}
