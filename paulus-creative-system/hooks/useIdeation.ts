import { useState, useCallback } from 'react';
import { IdeationDoc, IdeationNode, IdeationEdge } from '../types/ideation';
import { IdeationStore } from '../services/ideationStore';

/**
 * PAULUS.AI — RESTORE CI-CORE
 * hooks/useIdeation.ts
 * 
 * React-level orchestration for the Ideation data model.
 */
export const useIdeation = (initialDoc: IdeationDoc) => {
  const [doc, setDoc] = useState<IdeationDoc>(initialDoc);

  const addNode = useCallback((node: Omit<IdeationNode, 'created_at' | 'updated_at'>) => {
    setDoc(prev => IdeationStore.addNode(prev, node));
  }, []);

  const updateNode = useCallback((nodeId: string, patch: Partial<IdeationNode>) => {
    setDoc(prev => IdeationStore.updateNode(prev, nodeId, patch));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setDoc(prev => IdeationStore.deleteNode(prev, nodeId));
  }, []);

  const addEdge = useCallback((edge: Omit<IdeationEdge, 'created_at'>) => {
    setDoc(prev => IdeationStore.addEdge(prev, edge));
  }, []);

  const deleteEdge = useCallback((edgeId: string) => {
    setDoc(prev => IdeationStore.deleteEdge(prev, edgeId));
  }, []);

  return {
    doc,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    deleteEdge
  };
};
