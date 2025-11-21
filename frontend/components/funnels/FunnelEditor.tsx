"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Button, Card, CardBody, Spinner } from "@heroui/react";
import type { Funnel, FunnelNode, FunnelEdge, NodeType } from "@/types/funnel";
import {
  addFunnelNode,
  updateFunnelNode,
  deleteFunnelNode,
  addFunnelEdge,
  deleteFunnelEdge,
} from "@/lib/api/funnels";
import { getNodeTypeLabel } from "@/types/funnel";
import nodeTypes from "./nodeTypes";
import NodeConfigPanel from "./NodeConfigPanel";
import useUndo from "use-undo";
import dagre from "dagre";
import {
  Undo2,
  Redo2,
  Download,
  Upload,
  Copy,
  Clipboard,
  Network
} from "lucide-react";

// Import ReactFlow hooks and utilities
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type NodeMouseHandler,
  type IsValidConnection,
} from "reactflow";

// Import ReactFlow styles
import "reactflow/dist/style.css";

// Dynamically import ReactFlow components to avoid SSR issues
const ReactFlow = dynamic(
  () => import("reactflow").then((mod) => mod.default),
  { ssr: false }
);

const Background = dynamic(
  () => import("reactflow").then((mod) => mod.Background),
  { ssr: false }
);

const Controls = dynamic(
  () => import("reactflow").then((mod) => mod.Controls),
  { ssr: false }
);

const MiniMap = dynamic(
  () => import("reactflow").then((mod) => mod.MiniMap),
  { ssr: false }
);

interface FunnelEditorProps {
  funnel: Funnel;
  onFunnelUpdated: () => void;
}

const NODE_TYPES: NodeType[] = [
  "delay",
  "call",
  "email",
  "sms",
  "webhook",
  "condition",
  "end",
];

// Auto-layout function using Dagre
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 172;
  const nodeHeight = 80;

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 100,
    ranksep: 100,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * Inner component that uses React Flow hooks
 * Must be wrapped with ReactFlowProvider
 */
function FunnelEditorInner({
  funnel,
  onFunnelUpdated,
}: FunnelEditorProps) {
  const reactFlowInstance = useReactFlow();

  // Use React Flow's state hooks
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Undo/Redo state
  const [
    historyState,
    {
      set: setHistory,
      undo,
      redo,
      canUndo,
      canRedo,
    },
  ] = useUndo({ nodes: [], edges: [] });

  // Clipboard state
  const [clipboard, setClipboard] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);

  // Track if we're syncing from server to avoid feedback loops
  const isSyncingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert backend FunnelNode to ReactFlow Node
  const convertToReactFlowNodes = useCallback((funnelNodes: FunnelNode[]): Node[] => {
    return funnelNodes.map((node) => ({
      id: node.id,
      type: node.node_type,
      position: node.position || { x: 0, y: 0 },
      data: {
        label: node.label,
        config: node.config,
        node_type: node.node_type,
      },
    }));
  }, []);

  // Convert backend FunnelEdge to ReactFlow Edge
  const convertToReactFlowEdges = useCallback((funnelEdges: FunnelEdge[]): Edge[] => {
    return funnelEdges.map((edge) => ({
      id: edge.id,
      source: edge.source_node_id,
      target: edge.target_node_id,
      label: edge.label || undefined,
      data: {
        condition: edge.condition,
      },
    }));
  }, []);

  // Sync nodes and edges from funnel data when it changes
  useEffect(() => {
    isSyncingRef.current = true;

    if (funnel.nodes) {
      const newNodes = convertToReactFlowNodes(funnel.nodes);
      setNodes(newNodes);

      if (funnel.edges) {
        const newEdges = convertToReactFlowEdges(funnel.edges);
        setEdges(newEdges);

        // Update history
        setHistory({ nodes: newNodes, edges: newEdges });
      }
    }

    // Reset sync flag after a tick
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 0);
  }, [funnel.nodes, funnel.edges, convertToReactFlowNodes, convertToReactFlowEdges, setNodes, setEdges, setHistory]);

  // Update history when nodes or edges change (for undo/redo)
  // Only update on deliberate user actions, not during sync
  const updateHistory = useCallback(() => {
    if (!isSyncingRef.current && (nodes.length > 0 || edges.length > 0)) {
      setHistory({ nodes, edges });
    }
  }, [nodes, edges, setHistory]);

  // Custom undo handler that manually applies changes
  const handleUndo = useCallback(() => {
    if (!canUndo) return;

    isSyncingRef.current = true;
    undo();

    // Wait for undo to complete, then apply the changes
    setTimeout(() => {
      if (historyState.past.length > 0) {
        const previousState = historyState.past[historyState.past.length - 1];
        setNodes(previousState.nodes);
        setEdges(previousState.edges);
      }
      isSyncingRef.current = false;
    }, 0);
  }, [canUndo, undo, historyState.past, setNodes, setEdges]);

  // Custom redo handler that manually applies changes
  const handleRedo = useCallback(() => {
    if (!canRedo) return;

    isSyncingRef.current = true;
    redo();

    // Wait for redo to complete, then apply the changes
    setTimeout(() => {
      if (historyState.future.length > 0) {
        const nextState = historyState.future[0];
        setNodes(nextState.nodes);
        setEdges(nextState.edges);
      }
      isSyncingRef.current = false;
    }, 0);
  }, [canRedo, redo, historyState.future, setNodes, setEdges]);

  // Save node position to backend when dragging ends (debounced)
  useEffect(() => {
    if (isSyncingRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      for (const node of nodes) {
        const funnelNode = funnel.nodes?.find((n) => n.id === node.id);
        if (funnelNode &&
            (funnelNode.position?.x !== node.position.x ||
             funnelNode.position?.y !== node.position.y)) {
          try {
            await updateFunnelNode(funnel.id, node.id, {
              position_x: node.position.x,
              position_y: node.position.y,
            });
          } catch (err) {
            console.error("Failed to save node position:", err);
            setError("Failed to save node position");
          }
        }
      }

      // Update history after save completes
      updateHistory();
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, funnel.id, funnel.nodes, updateHistory]);

  // Validate connections: prevent self-loops and duplicate edges
  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      if (connection.source === connection.target) {
        return false;
      }

      const existingEdge = edges.find(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target
      );

      return !existingEdge;
    },
    [edges]
  );

  // Handle new connections
  const onConnect: OnConnect = useCallback(
    async (connection: Connection) => {
      console.log("🔗 Connection attempt:", connection);

      if (!connection.source || !connection.target) {
        console.error("❌ Connection missing source or target");
        setError("Connection failed: missing source or target");
        return;
      }

      if (!isValidConnection(connection)) {
        console.warn("⚠️ Invalid connection:", connection);
        setError("Invalid connection: cannot create duplicate or self-referencing edges");
        return;
      }

      try {
        setError(null);
        console.log("📡 Creating edge via API...", {
          funnel_id: funnel.id,
          source: connection.source,
          target: connection.target,
        });

        const result = await addFunnelEdge(funnel.id, {
          source_node_id: connection.source,
          target_node_id: connection.target,
        });

        console.log("✅ Edge created successfully:", result.edge_id);

        setEdges((eds) =>
          addEdge(
            {
              id: result.edge_id,
              source: connection.source!,
              target: connection.target!,
            },
            eds
          )
        );

        onFunnelUpdated();

        // Update history after adding edge
        setTimeout(() => updateHistory(), 0);

        console.log("✅ Connection completed successfully");
      } catch (err: any) {
        console.error("❌ Failed to create edge:", err);
        const errorMsg = err?.message || "Failed to create connection";
        setError(`Connection failed: ${errorMsg}`);
      }
    },
    [funnel.id, isValidConnection, setEdges, onFunnelUpdated, updateHistory]
  );

  // Add a new node
  const handleAddNode = async (nodeType: NodeType) => {
    setIsSaving(true);
    setError(null);

    try {
      const viewport = reactFlowInstance.getViewport();
      const newPosition = {
        x: -viewport.x / viewport.zoom + 250 + nodes.length * 20,
        y: -viewport.y / viewport.zoom + 100 + nodes.length * 20,
      };

      const result = await addFunnelNode(funnel.id, {
        node_type: nodeType,
        label: getNodeTypeLabel(nodeType),
        config: getDefaultConfigForNodeType(nodeType),
        position_x: newPosition.x,
        position_y: newPosition.y,
      });

      const newNode: Node = {
        id: result.node_id,
        type: nodeType,
        position: newPosition,
        data: {
          label: getNodeTypeLabel(nodeType),
          config: getDefaultConfigForNodeType(nodeType),
          node_type: nodeType,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      await onFunnelUpdated();

      // Update history after adding node
      setTimeout(() => updateHistory(), 0);
    } catch (err) {
      console.error("Failed to add node:", err);
      setError("Failed to add node");
    } finally {
      setIsSaving(false);
    }
  };

  // Update selected node config
  const handleUpdateNodeConfig = async (nodeId: string, newConfig: any) => {
    setIsSaving(true);
    setError(null);

    try {
      await updateFunnelNode(funnel.id, nodeId, {
        config: newConfig,
      });

      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, config: newConfig } }
            : node
        )
      );

      onFunnelUpdated();
    } catch (err) {
      console.error("Failed to update node config:", err);
      setError("Failed to update node configuration");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle node click for selection
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Handle pane click to deselect
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Handle node deletion
  const handleNodesDelete = useCallback(
    async (nodesToDelete: Node[]) => {
      setError(null);
      for (const node of nodesToDelete) {
        try {
          await deleteFunnelNode(funnel.id, node.id);
        } catch (err) {
          console.error("Failed to delete node:", err);
          setError("Failed to delete node");
        }
      }
      onFunnelUpdated();

      // Update history after deleting nodes
      setTimeout(() => updateHistory(), 0);
    },
    [funnel.id, onFunnelUpdated, updateHistory]
  );

  // Handle edge deletion
  const handleEdgesDelete = useCallback(
    async (edgesToDelete: Edge[]) => {
      setError(null);
      for (const edge of edgesToDelete) {
        try {
          await deleteFunnelEdge(funnel.id, edge.id);
        } catch (err) {
          console.error("Failed to delete edge:", err);
          setError("Failed to delete connection");
        }
      }
      onFunnelUpdated();

      // Update history after deleting edges
      setTimeout(() => updateHistory(), 0);
    },
    [funnel.id, onFunnelUpdated, updateHistory]
  );

  // Copy selected nodes
  const handleCopy = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;

    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
    const selectedEdges = edges.filter((e) => {
      return selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target);
    });

    setClipboard({ nodes: selectedNodes, edges: selectedEdges });
    setError(null);
  }, [nodes, edges]);

  // Paste nodes
  const handlePaste = useCallback(async () => {
    if (!clipboard || clipboard.nodes.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      const idMap = new Map<string, string>();
      const newNodes: Node[] = [];

      // Create new nodes with offset positions
      for (const node of clipboard.nodes) {
        const result = await addFunnelNode(funnel.id, {
          node_type: node.type as NodeType,
          label: node.data.label,
          config: node.data.config,
          position_x: node.position.x + 50,
          position_y: node.position.y + 50,
        });

        idMap.set(node.id, result.node_id);

        newNodes.push({
          ...node,
          id: result.node_id,
          position: { x: node.position.x + 50, y: node.position.y + 50 },
          selected: false,
        });
      }

      // Create edges between pasted nodes
      for (const edge of clipboard.edges) {
        const newSource = idMap.get(edge.source);
        const newTarget = idMap.get(edge.target);

        if (newSource && newTarget) {
          await addFunnelEdge(funnel.id, {
            source_node_id: newSource,
            target_node_id: newTarget,
          });
        }
      }

      await onFunnelUpdated();
    } catch (err) {
      console.error("Failed to paste nodes:", err);
      setError("Failed to paste nodes");
    } finally {
      setIsSaving(false);
    }
  }, [clipboard, funnel.id, onFunnelUpdated]);

  // Export to JSON
  const handleExport = useCallback(() => {
    const flow = reactFlowInstance.toObject();
    const exportData = {
      funnel: {
        id: funnel.id,
        name: funnel.name,
        description: funnel.description,
      },
      flow,
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `funnel-${funnel.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
    setError(null);
  }, [reactFlowInstance, funnel]);

  // Import from JSON
  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.flow && data.flow.nodes && data.flow.edges) {
        setNodes(data.flow.nodes);
        setEdges(data.flow.edges);
        if (data.flow.viewport) {
          reactFlowInstance.setViewport(data.flow.viewport);
        }
        setError(null);
      } else {
        setError("Invalid funnel file format");
      }
    } catch (err) {
      console.error("Failed to import funnel:", err);
      setError("Failed to import funnel file");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [setNodes, setEdges, reactFlowInstance]);

  // Auto-layout nodes
  const handleAutoLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      "TB"
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    // Fit view after layout
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 0);

    setError(null);
  }, [nodes, edges, setNodes, setEdges, reactFlowInstance]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Undo: Cmd/Ctrl + Z
      if (isMod && e.key === "z" && !e.shiftKey && canUndo) {
        e.preventDefault();
        handleUndo();
      }

      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if (isMod && ((e.key === "z" && e.shiftKey) || e.key === "y") && canRedo) {
        e.preventDefault();
        handleRedo();
      }

      // Copy: Cmd/Ctrl + C
      if (isMod && e.key === "c") {
        e.preventDefault();
        handleCopy();
      }

      // Paste: Cmd/Ctrl + V
      if (isMod && e.key === "v") {
        e.preventDefault();
        handlePaste();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, canRedo, handleUndo, handleRedo, handleCopy, handlePaste]);

  // Get selected node
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            onPress={handleUndo}
            isDisabled={!canUndo || isSaving}
            startContent={<Undo2 className="w-4 h-4" />}
          >
            Undo
          </Button>
          <Button
            size="sm"
            variant="flat"
            onPress={handleRedo}
            isDisabled={!canRedo || isSaving}
            startContent={<Redo2 className="w-4 h-4" />}
          >
            Redo
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            onPress={handleCopy}
            isDisabled={nodes.filter((n) => n.selected).length === 0 || isSaving}
            startContent={<Copy className="w-4 h-4" />}
          >
            Copy
          </Button>
          <Button
            size="sm"
            variant="flat"
            onPress={handlePaste}
            isDisabled={!clipboard || clipboard.nodes.length === 0 || isSaving}
            startContent={<Clipboard className="w-4 h-4" />}
          >
            Paste
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            onPress={handleAutoLayout}
            isDisabled={nodes.length === 0 || isSaving}
            startContent={<Network className="w-4 h-4" />}
          >
            Auto Layout
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            onPress={handleExport}
            isDisabled={nodes.length === 0}
            startContent={<Download className="w-4 h-4" />}
          >
            Export
          </Button>
          <Button
            size="sm"
            variant="flat"
            onPress={() => fileInputRef.current?.click()}
            startContent={<Upload className="w-4 h-4" />}
          >
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>

        <div className="flex-1" />

        {error && (
          <div className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Main Editor */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left Sidebar - Node Palette */}
        <div className="w-48 flex-shrink-0">
          <Card>
            <CardBody className="gap-2">
              <h3 className="text-sm font-semibold mb-2">Add Nodes</h3>
              {NODE_TYPES.map((nodeType) => (
                <Button
                  key={nodeType}
                  size="sm"
                  variant="flat"
                  onPress={() => handleAddNode(nodeType)}
                  isDisabled={isSaving}
                  className="justify-start"
                >
                  {getNodeTypeLabel(nodeType)}
                </Button>
              ))}
            </CardBody>
          </Card>
        </div>

        {/* Center - ReactFlow Canvas */}
        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden relative">
          {isSaving && (
            <div className="absolute top-4 right-4 z-10 bg-white/90 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <Spinner size="sm" />
              <span className="text-xs text-gray-600">Saving...</span>
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodesDelete={handleNodesDelete}
            onEdgesDelete={handleEdgesDelete}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-right"
            deleteKeyCode={["Backspace", "Delete"]}
            multiSelectionKeyCode="Shift"
            selectionKeyCode="Shift"
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Right Sidebar - Node Config Panel */}
        <div className="w-80 flex-shrink-0">
          <Card>
            <CardBody>
              {selectedNode ? (
                <div>
                  <h3 className="text-sm font-semibold mb-4">
                    Configure {selectedNode.data.label}
                  </h3>
                  <NodeConfigPanel
                    node={selectedNode}
                    onUpdate={(newConfig) =>
                      handleUpdateNodeConfig(selectedNode.id, newConfig)
                    }
                    isSaving={isSaving}
                  />
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p className="mb-4 text-sm">Select a node to configure</p>
                  <div className="text-left text-xs space-y-2 border-t pt-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Funnel:</span>
                      <span className="font-medium">{funnel.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="font-medium">{funnel.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Nodes:</span>
                      <span className="font-medium">{nodes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Edges:</span>
                      <span className="font-medium">{edges.length}</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg text-left">
                    <p className="text-xs text-blue-900 font-semibold mb-2">Keyboard Shortcuts</p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• <kbd className="bg-white px-1 rounded">Ctrl+Z</kbd> Undo</li>
                      <li>• <kbd className="bg-white px-1 rounded">Ctrl+Y</kbd> Redo</li>
                      <li>• <kbd className="bg-white px-1 rounded">Ctrl+C</kbd> Copy</li>
                      <li>• <kbd className="bg-white px-1 rounded">Ctrl+V</kbd> Paste</li>
                      <li>• <kbd className="bg-white px-1 rounded">Delete</kbd> Remove</li>
                      <li>• <kbd className="bg-white px-1 rounded">Shift</kbd> Multi-select</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Main FunnelEditor component with ReactFlowProvider wrapper
 */
export default function FunnelEditor(props: FunnelEditorProps) {
  return (
    <ReactFlowProvider>
      <FunnelEditorInner {...props} />
    </ReactFlowProvider>
  );
}

// Helper function to get default config for node type
function getDefaultConfigForNodeType(nodeType: NodeType): Record<string, any> {
  switch (nodeType) {
    case "delay":
      return { duration: 60 };
    case "call":
      return { agent_config_id: "", max_duration: 300 };
    case "email":
      return { template_id: "", subject: "", body: "" };
    case "sms":
      return { template_id: "", message: "" };
    case "webhook":
      return { url: "", method: "POST", headers: {} };
    case "condition":
      return { field: "", operator: "equals", value: "" };
    case "end":
      return {};
    default:
      return {};
  }
}
