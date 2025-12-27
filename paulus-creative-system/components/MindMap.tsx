import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MindMapNode, NodeStatus } from '../types';
import { Sparkles, X, Tag, FileText, Type, Info, CheckCircle, Lock, Archive } from 'lucide-react';

interface MindMapProps {
  nodes: MindMapNode[];
  highlightedNodeIds: string[]; // From Deck Selection
  onNodeClick?: (nodeId: string) => void;
  onConnectNodes?: (sourceId: string, targetId: string) => void;
  onGenerateIdeas?: (nodeId: string) => void;
  onUpdateNode?: (nodeId: string, updates: Partial<MindMapNode>) => void;
  onNodeToDeck?: (nodeId: string, targetSlideId: string | 'NEW') => void; // Sync Action
}

const MindMap: React.FC<MindMapProps> = ({ 
    nodes, 
    highlightedNodeIds, 
    onNodeClick, 
    onConnectNodes, 
    onGenerateIdeas, 
    onUpdateNode,
    onNodeToDeck 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Status Helper
  const getStatusColor = (status: NodeStatus) => {
    switch (status) {
        case 'SELECTED': return '#eab308'; // Yellow/Gold
        case 'CANDIDATE': return '#3b82f6'; // Blue
        case 'ARCHIVED': return '#9ca3af'; // Gray
        default: return '#e5e7eb'; // Default Idea
    }
  };

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current || nodes.length === 0) return;

    const width = wrapperRef.current.clientWidth;
    const height = wrapperRef.current.clientHeight;
    const svg = d3.select(svgRef.current);
    
    // Clear previous
    svg.selectAll("*").remove(); 

    // Define Zoom behavior
    const zoomGroup = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            zoomGroup.attr("transform", event.transform);
        });
    svg.call(zoom);

    // Links Data
    const links: { source: string; target: string }[] = [];
    nodes.forEach(node => {
      if (node.children) {
        node.children.forEach(childId => {
          if (nodes.find(n => n.id === childId)) {
            links.push({ source: node.id, target: childId });
          }
        });
      }
    });

    // Simulation Setup
    const simulationNodes = nodes.map(n => ({ ...n }));
    const simulation = d3.forceSimulation(simulationNodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(50));

    // --- Arrow Marker ---
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 28) 
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#cbd5e1");

    // --- Links ---
    const link = zoomGroup.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrowhead)");

    // --- Drag To Connect Line ---
    const dragConnectLine = zoomGroup.append("line")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "5,5")
      .attr("opacity", 0)
      .style("pointer-events", "none");

    // --- Nodes Container ---
    const nodeGroup = zoomGroup.append("g")
      .selectAll("g")
      .data(simulationNodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedNodeId(d.id);
        if (onNodeClick) onNodeClick(d.id);
      });

    // --- Node Visuals ---
    
    // 1. Deck Sync Highlight Halo
    nodeGroup.append("circle")
        .attr("r", 40)
        .attr("fill", "none")
        .attr("stroke", "#22c55e") // Green sync color
        .attr("stroke-width", 3)
        .attr("opacity", d => highlightedNodeIds.includes(d.id) ? 0.6 : 0)
        .attr("class", "sync-halo");

    // 2. Selection Halo
    nodeGroup.append("circle")
        .attr("r", 36)
        .attr("fill", "none")
        .attr("stroke", "#3b82f6")
        .attr("stroke-width", 2)
        .attr("opacity", d => d.id === selectedNodeId ? 1 : 0);

    // 3. Main Circle
    const circles = nodeGroup.append("circle")
      .attr("r", 30)
      .attr("fill", (d) => {
         if (d.status === 'ARCHIVED') return '#f3f4f6';
         switch(d.type) {
            case 'PROBLEM': return '#fee2e2';
            case 'STRATEGY': return '#d1fae5';
            case 'IDEA': return '#dbeafe';
            default: return '#ffffff';
         }
      })
      .attr("stroke", (d) => getStatusColor(d.status))
      .attr("stroke-width", (d) => d.status === 'SELECTED' ? 4 : 2);

    // 4. Status Icon (if selected/locked)
    nodeGroup.filter(d => d.status === 'SELECTED')
        .append("g")
        .attr("transform", "translate(-20, -20)")
        .append("circle")
        .attr("r", 8)
        .attr("fill", "#eab308")
        .append("title").text("Finalized in Deck");

    // 5. Label
    nodeGroup.append("text")
      .text(d => d.label)
      .attr("dy", 5)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "600")
      .style("fill", "#1f2937")
      .style("pointer-events", "none")
      .each(function(d) {
        // Simple wrap logic could go here
        const self = d3.select(this);
        if (d.label.length > 10) {
            self.text(d.label.substring(0, 10) + '...');
        }
      });

    // --- Drag Behaviors ---

    // Behavior 1: Move Node AND Drag to Deck
    const dragNode = d3.drag<SVGGElement, any>()
        .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            // Visual feedback for "Dragging"
            d3.select(event.sourceEvent.target).attr("opacity", 0.7);
        })
        .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
            d3.select(event.sourceEvent.target).attr("opacity", 1);
            
            if (onUpdateNode) {
                onUpdateNode(d.id, { x: d.x, y: d.y });
            }

            // --- CHECK DROP ON DECK RAIL ---
            const clientX = event.sourceEvent.clientX;
            const clientY = event.sourceEvent.clientY;
            
            // Look for deck elements at this position
            // Since D3 captures the event, we use document.elementFromPoint
            const dropTarget = document.elementFromPoint(clientX, clientY);
            const slideElement = dropTarget?.closest('[data-slide-id]');
            
            if (slideElement && onNodeToDeck) {
                const targetSlideId = slideElement.getAttribute('data-slide-id');
                if (targetSlideId) {
                    onNodeToDeck(d.id, targetSlideId);
                }
            }
        });

    nodeGroup.call(dragNode);


    // Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeGroup.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // --- Auto Zoom to Highlighted Nodes ---
    if (highlightedNodeIds.length > 0) {
        const targetNodes = simulationNodes.filter(n => highlightedNodeIds.includes(n.id));
        if (targetNodes.length > 0) {
            const x = d3.mean(targetNodes, n => n.x) || width / 2;
            const y = d3.mean(targetNodes, n => n.y) || height / 2;
            
            // Gentle pan
            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity.translate(width / 2, height / 2).scale(1.2).translate(-x, -y)
            );
        }
    }

  }, [nodes, highlightedNodeIds, onNodeClick, onConnectNodes, selectedNodeId, onUpdateNode, onNodeToDeck]);

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-slate-50">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      />

      <div ref={wrapperRef} className="flex-1 relative">
          <svg ref={svgRef} className="w-full h-full" />
      </div>

      {/* Property Panel */}
      {selectedNode && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col z-20 shadow-xl">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <div className="flex items-center gap-2">
                   <div className={`w-3 h-3 rounded-full ${
                       selectedNode.type === 'PROBLEM' ? 'bg-red-500' :
                       selectedNode.type === 'IDEA' ? 'bg-blue-500' :
                       selectedNode.type === 'STRATEGY' ? 'bg-green-500' : 'bg-yellow-500'
                   }`} />
                   <h3 className="font-semibold text-sm text-gray-800">Properties</h3>
               </div>
               <button onClick={() => setSelectedNodeId(null)} className="text-gray-400 hover:text-gray-600">
                   <X size={16}/>
               </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1">
                <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-2">Status & Decision</label>
                    <div className="grid grid-cols-2 gap-2">
                        {(['IDEA', 'CANDIDATE', 'SELECTED', 'ARCHIVED'] as NodeStatus[]).map(status => (
                            <button
                                key={status}
                                onClick={() => onUpdateNode && onUpdateNode(selectedNode.id, { status })}
                                className={`
                                    px-2 py-2 rounded-md text-xs font-medium border flex items-center justify-center gap-1
                                    ${selectedNode.status === status 
                                        ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-200' 
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }
                                `}
                            >
                                {status === 'SELECTED' && <CheckCircle size={10}/>}
                                {status === 'ARCHIVED' && <Archive size={10}/>}
                                {status}
                            </button>
                        ))}
                    </div>
                    {selectedNode.status === 'SELECTED' && (
                        <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-100 flex items-start gap-2">
                            <Lock size={12} className="mt-0.5 shrink-0"/>
                            This node is finalized and locked to the Deck.
                        </div>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">Label</label>
                    <input
                        type="text"
                        value={selectedNode.label}
                        onChange={(e) => onUpdateNode && onUpdateNode(selectedNode.id, { label: e.target.value })}
                        className="w-full p-2 text-sm border border-gray-200 rounded-md"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">Notes</label>
                    <textarea
                        value={selectedNode.notes || ''}
                        onChange={(e) => onUpdateNode && onUpdateNode(selectedNode.id, { notes: e.target.value })}
                        rows={6}
                        className="w-full p-2 text-sm border border-gray-200 rounded-md"
                        placeholder="Detailed narrative notes..."
                    />
                </div>
            </div>
             <div className="p-4 border-t border-gray-100">
                <button 
                    onClick={() => onGenerateIdeas && onGenerateIdeas(selectedNode.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-sm transition-all"
                >
                    <Sparkles size={16} />
                    Generate AI Ideas
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default MindMap;
