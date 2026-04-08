import { useSigma } from "@react-sigma/core";
import { FC, PropsWithChildren, useEffect } from "react";

import { FiltersState } from "../types";

const GraphDataController: FC<PropsWithChildren<{ filters: FiltersState }>> = ({ filters, children }) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();

  /**
   * Apply filters to graphology:
   */
  useEffect(() => {
    const { clusters, tags, contexts } = filters;
    const contextKeys = Object.keys(contexts);
    const hasAnyContexts = contextKeys.length > 0;
    
    graph.forEachNode((node, nodeData) => {
      const { cluster, tag } = nodeData;
      
      // Check cluster and tag filters
      let isVisible = clusters[cluster] && tags[tag];
      
      // Check context filters
      // If there are no contexts in the filter at all (uncheck all), hide the node
      // If there are contexts in the filter, show node if any of its contexts match
      if (isVisible) {
        if (hasAnyContexts) {
          // At least one context is checked - show if node has a matching context
          const nodeContexts = nodeData.contexts || [];
          const hasMatchingContext = nodeContexts.some((ctx: string) => contexts[ctx]);
          isVisible = hasMatchingContext;
        } else {
          // No contexts are checked (uncheck all) - hide all nodes
          isVisible = false;
        }
      }
      
      graph.setNodeAttribute(node, "hidden", !isVisible);
    });
    
    // Force sigma to refresh so edge reducers re-evaluate with updated node hidden states
    sigma.refresh();
  }, [graph, filters, sigma]);

  return <>{children}</>;
};

export default GraphDataController;
