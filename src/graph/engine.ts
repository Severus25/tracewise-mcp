import {
  Artifact,
  ArtifactType,
  TraceLink,
  LinkType,
  CoverageResult,
  ImpactPath,
  OrphanResult,
} from './types';

/**
 * In-memory traceability graph engine.
 * Stores artifacts (requirements, code, tests, docs) and trace links between them.
 * Provides graph traversal, coverage analysis, and gap detection.
 */
export class TraceabilityGraph {
  private artifacts: Map<string, Artifact> = new Map();
  private links: Map<string, TraceLink> = new Map();
  private forwardIndex: Map<string, Set<string>> = new Map(); // sourceId -> linkIds
  private reverseIndex: Map<string, Set<string>> = new Map(); // targetId -> linkIds

  // --- Mutations ---

  addArtifact(artifact: Artifact): void {
    this.artifacts.set(artifact.id, artifact);
  }

  addLink(link: TraceLink): void {
    this.links.set(link.id, link);
    if (!this.forwardIndex.has(link.sourceId)) this.forwardIndex.set(link.sourceId, new Set());
    if (!this.reverseIndex.has(link.targetId)) this.reverseIndex.set(link.targetId, new Set());
    this.forwardIndex.get(link.sourceId)!.add(link.id);
    this.reverseIndex.get(link.targetId)!.add(link.id);
  }

  // --- Queries ---

  getArtifact(id: string): Artifact | undefined {
    return this.artifacts.get(id);
  }

  getArtifactsByType(type: ArtifactType): Artifact[] {
    return [...this.artifacts.values()].filter(a => a.type === type);
  }

  getLinksFrom(artifactId: string): TraceLink[] {
    const linkIds = this.forwardIndex.get(artifactId);
    if (!linkIds) return [];
    return [...linkIds].map(id => this.links.get(id)!);
  }

  getLinksTo(artifactId: string): TraceLink[] {
    const linkIds = this.reverseIndex.get(artifactId);
    if (!linkIds) return [];
    return [...linkIds].map(id => this.links.get(id)!);
  }

  /** Find all artifacts of a given type that link to/from a source artifact */
  findLinkedArtifacts(sourceId: string, targetType: ArtifactType, linkType?: LinkType): Artifact[] {
    const results: Artifact[] = [];
    const seen = new Set<string>();

    // Check forward links
    for (const link of this.getLinksFrom(sourceId)) {
      if (linkType && link.linkType !== linkType) continue;
      const target = this.artifacts.get(link.targetId);
      if (target && target.type === targetType && !seen.has(target.id)) {
        seen.add(target.id);
        results.push(target);
      }
    }

    // Check reverse links
    for (const link of this.getLinksTo(sourceId)) {
      if (linkType && link.linkType !== linkType) continue;
      const source = this.artifacts.get(link.sourceId);
      if (source && source.type === targetType && !seen.has(source.id)) {
        seen.add(source.id);
        results.push(source);
      }
    }

    return results;
  }

  // --- Analysis Tools ---

  /** Find code artifacts that implement a requirement */
  findRequirementImplementation(requirementId: string): { code: Artifact[]; confidence: number } {
    const code = this.findLinkedArtifacts(requirementId, 'code', 'implements');
    const links = [...this.getLinksTo(requirementId), ...this.getLinksFrom(requirementId)]
      .filter(l => l.linkType === 'implements');
    const confidence = links.length > 0
      ? links.reduce((sum, l) => sum + l.confidence, 0) / links.length
      : 0;
    return { code, confidence };
  }

  /** Find code artifacts with no test links */
  findCodeWithoutTestLink(): OrphanResult[] {
    const codeArtifacts = this.getArtifactsByType('code');
    const orphans: OrphanResult[] = [];

    for (const code of codeArtifacts) {
      const tests = this.findLinkedArtifacts(code.id, 'test', 'validates');
      if (tests.length === 0) {
        orphans.push({ artifact: code, reason: 'No test cases linked to this code artifact' });
      }
    }
    return orphans;
  }

  /** Trace documentation back to code changes */
  traceDocToCodeChange(docId: string): { code: Artifact[]; requirements: Artifact[] } {
    const code = this.findLinkedArtifacts(docId, 'code', 'documents');
    const requirements = this.findLinkedArtifacts(docId, 'requirement', 'documents');
    return { code, requirements };
  }

  /** Find test cases not linked to any requirement or code */
  findOrphanedTests(): OrphanResult[] {
    const tests = this.getArtifactsByType('test');
    const orphans: OrphanResult[] = [];

    for (const test of tests) {
      const codeLinks = this.findLinkedArtifacts(test.id, 'code', 'validates');
      const reqLinks = this.findLinkedArtifacts(test.id, 'requirement', 'validates');
      if (codeLinks.length === 0 && reqLinks.length === 0) {
        orphans.push({ artifact: test, reason: 'Test not linked to any requirement or code' });
      }
    }
    return orphans;
  }

  /** Summarize coverage for a requirement */
  summarizeRequirementCoverage(requirementId: string): CoverageResult {
    const req = this.artifacts.get(requirementId);
    if (!req) throw new Error(`Requirement ${requirementId} not found`);

    const impl = this.findRequirementImplementation(requirementId);
    const tests = this.findLinkedArtifacts(requirementId, 'test', 'validates');
    const docs = this.findLinkedArtifacts(requirementId, 'documentation', 'documents');

    const testLinks = [...this.getLinksTo(requirementId), ...this.getLinksFrom(requirementId)]
      .filter(l => l.linkType === 'validates');
    const docLinks = [...this.getLinksTo(requirementId), ...this.getLinksFrom(requirementId)]
      .filter(l => l.linkType === 'documents');

    const testConfidence = testLinks.length > 0
      ? testLinks.reduce((s, l) => s + l.confidence, 0) / testLinks.length : 0;
    const docConfidence = docLinks.length > 0
      ? docLinks.reduce((s, l) => s + l.confidence, 0) / docLinks.length : 0;

    const gaps: string[] = [];
    if (impl.code.length === 0) gaps.push('No implementation found');
    if (tests.length === 0) gaps.push('No test cases linked');
    if (docs.length === 0) gaps.push('No documentation linked');
    if (impl.confidence < 0.7 && impl.code.length > 0) gaps.push('Low implementation confidence');
    if (testConfidence < 0.7 && tests.length > 0) gaps.push('Low test confidence');

    const scores = [impl.confidence, testConfidence, docConfidence].filter(s => s > 0);
    const overallConfidence = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return {
      requirementId,
      title: req.title,
      implementation: { artifacts: impl.code, confidence: impl.confidence },
      testing: { artifacts: tests, confidence: testConfidence },
      documentation: { artifacts: docs, confidence: docConfidence },
      overallConfidence,
      gaps,
    };
  }

  /** Show impact path — what is affected if a given artifact changes */
  showChangeImpactPath(artifactId: string, maxDepth: number = 3): ImpactPath {
    const source = this.artifacts.get(artifactId);
    if (!source) throw new Error(`Artifact ${artifactId} not found`);

    const impacted: ImpactPath['impactedArtifacts'] = [];
    const visited = new Set<string>();
    visited.add(artifactId);

    const queue: Array<{ id: string; distance: number; confidence: number }> = [
      { id: artifactId, distance: 0, confidence: 1.0 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.distance >= maxDepth) continue;

      const allLinks = [...this.getLinksFrom(current.id), ...this.getLinksTo(current.id)];
      for (const link of allLinks) {
        const neighborId = link.sourceId === current.id ? link.targetId : link.sourceId;
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);

        const neighbor = this.artifacts.get(neighborId);
        if (!neighbor) continue;

        const propagatedConfidence = current.confidence * link.confidence;
        impacted.push({
          artifact: neighbor,
          linkType: link.linkType,
          distance: current.distance + 1,
          confidence: propagatedConfidence,
        });

        queue.push({ id: neighborId, distance: current.distance + 1, confidence: propagatedConfidence });
      }
    }

    return { sourceArtifact: source, impactedArtifacts: impacted };
  }

  // --- Stats ---

  getStats() {
    const types: Record<ArtifactType, number> = { requirement: 0, code: 0, test: 0, documentation: 0 };
    for (const a of this.artifacts.values()) types[a.type]++;
    return {
      totalArtifacts: this.artifacts.size,
      totalLinks: this.links.size,
      byType: types,
    };
  }
}
