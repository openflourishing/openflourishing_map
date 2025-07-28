import { useSigma } from "@react-sigma/core";
import { FC } from "react";
import { BsInfoCircle } from "react-icons/bs";

import { Item } from "../types";

import Panel from "./Panel";

interface ItemsPanelProps {
  selectedNode: string | null;
}

const ItemsPanel: FC<ItemsPanelProps> = ({ selectedNode }) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();

  // Get items for the selected node
  const selectedNodeItems: Item[] = selectedNode ? (graph.getNodeAttribute(selectedNode, "items") || []) : [];
  
  // Get items for the 5 most closely linked neighbors
  const getNeighborItems = (): { neighbor: string; items: Item[] }[] => {
    if (!selectedNode) return [];
    
    const neighbors = graph.neighbors(selectedNode);
    
    // Get all neighbor items with their labels
    const neighborItems = neighbors.map(neighbor => ({
      neighbor: graph.getNodeAttribute(neighbor, "label") || neighbor,
      items: graph.getNodeAttribute(neighbor, "items") || []
    })).slice(0, 5); // Take first 5 neighbors
    
    return neighborItems;
  };

  const neighborItems = getNeighborItems();

  return (
    <Panel
      initiallyDeployed
      title={
        <>
          <BsInfoCircle className="text-muted" /> Items
        </>
      }
    >
      {selectedNode ? (
        <div>
          <h4>{graph.getNodeAttribute(selectedNode, "label")}</h4>
          {selectedNodeItems.length > 0 ? (
            <div>
              <h5>Items ({selectedNodeItems.length})</h5>
              <ul style={{ fontSize: "0.9em", marginBottom: "1rem" }}>
                {selectedNodeItems.slice(0, 10).map((item, index) => (
                  <li key={index} style={{ marginBottom: "0.5rem" }}>
                    "{item.item}" 
                    <small style={{ color: "#666", display: "block" }}>
                      {item.level} • {item.tense} • {item.context}
                    </small>
                  </li>
                ))}
              </ul>
              {selectedNodeItems.length > 10 && (
                <small style={{ color: "#666" }}>
                  ... and {selectedNodeItems.length - 10} more items
                </small>
              )}
            </div>
          ) : (
            <p style={{ color: "#666" }}>No items available for this node.</p>
          )}
          
          {neighborItems.length > 0 && (
            <div style={{ marginTop: "1.5rem" }}>
              <h5>Related Items from Neighbors</h5>
              {neighborItems.map(({ neighbor, items }, neighborIndex) => (
                items.length > 0 && (
                  <div key={neighborIndex} style={{ marginBottom: "1rem" }}>
                    <h6 style={{ color: "#555", fontSize: "0.9em" }}>{neighbor}</h6>
                    <ul style={{ fontSize: "0.8em" }}>
                      {items.slice(0, 3).map((item, index) => (
                        <li key={index} style={{ marginBottom: "0.3rem" }}>
                          "{item.item}"
                          <small style={{ color: "#666", display: "block" }}>
                            {item.level} • {item.context}
                          </small>
                        </li>
                      ))}
                    </ul>
                    {items.length > 3 && (
                      <small style={{ color: "#666" }}>
                        ... and {items.length - 3} more items
                      </small>
                    )}
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      ) : (
        <p>Select a node to see related items.</p>
      )}
    </Panel>
  );
};

export default ItemsPanel;