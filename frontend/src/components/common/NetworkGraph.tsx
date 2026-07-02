import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import api from '../../services/api';
import type { IUser, ITeam } from '../../types';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'student' | 'team' | 'skill';
  color: string;
  usn?: string;
  teamId?: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
}

const NetworkGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const loadNetworkData = async () => {
      try {
        // Fetch verified students and teams
        const [usersRes, teamsRes] = await Promise.all([
          api.get('/users/search'),
          api.get('/teams'),
        ]);

        if (!isMounted) return;

        const users: IUser[] = usersRes.data.users || [];
        const teams: ITeam[] = teamsRes.data.teams || [];

        // Build nodes and links
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];
        const nodeSet = new Set<string>();
        const skillSet = new Set<string>();

        // 1. Add Team Nodes
        teams.forEach((t) => {
          const nodeId = `team_${t._id}`;
          if (!nodeSet.has(nodeId)) {
            nodes.push({
              id: nodeId,
              label: t.title,
              type: 'team',
              color: '#ff4500', // Reddit orange
              teamId: t._id,
            });
            nodeSet.add(nodeId);
          }

          // Add required skills nodes
          t.skills.slice(0, 3).forEach((s) => {
            const skillName = s.trim().toLowerCase();
            if (skillName) {
              skillSet.add(skillName);
              links.push({
                source: nodeId,
                target: `skill_${skillName}`,
                value: 1,
              });
            }
          });
        });

        // 2. Add Student Nodes
        users.forEach((u) => {
          const nodeId = `student_${u.id || u._id}`;
          if (!nodeSet.has(nodeId)) {
            nodes.push({
              id: nodeId,
              label: u.name,
              type: 'student',
              color: '#0079d3', // Reddit blue
              usn: u.usn,
            });
            nodeSet.add(nodeId);
          }

          // Add student skill links
          u.skills.slice(0, 3).forEach((s) => {
            const skillName = s.trim().toLowerCase();
            if (skillName) {
              skillSet.add(skillName);
              links.push({
                source: nodeId,
                target: `skill_${skillName}`,
                value: 1.5,
              });
            }
          });
        });

        // 3. Add Skill Nodes
        skillSet.forEach((s) => {
          const nodeId = `skill_${s}`;
          nodes.push({
            id: nodeId,
            label: s.toUpperCase(),
            type: 'skill',
            color: '#787c7e', // Slate gray
          });
        });

        // 4. Add Membership Links (Student -> Team)
        teams.forEach((t) => {
          t.members.forEach((m) => {
            const studentId = m.userId?._id || (m.userId as any);
            const sourceId = `student_${studentId}`;
            const targetId = `team_${t._id}`;

            if (nodeSet.has(sourceId) && nodeSet.has(targetId)) {
              links.push({
                source: sourceId,
                target: targetId,
                value: 2,
              });
            }
          });
        });

        if (nodes.length === 0) {
          setLoading(false);
          return;
        }

        renderD3Graph(nodes, links);
        setLoading(false);
      } catch (err) {
        console.error('Failed to construct network graph:', err);
        if (isMounted) setLoading(false);
      }
    };

    loadNetworkData();

    return () => {
      isMounted = false;
    };
  }, []);

  const renderD3Graph = (nodes: GraphNode[], links: GraphLink[]) => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear previous SVG contents
    d3.select(svgRef.current).selectAll('*').remove();

    const width = containerRef.current.clientWidth || 600;
    const height = 400;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Create a group for all graph elements to support zoom
    const g = svg.append('g');

    // Add zoom/pan support
    svg.call(
      d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
        g.attr('transform', event.transform);
      })
    );

    // Setup force simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(25));

    // Render connection links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#ccc')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.sqrt(d.value) * 1.5);

    // Render nodes
    const node = g.append('g')
      .selectAll('.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .call(drag(simulation) as any)
      .on('click', (_, d) => {
        if (d.type === 'student' && d.usn) {
          navigate(`/profile/${d.usn}`);
        } else if (d.type === 'team' && d.teamId) {
          navigate(`/teams/${d.teamId}`);
        }
      });

    // Draw node shapes based on type
    node.each(function (d) {
      const el = d3.select(this);
      if (d.type === 'student') {
        // Circle for students
        el.append('circle')
          .attr('r', 10)
          .attr('fill', d.color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .attr('cursor', 'pointer');
      } else if (d.type === 'team') {
        // Rect for teams
        el.append('rect')
          .attr('x', -9)
          .attr('y', -9)
          .attr('width', 18)
          .attr('height', 18)
          .attr('rx', 3)
          .attr('fill', d.color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .attr('cursor', 'pointer');
      } else {
        // Hexagon/Diamond outline for skills
        el.append('polygon')
          .attr('points', '0,-8 7,0 0,8 -7,0')
          .attr('fill', d.color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1)
          .attr('cursor', 'default');
      }
    });

    // Append labels
    node.append('text')
      .attr('dy', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', (d) => (d.type === 'skill' ? 'normal' : 'bold'))
      .attr('fill', 'currentColor')
      .text((d) => d.label);

    // Add node title hovers
    node.append('title').text((d) => `${d.label} (${d.type.toUpperCase()})`);

    // Tick the simulation to animate coordinates
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x!)
        .attr('y1', (d) => (d.source as GraphNode).y!)
        .attr('x2', (d) => (d.target as GraphNode).x!)
        .attr('y2', (d) => (d.target as GraphNode).y!);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // Drag behavior helper
    function drag(simulation: d3.Simulation<GraphNode, undefined>) {
      function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full bg-reddit-card dark:bg-reddit-cardDark border border-reddit-border dark:border-reddit-borderDark rounded-md p-4"
    >
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-reddit-orange">Kindred Connection Network</h4>
        <span className="text-[10px] text-reddit-gray">Drag to explore. Click nodes to view.</span>
      </div>
      
      {loading ? (
        <div className="h-[400px] flex items-center justify-center text-xs text-reddit-gray animate-pulse">
          Generating collaboration visualizer graph...
        </div>
      ) : (
        <div className="relative border border-reddit-border/40 dark:border-reddit-borderDark/40 rounded bg-reddit-bg/10 dark:bg-reddit-bgDark/10 overflow-hidden">
          <svg ref={svgRef} className="text-reddit-text dark:text-reddit-textDark" />
        </div>
      )}
    </div>
  );
};

export default NetworkGraph;
