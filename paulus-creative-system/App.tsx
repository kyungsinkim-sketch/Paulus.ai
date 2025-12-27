import React from 'react';
import WorkspaceRoot from './workspace/WorkspaceRoot';

/**
 * App.tsx — PAULUS Creative System
 * Pure mount point following Deck-centric architecture.
 * Delegates all view-state orchestration to WorkspaceRoot.
 */
const App: React.FC = () => {
  return <WorkspaceRoot />;
};

export default App;