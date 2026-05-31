// Core types for the SDLC Traceability Graph

export type ArtifactType = 'requirement' | 'code' | 'test' | 'documentation';

export type LinkType =
  | 'implements'       // code implements requirement
  | 'validates'        // test validates requirement/code
  | 'documents'        // doc documents requirement/code
  | 'depends_on'       // any artifact depends on another
  | 'derived_from';    // requirement derived from another

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  description: string;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface TraceLink {
  id: string;
  sourceId: string;
  targetId: string;
  linkType: LinkType;
  confidence: number; // 0.0 - 1.0
  evidence: string;   // why this link exists
  createdAt: string;
}

export interface CoverageResult {
  requirementId: string;
  title: string;
  implementation: { artifacts: Artifact[]; confidence: number };
  testing: { artifacts: Artifact[]; confidence: number };
  documentation: { artifacts: Artifact[]; confidence: number };
  overallConfidence: number;
  gaps: string[];
}

export interface ImpactPath {
  sourceArtifact: Artifact;
  impactedArtifacts: Array<{
    artifact: Artifact;
    linkType: LinkType;
    distance: number;
    confidence: number;
  }>;
}

export interface OrphanResult {
  artifact: Artifact;
  reason: string;
}
