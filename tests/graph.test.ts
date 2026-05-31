import { TraceabilityGraph } from '../src/graph/engine';
import { Artifact, TraceLink } from '../src/graph/types';

describe('TraceabilityGraph', () => {
  let graph: TraceabilityGraph;

  beforeEach(() => {
    graph = new TraceabilityGraph();
  });

  const makeArtifact = (id: string, type: Artifact['type']): Artifact => ({
    id, type, title: `${type}-${id}`, description: 'test',
    metadata: { path: `src/${id}.ts` }, createdAt: '', updatedAt: '',
  });

  const makeLink = (id: string, sourceId: string, targetId: string, linkType: TraceLink['linkType'], confidence = 0.9): TraceLink => ({
    id, sourceId, targetId, linkType, confidence, evidence: 'test', createdAt: '',
  });

  describe('addArtifact / getArtifact', () => {
    it('should store and retrieve artifacts', () => {
      const req = makeArtifact('REQ-1', 'requirement');
      graph.addArtifact(req);
      expect(graph.getArtifact('REQ-1')).toEqual(req);
    });

    it('should return undefined for missing artifact', () => {
      expect(graph.getArtifact('MISSING')).toBeUndefined();
    });
  });

  describe('getArtifactsByType', () => {
    it('should filter by type', () => {
      graph.addArtifact(makeArtifact('REQ-1', 'requirement'));
      graph.addArtifact(makeArtifact('CODE-1', 'code'));
      graph.addArtifact(makeArtifact('REQ-2', 'requirement'));

      const reqs = graph.getArtifactsByType('requirement');
      expect(reqs).toHaveLength(2);
      expect(reqs.every(r => r.type === 'requirement')).toBe(true);
    });
  });

  describe('addLink / getLinksFrom / getLinksTo', () => {
    it('should index links bidirectionally', () => {
      graph.addArtifact(makeArtifact('CODE-1', 'code'));
      graph.addArtifact(makeArtifact('REQ-1', 'requirement'));
      graph.addLink(makeLink('L1', 'CODE-1', 'REQ-1', 'implements'));

      expect(graph.getLinksFrom('CODE-1')).toHaveLength(1);
      expect(graph.getLinksTo('REQ-1')).toHaveLength(1);
      expect(graph.getLinksFrom('REQ-1')).toHaveLength(0);
    });
  });

  describe('findRequirementImplementation', () => {
    it('should find code implementing a requirement', () => {
      graph.addArtifact(makeArtifact('REQ-1', 'requirement'));
      graph.addArtifact(makeArtifact('CODE-1', 'code'));
      graph.addArtifact(makeArtifact('CODE-2', 'code'));
      graph.addLink(makeLink('L1', 'CODE-1', 'REQ-1', 'implements', 0.9));
      graph.addLink(makeLink('L2', 'CODE-2', 'REQ-1', 'implements', 0.8));

      const result = graph.findRequirementImplementation('REQ-1');
      expect(result.code).toHaveLength(2);
      expect(result.confidence).toBeCloseTo(0.85, 1);
    });

    it('should return empty for unimplemented requirement', () => {
      graph.addArtifact(makeArtifact('REQ-1', 'requirement'));
      const result = graph.findRequirementImplementation('REQ-1');
      expect(result.code).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });
  });

  describe('findCodeWithoutTestLink', () => {
    it('should identify untested code', () => {
      graph.addArtifact(makeArtifact('CODE-1', 'code'));
      graph.addArtifact(makeArtifact('CODE-2', 'code'));
      graph.addArtifact(makeArtifact('TEST-1', 'test'));
      graph.addLink(makeLink('L1', 'TEST-1', 'CODE-1', 'validates'));

      const orphans = graph.findCodeWithoutTestLink();
      expect(orphans).toHaveLength(1);
      expect(orphans[0].artifact.id).toBe('CODE-2');
    });
  });

  describe('findOrphanedTests', () => {
    it('should find tests with no links', () => {
      graph.addArtifact(makeArtifact('TEST-1', 'test'));
      graph.addArtifact(makeArtifact('TEST-2', 'test'));
      graph.addArtifact(makeArtifact('CODE-1', 'code'));
      graph.addLink(makeLink('L1', 'TEST-1', 'CODE-1', 'validates'));

      const orphans = graph.findOrphanedTests();
      expect(orphans).toHaveLength(1);
      expect(orphans[0].artifact.id).toBe('TEST-2');
    });
  });

  describe('summarizeRequirementCoverage', () => {
    it('should report full coverage with no gaps', () => {
      graph.addArtifact(makeArtifact('REQ-1', 'requirement'));
      graph.addArtifact(makeArtifact('CODE-1', 'code'));
      graph.addArtifact(makeArtifact('TEST-1', 'test'));
      graph.addArtifact(makeArtifact('DOC-1', 'documentation'));
      graph.addLink(makeLink('L1', 'CODE-1', 'REQ-1', 'implements', 0.9));
      graph.addLink(makeLink('L2', 'TEST-1', 'REQ-1', 'validates', 0.9));
      graph.addLink(makeLink('L3', 'DOC-1', 'REQ-1', 'documents', 0.9));

      const coverage = graph.summarizeRequirementCoverage('REQ-1');
      expect(coverage.gaps).toHaveLength(0);
      expect(coverage.overallConfidence).toBeGreaterThan(0.8);
    });

    it('should detect missing tests and docs', () => {
      graph.addArtifact(makeArtifact('REQ-1', 'requirement'));
      graph.addArtifact(makeArtifact('CODE-1', 'code'));
      graph.addLink(makeLink('L1', 'CODE-1', 'REQ-1', 'implements', 0.9));

      const coverage = graph.summarizeRequirementCoverage('REQ-1');
      expect(coverage.gaps).toContain('No test cases linked');
      expect(coverage.gaps).toContain('No documentation linked');
    });

    it('should throw for unknown requirement', () => {
      expect(() => graph.summarizeRequirementCoverage('MISSING')).toThrow();
    });
  });

  describe('showChangeImpactPath', () => {
    it('should find impacted artifacts via BFS', () => {
      graph.addArtifact(makeArtifact('REQ-1', 'requirement'));
      graph.addArtifact(makeArtifact('CODE-1', 'code'));
      graph.addArtifact(makeArtifact('TEST-1', 'test'));
      graph.addLink(makeLink('L1', 'CODE-1', 'REQ-1', 'implements', 0.9));
      graph.addLink(makeLink('L2', 'TEST-1', 'CODE-1', 'validates', 0.8));

      const impact = graph.showChangeImpactPath('REQ-1');
      expect(impact.impactedArtifacts.length).toBeGreaterThanOrEqual(2);
    });

    it('should propagate confidence multiplicatively', () => {
      graph.addArtifact(makeArtifact('A', 'requirement'));
      graph.addArtifact(makeArtifact('B', 'code'));
      graph.addArtifact(makeArtifact('C', 'test'));
      graph.addLink(makeLink('L1', 'B', 'A', 'implements', 0.8));
      graph.addLink(makeLink('L2', 'C', 'B', 'validates', 0.5));

      const impact = graph.showChangeImpactPath('A');
      const cNode = impact.impactedArtifacts.find(i => i.artifact.id === 'C');
      expect(cNode).toBeDefined();
      expect(cNode!.confidence).toBeCloseTo(0.4, 1); // 0.8 * 0.5
    });

    it('should respect maxDepth', () => {
      graph.addArtifact(makeArtifact('A', 'requirement'));
      graph.addArtifact(makeArtifact('B', 'code'));
      graph.addArtifact(makeArtifact('C', 'test'));
      graph.addArtifact(makeArtifact('D', 'documentation'));
      graph.addLink(makeLink('L1', 'B', 'A', 'implements', 0.9));
      graph.addLink(makeLink('L2', 'C', 'B', 'validates', 0.9));
      graph.addLink(makeLink('L3', 'D', 'C', 'documents', 0.9));

      const impact = graph.showChangeImpactPath('A', 1);
      expect(impact.impactedArtifacts.every(i => i.distance <= 1)).toBe(true);
    });

    it('should throw for unknown artifact', () => {
      expect(() => graph.showChangeImpactPath('MISSING')).toThrow();
    });
  });

  describe('getStats', () => {
    it('should return correct counts', () => {
      graph.addArtifact(makeArtifact('REQ-1', 'requirement'));
      graph.addArtifact(makeArtifact('CODE-1', 'code'));
      graph.addLink(makeLink('L1', 'CODE-1', 'REQ-1', 'implements'));

      const stats = graph.getStats();
      expect(stats.totalArtifacts).toBe(2);
      expect(stats.totalLinks).toBe(1);
      expect(stats.byType.requirement).toBe(1);
      expect(stats.byType.code).toBe(1);
    });
  });
});
