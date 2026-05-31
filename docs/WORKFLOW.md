# SDLC Traceability MCP — Complete Workflow

## System Interfaces Overview

The project exposes **four distinct interfaces** on top of the same traceability graph engine:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        FOUR ENTRY POINTS                                   │
│                                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  MCP Server │  │ HTTP        │  │ Interactive │  │ Demo Script     │  │
│  │  (stdio)    │  │ Dashboard   │  │ CLI         │  │ (automated)     │  │
│  │  npm start  │  │ :3000       │  │ npm run cli │  │ npm run demo    │  │
│  │             │  │ npm run     │  │             │  │                 │  │
│  │  AI Agents  │  │ dashboard   │  │ Developers  │  │ Presentations   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └───────┬─────────┘  │
│         └────────────────┴────────────────┴──────────────────┘            │
│                                    │                                       │
│                       TraceabilityGraph Engine                             │
│                          (src/graph/engine.ts)                             │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Interface 1: MCP Server (AI Agent Workflow)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         USER / AI AGENT                                    │
│  "Is REQ-104 fully implemented, tested, and documented?"                  │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │ MCP Tool Call
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      MCP SERVER (src/index.ts)                             │
│                                                                            │
│  1. Receives tool call: summarize_requirement_coverage("REQ-104")          │
│  2. Routes to graph engine                                                 │
│  3. Formats response with gaps, confidence, readiness                      │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │ Graph Query
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                 TRACEABILITY GRAPH ENGINE (src/graph/engine.ts)            │
│                                                                            │
│  1. Looks up REQ-104 node in artifact store                                │
│  2. Traverses forward/reverse indexes for linked artifacts                 │
│  3. Filters by link type (implements, validates, documents)                │
│  4. Calculates confidence scores from link weights                         │
│  5. Detects gaps (missing test/doc/code links)                             │
│  6. Returns structured CoverageResult                                      │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │ Result
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         RESPONSE TO USER                                   │
│                                                                            │
│  {                                                                         │
│    "requirement": "REQ-104 - Data Export API",                             │
│    "implementation": "✅ export.controller.ts (93% confidence)",           │
│    "testing": "✅ export.controller.spec.ts (90% confidence)",             │
│    "documentation": "✅ Data Export API Docs (92% confidence)",            │
│    "overall_confidence": "92%",                                            │
│    "release_readiness": "🟢 Ready"                                        │
│  }                                                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Workflow

### Phase 1: Data Ingestion (Graph Construction)

```
Source Systems                    Graph Engine
─────────────────                ─────────────────
Jira/Requirements ──┐
                    ├──→ addArtifact() ──→ [Artifact Nodes]
Git Commits/PRs ────┤
                    ├──→ addLink()     ──→ [Trace Links with Confidence]
Test Results ───────┤
                    │
Documentation ──────┘
```

In the MVP, sample data simulates this. In production, connectors would pull from:
- **Jira/Azure DevOps** → Requirements
- **GitHub/GitLab** → Code changes (commits, PRs)
- **Jest/Pytest/JUnit** → Test results
- **Confluence/Markdown** → Documentation

### Phase 2: Graph Storage (In-Memory)

```
Artifacts Map                    Link Indexes
─────────────                    ────────────
REQ-101 ─────────────┐
REQ-102              │          Forward Index (source → links):
REQ-103              │          CODE-auth-service → [L1, L13, L16]
REQ-104              │
REQ-105              │          Reverse Index (target → links):
CODE-auth-service    ├────→     REQ-101 → [L1, L2, L3, L4, L5]
CODE-oauth-handler   │
CODE-rbac-middleware │
CODE-audit-logger    │
CODE-export-ctrl     │
CODE-rate-limiter    │
TEST-auth-unit       │
TEST-auth-integ      │
TEST-rbac-unit       │
TEST-export-unit     │
TEST-orphan-perf     │
DOC-auth-guide       │
DOC-api-reference    │
DOC-export-api ──────┘
```

### Phase 3: Query Processing (Tool Execution)

When an AI agent calls a tool, the engine:

1. **Locates the source artifact** in O(1) via HashMap
2. **Traverses indexes** to find connected nodes
3. **Filters by link type** and artifact type
4. **Calculates confidence** (average of link scores)
5. **Detects gaps** (expected links that don't exist)
6. **Returns structured JSON** with actionable insights

### Phase 4: Insight Delivery

The MCP server returns rich, structured responses that AI agents can:
- Present directly to users
- Use for further reasoning
- Aggregate into dashboards
- Export for audit/compliance

---

## Tool Workflow Matrix

| Tool | Input | Graph Operation | Output |
|------|-------|----------------|--------|
| `find_requirement_implementation` | Requirement ID | Forward traverse (implements) | Code files + confidence |
| `find_code_without_test_link` | None | Full scan + filter | Untested code list |
| `trace_doc_to_code_change` | Doc ID | Reverse traverse (documents) | Code + requirements |
| `find_orphaned_tests` | None | Full scan + filter | Unlinked tests |
| `summarize_requirement_coverage` | Requirement ID | Multi-type traverse | Full coverage report |
| `show_change_impact_path` | Any artifact ID | BFS traversal | Impact tree + confidence |
| `get_graph_stats` | None | Aggregate counts | Health metrics |
| `list_requirements` | None | Type filter | All requirements |

---

## Data Flow Diagram

```
┌─────────┐     ┌──────────┐     ┌─────────┐     ┌──────────────┐
│  Ingest │────→│  Store   │────→│  Query  │────→│   Respond    │
│         │     │          │     │         │     │              │
│ Parse   │     │ Artifacts│     │ Traverse│     │ Format JSON  │
│ Validate│     │ Links    │     │ Filter  │     │ Detect Gaps  │
│ Score   │     │ Indexes  │     │ Score   │     │ Confidence % │
└─────────┘     └──────────┘     └─────────┘     └──────────────┘
```

---

## Confidence Scoring Algorithm

Each trace link carries a confidence score (0.0 to 1.0):

```
Confidence Factors:
├── Direct evidence (code comment references requirement)  → 0.9-1.0
├── Commit message mentions requirement ID                 → 0.8-0.9
├── File path/naming convention match                      → 0.7-0.8
├── AI-inferred relationship                               → 0.5-0.7
└── Manual/unverified link                                 → 0.3-0.5

Impact Propagation:
  If REQ-101 → CODE-auth (0.95) → TEST-auth (0.92)
  Then REQ-101 → TEST-auth propagated confidence = 0.95 × 0.92 = 0.874
```

---

## Release Readiness Logic

```
For each requirement:
  IF (has implementation) AND (has tests) AND (has docs):
    IF all confidences > 0.7:  → 🟢 READY
    ELSE:                      → 🟡 MINOR GAPS
  ELSE:
    → 🔴 NOT READY (list missing artifacts)
```

---

## Interface 2: HTTP Dashboard Workflow

```
Browser / CI System                  dashboard.ts (HTTP Server :3000)
───────────────────                  ────────────────────────────────
GET /                    ──────────→ Render full HTML dashboard
                                       • Coverage matrix table
                                       • Mermaid graph visualization
                                       • Health issues (untested/orphans)
                                       • Impact analysis (REQ-101)
                                       • API link list

GET /api/coverage/REQ-104 ─────────→ graph.summarizeRequirementCoverage()
                         ←─────────  { implementation, testing, docs, gaps, confidence }

GET /api/impact/REQ-101  ──────────→ graph.showChangeImpactPath()
                         ←─────────  { source, impactedArtifacts[], totalImpacted }

GET /api/export          ──────────→ Generate full audit JSON
                         ←─────────  { exportDate, summary, requirements[] }

GET /api/export?format=csv ────────→ Generate compliance CSV
                         ←─────────  CSV download (Content-Disposition: attachment)
```

### Dashboard REST API — Complete Endpoint Reference

| Endpoint | Method | Response Type | Description |
|----------|--------|--------------|-------------|
| `/` | GET | HTML | Full interactive dashboard |
| `/api/stats` | GET | JSON | Graph health: artifact counts, link counts, untested/orphan counts |
| `/api/requirements` | GET | JSON | All requirements with priority and Jira IDs |
| `/api/coverage/:id` | GET | JSON | Coverage for one requirement (impl + test + doc + gaps) |
| `/api/impact/:id` | GET | JSON | BFS impact tree from any artifact ID |
| `/api/untested` | GET | JSON | Code artifacts with no linked tests |
| `/api/orphans` | GET | JSON | Tests not linked to requirements or code |
| `/api/export` | GET | JSON | Full compliance audit report |
| `/api/export?format=csv` | GET | CSV | Downloadable compliance audit file |

---

## Interface 3: Interactive CLI Workflow

```
Developer Terminal                   cli.ts
──────────────────                   ──────
npm run cli           ──────────────→ Show numbered menu (1-9)

Select: 5             ──────────────→ "Summarize requirement coverage"
                                     → Show available requirements
Enter: REQ-104        ──────────────→ graph.summarizeRequirementCoverage("REQ-104")
                      ←────────────  Pretty-printed JSON with ✅/❌ status

Select: 6             ──────────────→ "Show change impact path"
                                     → Show all artifacts by type
Enter: REQ-101        ──────────────→ graph.showChangeImpactPath("REQ-101")
                      ←────────────  Impact tree with distances and confidence

Select: 9             ──────────────→ Release readiness matrix
                      ←────────────  ASCII table: ID | Title | Impl | Test | Doc | Conf | Ready

Select: 0             ──────────────→ Exit
```

### CLI Menu Reference

| Option | Tool Invoked | Input Required |
|--------|-------------|---------------|
| 1 | `find_requirement_implementation` | Requirement ID |
| 2 | `find_code_without_test_link` | None |
| 3 | `trace_doc_to_code_change` | Document ID |
| 4 | `find_orphaned_tests` | None |
| 5 | `summarize_requirement_coverage` | Requirement ID |
| 6 | `show_change_impact_path` | Any artifact ID |
| 7 | `get_graph_stats` | None |
| 8 | `list_requirements` | None |
| 9 | Release readiness matrix | None |
| 0 | Exit | — |

---

## Interface 4: Demo Script Workflow

```
npm run demo
  │
  ├── Section 1: Graph Statistics (artifact + link counts)
  ├── Section 2: REQ-104 coverage (fully covered — 🟢)
  ├── Section 3: REQ-105 coverage (2 gaps — 🔴)
  ├── Section 4: Code without test coverage (3 files)
  ├── Section 5: Orphaned tests (1 test)
  ├── Section 6: Change impact — REQ-101 (5 impacted artifacts)
  └── Section 7: Release readiness matrix (all 5 requirements)
```

Designed for presentations and GitHub README showcasing. Outputs everything to stdout, no interaction required.

---

## Audit/Export Workflow

```
Compliance Officer / Manager
          │
          ▼
GET /api/export?format=csv
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│  For each requirement:                                    │
│    1. graph.summarizeRequirementCoverage(id)             │
│    2. Extract: code files, tests, docs, confidence, gaps │
│    3. releaseReady = gaps.length === 0                   │
│  Serialize as CSV row                                    │
└─────────────────────────────────────────────────────────┘
          │
          ▼
  CSV with columns:
  Requirement ID | Title | Priority | Jira | Implemented |
  Tests | Documented | Confidence | Release Ready | Gaps
```

Example output row:
```
REQ-104,"Data Export API",medium,PROJ-204,true,true,true,92%,true,""
REQ-105,"Rate Limiting",high,PROJ-205,true,false,false,88%,false,"No test cases linked; No documentation linked"
```

