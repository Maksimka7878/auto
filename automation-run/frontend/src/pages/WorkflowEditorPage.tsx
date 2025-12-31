import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PlayIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { workflowsApi, integrationsApi } from '@/services/api';
import NodePalette from '@/components/workflow-builder/NodePalette';
import CustomNode from '@/components/workflow-builder/CustomNode';
import NodeConfigPanel from '@/components/workflow-builder/NodeConfigPanel';
import type { Workflow, NodeConfig } from '@/types';

const nodeTypes = {
  custom: CustomNode,
};

export default function WorkflowEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState('Новая автоматизация');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch available integrations
  const { data: integrations } = useQuery<{
    triggers: NodeConfig[];
    actions: NodeConfig[];
    logic: NodeConfig[];
  }>({
    queryKey: ['integrations'],
    queryFn: async () => {
      const response = await integrationsApi.getAvailable();
      return response.data;
    },
  });

  // Fetch existing workflow
  const { data: workflow } = useQuery<Workflow>({
    queryKey: ['workflow', id],
    queryFn: async () => {
      const response = await workflowsApi.getById(id!);
      return response.data;
    },
    enabled: !isNew,
  });

  // Load workflow data
  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name);
      setWorkflowDescription(workflow.description || '');

      const flowNodes: Node[] = workflow.nodes.map((node) => ({
        id: node.id,
        type: 'custom',
        position: node.position,
        data: {
          label: node.name,
          nodeType: node.type,
          config: node.config,
        },
      }));

      const flowEdges: Edge[] = workflow.connections.map((conn) => ({
        id: conn.id,
        source: conn.sourceId,
        target: conn.targetId,
        sourceHandle: conn.sourceHandle,
        targetHandle: conn.targetHandle,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [workflow, setNodes, setEdges]);

  // Create workflow mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      workflowsApi.create(data),
    onSuccess: (response) => {
      toast.success('Автоматизация создана');
      navigate(`/dashboard/workflows/${response.data._id}`, { replace: true });
    },
    onError: () => {
      toast.error('Ошибка создания');
    },
  });

  // Update workflow mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => workflowsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      toast.success('Изменения сохранены');
    },
    onError: () => {
      toast.error('Ошибка сохранения');
    },
  });

  // Activate workflow mutation
  const activateMutation = useMutation({
    mutationFn: () => workflowsApi.activate(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      toast.success('Автоматизация активирована');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка активации');
    },
  });

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow-type');
      const name = event.dataTransfer.getData('application/reactflow-name');

      if (!type) return;

      const reactFlowBounds = (
        event.target as HTMLElement
      ).getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label: name,
          nodeType: type,
          config: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const handleSave = async () => {
    setIsSaving(true);

    const workflowNodes = nodes.map((node) => ({
      id: node.id,
      type: node.data.nodeType,
      name: node.data.label,
      position: node.position,
      config: node.data.config || {},
    }));

    const workflowConnections = edges.map((edge) => ({
      id: edge.id,
      sourceId: edge.source,
      targetId: edge.target,
      sourceHandle: edge.sourceHandle || undefined,
      targetHandle: edge.targetHandle || undefined,
    }));

    try {
      if (isNew) {
        await createMutation.mutateAsync({
          name: workflowName,
          description: workflowDescription,
        });
      } else {
        await updateMutation.mutateAsync({
          name: workflowName,
          description: workflowDescription,
          nodes: workflowNodes,
          connections: workflowConnections,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleNodeConfigChange = (nodeId: string, config: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, config } }
          : node
      )
    );
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) =>
      eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
    );
    setSelectedNode(null);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/workflows')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-xl font-bold bg-transparent border-0 focus:ring-0 p-0"
              placeholder="Название автоматизации"
            />
            <input
              type="text"
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              className="text-sm text-gray-500 bg-transparent border-0 focus:ring-0 p-0 w-full"
              placeholder="Описание (опционально)"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-secondary"
          >
            <CheckIcon className="h-4 w-4 mr-2" />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
          {!isNew && (
            <button
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending || workflow?.isActive}
              className="btn-primary"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              {workflow?.isActive ? 'Активен' : 'Активировать'}
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex gap-4">
        {/* Node Palette */}
        <div className="w-64 flex-shrink-0">
          <NodePalette integrations={integrations} />
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
          >
            <Controls />
            <Background gap={15} size={1} />
            <Panel position="bottom-center" className="bg-white rounded-lg shadow px-4 py-2 text-sm text-gray-500">
              Перетащите узлы из панели слева на холст
            </Panel>
          </ReactFlow>
        </div>

        {/* Config Panel */}
        {selectedNode && (
          <div className="w-80 flex-shrink-0">
            <NodeConfigPanel
              node={selectedNode}
              integrations={integrations}
              onConfigChange={(config) =>
                handleNodeConfigChange(selectedNode.id, config)
              }
              onDelete={() => handleDeleteNode(selectedNode.id)}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
