import { useSetSettings, useSigma } from "@react-sigma/core";
import { Attributes } from "graphology-types";
import { FC, PropsWithChildren, useEffect } from "react";

import { drawHover, drawLabel } from "../canvas-utils";
import useDebounce from "../use-debounce";
import { FiltersState } from "../types";

const NODE_FADE_COLOR = "#eee";
const EDGE_FADE_COLOR = "#eee";
const NODE_HIDDEN_LIGHT = "#d0d0d0";
const NODE_HIDDEN_DARK = "#505050";

const GraphSettingsController: FC<PropsWithChildren<{ hoveredNode: string | null; showEdges: boolean; edgeWeightThreshold: number; darkMode: boolean; filters: FiltersState }>> = ({ children, hoveredNode, showEdges, edgeWeightThreshold, darkMode, filters }) => {
  const sigma = useSigma();
  const setSettings = useSetSettings();
  const graph = sigma.getGraph();

  // Here we debounce the value to avoid having too much highlights refresh when
  // moving the mouse over the graph:
  const debouncedHoveredNode = useDebounce(hoveredNode, 40);

  /**
   * Initialize here settings that require to know the graph and/or the sigma
   * instance:
   */
  useEffect(() => {
    const hoveredColor: string = (debouncedHoveredNode && sigma.getNodeDisplayData(debouncedHoveredNode)?.color) || "";
    const hiddenNodeColor = darkMode ? NODE_HIDDEN_DARK : NODE_HIDDEN_LIGHT;

    setSettings({
      defaultDrawNodeLabel: drawLabel,
      defaultDrawNodeHover: drawHover,
      nodeReducer: (node: string, data: Attributes) => {
        // Show hidden nodes in gray instead of hiding them
        if (data.hidden) {
          return { ...data, color: hiddenNodeColor, label: "", image: null, highlighted: false, hidden: false };
        }
        if (debouncedHoveredNode) {
          return node === debouncedHoveredNode ||
            graph.hasEdge(node, debouncedHoveredNode) ||
            graph.hasEdge(debouncedHoveredNode, node)
            ? { ...data, zIndex: 1 }
            : { ...data, zIndex: 0, label: "", color: NODE_FADE_COLOR, image: null, highlighted: false };
        }
        return data;
      },
      edgeReducer: (edge: string, data: Attributes) => {
        if ((data.weight as number) < edgeWeightThreshold) return { ...data, hidden: true };
        // Hide edges if either endpoint node is hidden
        const [source, target] = graph.extremities(edge);
        const sourceHidden = graph.getNodeAttribute(source, "hidden");
        const targetHidden = graph.getNodeAttribute(target, "hidden");
        if (sourceHidden || targetHidden) return { ...data, hidden: true };
        if (debouncedHoveredNode) {
          return graph.hasExtremity(edge, debouncedHoveredNode)
            ? { ...data, color: hoveredColor, size: data.size * 1.5 } // Scale up the original size instead of fixed 0.3
            : { ...data, color: EDGE_FADE_COLOR, hidden: true };
        }
        if (!showEdges) return { ...data, hidden: true };
        return data;
      },
    });
  }, [sigma, graph, debouncedHoveredNode, showEdges, edgeWeightThreshold, darkMode, filters]);

  /**
   * Update node and edge reducers when a node is hovered, to highlight its
   * neighborhood:
   */
  useEffect(() => {
    const hoveredColor: string = (debouncedHoveredNode && sigma.getNodeDisplayData(debouncedHoveredNode)?.color) || "";
    const hiddenNodeColor = darkMode ? NODE_HIDDEN_DARK : NODE_HIDDEN_LIGHT;

    sigma.setSetting(
      "nodeReducer",
      debouncedHoveredNode
        ? (node, data) => {
            // Show hidden nodes in gray instead of hiding them
            if (data.hidden) {
              return { ...data, color: hiddenNodeColor, label: "", image: null, highlighted: false, hidden: false };
            }
            return node === debouncedHoveredNode ||
              graph.hasEdge(node, debouncedHoveredNode) ||
              graph.hasEdge(debouncedHoveredNode, node)
                ? { ...data, zIndex: 1 }
                : { ...data, zIndex: 0, label: "", color: NODE_FADE_COLOR, image: null, highlighted: false };
          }
        : (_node, data) => {
            // Show hidden nodes in gray instead of hiding them
            if (data.hidden) {
              return { ...data, color: hiddenNodeColor, label: "", image: null, highlighted: false, hidden: false };
            }
            return data;
          },
    );
    sigma.setSetting(
      "edgeReducer",
      debouncedHoveredNode
        ? (edge, data) => {
            if ((data.weight as number) < edgeWeightThreshold) return { ...data, hidden: true };
            // Hide edges if either endpoint node is hidden
            const [source, target] = graph.extremities(edge);
            const sourceHidden = graph.getNodeAttribute(source, "hidden");
            const targetHidden = graph.getNodeAttribute(target, "hidden");
            if (sourceHidden || targetHidden) return { ...data, hidden: true };
            return graph.hasExtremity(edge, debouncedHoveredNode)
              ? { ...data, color: hoveredColor, size: data.size * 1.5 } // Scale up the original size instead of fixed 0.3
              : { ...data, color: EDGE_FADE_COLOR, hidden: true };
          }
        : (edge, data) => {
            if ((data.weight as number) < edgeWeightThreshold) return { ...data, hidden: true };
            // Hide edges if either endpoint node is hidden
            const [source, target] = graph.extremities(edge);
            const sourceHidden = graph.getNodeAttribute(source, "hidden");
            const targetHidden = graph.getNodeAttribute(target, "hidden");
            if (sourceHidden || targetHidden) return { ...data, hidden: true };
            if (!showEdges) return { ...data, hidden: true };
            return data;
          },
    );
  }, [sigma, debouncedHoveredNode, showEdges, edgeWeightThreshold, darkMode, graph, filters]);

  return <>{children}</>;
};

export default GraphSettingsController;
