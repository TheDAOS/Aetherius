import React, { useRef, useEffect, useState } from 'react';
import { VaultGraphIndex, GraphNode } from '../../services/intelligence/graphIndexer';
import { ZoomIn, ZoomOut, RotateCcw, Radio } from 'lucide-react';

interface GraphCanvasProps {
  graphIndex: VaultGraphIndex;
  activeFilePath?: string;
  onSelectNode: (path: string) => void;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  graphIndex,
  activeFilePath = '',
  onSelectNode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [filterText, setFilterText] = useState('');
  const [isLocalOnly, setIsLocalOnly] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);

  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<SimNode | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const animationFrameRef = useRef<number>(0);

  // Initialize or update simulation nodes
  useEffect(() => {
    const width = canvasRef.current?.clientWidth || 800;
    const height = canvasRef.current?.clientHeight || 600;

    // Filter nodes if local mode is on
    let visibleNodes = graphIndex.nodes;

    if (isLocalOnly && activeFilePath) {
      const neighborSet = new Set<string>([activeFilePath]);
      for (const edge of graphIndex.edges) {
        if (edge.source === activeFilePath) neighborSet.add(edge.target);
        if (edge.target === activeFilePath) neighborSet.add(edge.source);
      }
      visibleNodes = graphIndex.nodes.filter(n => neighborSet.has(n.path));
    }

    const prevMap = new Map(simNodesRef.current.map(n => [n.path, n]));

    simNodesRef.current = visibleNodes.map(n => {
      const existing = prevMap.get(n.path);
      const radius = n.path === activeFilePath ? 14 : n.isHub ? 11 : 8;
      return {
        ...n,
        x: existing ? existing.x : width / 2 + (Math.random() - 0.5) * 300,
        y: existing ? existing.y : height / 2 + (Math.random() - 0.5) * 300,
        vx: existing ? existing.vx : 0,
        vy: existing ? existing.vy : 0,
        radius
      };
    });

    // Center transform
    transformRef.current = {
      x: width / 2,
      y: height / 2,
      scale: 1
    };
  }, [graphIndex, isLocalOnly, activeFilePath]);

  // Main Physics Simulation & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const nodes = simNodesRef.current;
      const edges = graphIndex.edges;
      const nodeMap = new Map(nodes.map(n => [n.path, n]));

      // Physics Simulation Step
      const charge = 400;
      const springLength = 80;
      const springStrength = 0.05;
      const damping = 0.85;
      const centerGravity = 0.01;

      // 1. Repulsion between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);
          if (dist < 400) {
            const force = charge / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx -= fx;
            a.vy -= fy;
            b.vx += fx;
            b.vy += fy;
          }
        }
      }

      // 2. Attraction along edges
      for (const edge of edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - springLength) * springStrength;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        }
      }

      // 3. Center gravity & velocity damping
      for (const node of nodes) {
        if (node === draggedNodeRef.current) continue;
        node.vx += (0 - node.x) * centerGravity;
        node.vy += (0 - node.y) * centerGravity;
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
      }

      // --- Drawing ---
      ctx.clearRect(0, 0, width, height);

      // Background Grid Dots
      ctx.save();
      ctx.fillStyle = '#E5E0D4';
      const gridSize = 30 * transformRef.current.scale;
      const startX = (transformRef.current.x % gridSize);
      const startY = (transformRef.current.y % gridSize);
      for (let x = startX; x < width; x += gridSize) {
        for (let y = startY; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      ctx.save();
      ctx.translate(transformRef.current.x, transformRef.current.y);
      ctx.scale(transformRef.current.scale, transformRef.current.scale);

      // Draw Edges
      ctx.lineWidth = 1.5;
      for (const edge of edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          const isHighlighted =
            source.path === activeFilePath || target.path === activeFilePath;
          ctx.strokeStyle = isHighlighted ? '#111111' : '#B8B3A8';
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      }

      // Draw Nodes
      const query = filterText.toLowerCase().trim();

      for (const node of nodes) {
        const isActive = node.path === activeFilePath;
        const matchesQuery = query ? node.title.toLowerCase().includes(query) || node.path.toLowerCase().includes(query) : true;

        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        // Fill color
        if (isActive) {
          ctx.fillStyle = '#E2FF00'; // Acid Lime
        } else if (node.isHub) {
          ctx.fillStyle = '#FF5500'; // Tangerine
        } else if (node.path.startsWith('templates/')) {
          ctx.fillStyle = '#FF1493'; // Pink
        } else {
          ctx.fillStyle = '#00F5D4'; // Mint
        }

        if (!matchesQuery) {
          ctx.globalAlpha = 0.2;
        }

        ctx.fill();

        // 2px Neo-Memphis stroke
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#111111';
        ctx.stroke();

        // Node Label
        if (transformRef.current.scale > 0.6 || isActive || node.isHub || (hoveredNode && hoveredNode.path === node.path)) {
          ctx.font = `${isActive ? 'bold' : 'normal'} 10px monospace`;
          ctx.fillStyle = '#111111';
          ctx.textAlign = 'center';
          ctx.fillText(node.title, node.x, node.y + node.radius + 12);
        }

        ctx.restore();
      }

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [graphIndex, activeFilePath, filterText, hoveredNode]);

  // Screen Coordinates to World Coordinates
  const toWorld = (screenX: number, screenY: number) => {
    return {
      x: (screenX - transformRef.current.x) / transformRef.current.scale,
      y: (screenY - transformRef.current.y) / transformRef.current.scale
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const world = toWorld(mouseX, mouseY);

    // Check if clicked a node
    for (const node of simNodesRef.current) {
      const dx = world.x - node.x;
      const dy = world.y - node.y;
      if (dx * dx + dy * dy < node.radius * node.radius) {
        draggedNodeRef.current = node;
        return;
      }
    }

    // Otherwise pan canvas
    isDraggingRef.current = true;
    dragStartRef.current = { x: mouseX - transformRef.current.x, y: mouseY - transformRef.current.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const world = toWorld(mouseX, mouseY);

    if (draggedNodeRef.current) {
      draggedNodeRef.current.x = world.x;
      draggedNodeRef.current.y = world.y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
      return;
    }

    if (isDraggingRef.current) {
      transformRef.current.x = mouseX - dragStartRef.current.x;
      transformRef.current.y = mouseY - dragStartRef.current.y;
      return;
    }

    // Check hover
    let found: SimNode | null = null;
    for (const node of simNodesRef.current) {
      const dx = world.x - node.x;
      const dy = world.y - node.y;
      if (dx * dx + dy * dy < (node.radius + 4) * (node.radius + 4)) {
        found = node;
        break;
      }
    }
    setHoveredNode(found);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const world = toWorld(mouseX, mouseY);
        const dx = world.x - draggedNodeRef.current.x;
        const dy = world.y - draggedNodeRef.current.y;
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
          onSelectNode(draggedNodeRef.current.path);
        }
      }
      draggedNodeRef.current = null;
    }
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(Math.max(0.3, transformRef.current.scale * zoomFactor), 3.0);
    transformRef.current.scale = newScale;
  };

  return (
    <div className="relative w-full h-full bg-paper-canvas overflow-hidden select-none">
      {/* Graph Toolbar & Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          placeholder="Filter graph notes..."
          className="neo-box-sm px-3 py-1.5 bg-white text-ink-primary font-mono text-xs outline-none focus:ring-2 focus:ring-accent-acid w-48 sm:w-60 shadow-neo"
        />

        <button
          onClick={() => setIsLocalOnly(!isLocalOnly)}
          className={`neo-btn px-2.5 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
            isLocalOnly ? 'bg-accent-acid text-ink-primary' : 'bg-white text-ink-secondary'
          }`}
          title="Toggle Local Neighborhood Graph"
        >
          <Radio size={13} />
          <span>{isLocalOnly ? 'Local (1-hop)' : 'Global'}</span>
        </button>
      </div>

      {/* Zoom / Navigation Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5 neo-box-sm p-1 bg-white shadow-neo">
        <button
          onClick={() => {
            transformRef.current.scale = Math.min(3.0, transformRef.current.scale * 1.2);
          }}
          className="p-1.5 hover:bg-cream-shell text-ink-primary transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={() => {
            transformRef.current.scale = Math.max(0.3, transformRef.current.scale * 0.8);
          }}
          className="p-1.5 hover:bg-cream-shell text-ink-primary transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>
        <button
          onClick={() => {
            const width = canvasRef.current?.clientWidth || 800;
            const height = canvasRef.current?.clientHeight || 600;
            transformRef.current = { x: width / 2, y: height / 2, scale: 1 };
          }}
          className="p-1.5 hover:bg-cream-shell text-ink-primary transition-colors"
          title="Reset Center"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Tooltip on Hover */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 z-10 neo-box-sm bg-white p-2.5 shadow-neo border-2 border-ink-primary font-mono text-xs">
          <div className="font-bold text-accent-cobalt">{hoveredNode.title}</div>
          <div className="text-[10px] text-ink-muted">{hoveredNode.path}</div>
          <div className="text-[10px] text-ink-primary mt-1 font-bold">
            {hoveredNode.degree} connection(s) {hoveredNode.isHub && '· Hub Note ⭐'}
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />
    </div>
  );
};
