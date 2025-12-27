import { IdeationDoc, IdeationNode, IdeationEdge } from '../types/ideation';

/**
 * PAULUS.AI — RESTORE CI-CORE
 * services/ideationStore.ts
 * 
 * Handles atomic mutations for the Ideation layer.
 * Fulfills Spec 7: Persistence & Mutation Rules.
 */
export class IdeationStore {
  /**
   * Creates an empty IdeationDoc for a specific project.
   */
  public static createEmptyDoc(projectId: string): IdeationDoc {
    const now = Date.now();
    return {
      ideation_id: `ideation_${projectId}_${now}`,
      project_id: projectId,
      created_at: now,
      updated_at: now,
      nodes: [],
      edges: []
    };
  }

  /**
   * Adds a node to the document.
   */
  public static addNode(doc: IdeationDoc, node: Omit<IdeationNode, 'created_at' | 'updated_at'>): IdeationDoc {
    const now = Date.now();
    const newNode: IdeationNode = {
      ...node,
      created_at: now,
      updated_at: now
    };
    return {
      ...doc,
      nodes: [...doc.nodes, newNode],
      updated_at: now
    };
  }

  /**
   * Updates an existing node.
   */
  public static updateNode(doc: IdeationDoc, nodeId: string, patch: Partial<IdeationNode>): IdeationDoc {
    const now = Date.now();
    return {
      ...doc,
      nodes: doc.nodes.map(n => n.node_id === nodeId ? { ...n, ...patch, updated_at: now } : n),
      updated_at: now
    };
  }

  /**
   * Deletes a node and all connected edges.
   * Fulfills Spec 7: Deleting a node MUST also delete connected edges.
   */
  public static deleteNode(doc: IdeationDoc, nodeId: string): IdeationDoc {
    const now = Date.now();
    return {
      ...doc,
      nodes: doc.nodes.filter(n => n.node_id !== nodeId),
      edges: doc.edges.filter(e => e.from_node_id !== nodeId && e.to_node_id !== nodeId),
      updated_at: now
    };
  }

  /**
   * Adds an edge (connection) between two nodes.
   */
  public static addEdge(doc: IdeationDoc, edge: Omit<IdeationEdge, 'created_at'>): IdeationDoc {
    const now = Date.now();
    const newEdge: IdeationEdge = {
      ...edge,
      created_at: now
    };
    return {
      ...doc,
      edges: [...doc.edges, newEdge],
      updated_at: now
    };
  }

  /**
   * Deletes an edge.
   */
  public static deleteEdge(doc: IdeationDoc, edgeId: string): IdeationDoc {
    return {
      ...doc,
      edges: doc.edges.filter(e => e.edge_id !== edgeId),
      updated_at: Date.now()
    };
  }
}
