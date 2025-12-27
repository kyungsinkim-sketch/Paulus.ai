/**
 * PAULUS.AI — RESTORE CI-CORE
 * types/ideation.ts
 * 
 * Canonical data model for non-linear thinking layer.
 * Fulfills Spec 2, 3, 4: Data Entities.
 */

export type IdeationNodeType = 'TEXT' | 'IMAGE' | 'LINK';

export type IdeationDecisionStatus = 'IDEA' | 'CANDIDATE' | 'SELECTED' | 'ARCHIVED';

export interface IdeationNodeContent {
  text?: string;
  image_src?: string;
  url?: string;
  title?: string;
}

export interface IdeationNode {
  node_id: string;
  type: IdeationNodeType;
  content: IdeationNodeContent;
  
  // Spatial properties in percentage (0-100)
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };

  style: {
    background_color?: string;
    text_color?: string;
  };

  decision_status: IdeationDecisionStatus;
  created_at: number;
  updated_at: number;
}

export interface IdeationEdge {
  edge_id: string;
  from_node_id: string;
  to_node_id: string;

  style?: {
    stroke_color?: string;
    stroke_style?: 'SOLID' | 'DASHED';
  };

  created_at: number;
}

export interface IdeationDoc {
  ideation_id: string;
  project_id: string;
  created_at: number;
  updated_at: number;

  nodes: IdeationNode[];
  edges: IdeationEdge[];
}
