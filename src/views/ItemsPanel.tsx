import { useSigma } from "@react-sigma/core";
import { FC, useState, useMemo } from "react";
import { BsInfoCircle } from "react-icons/bs";

import { Item } from "../types";

import Panel from "./Panel";

interface ItemsPanelProps {
  selectedNode: string | null;
}

interface FilterState {
  level: string;
  tense: string;
  context: string;
}

const ItemsPanel: FC<ItemsPanelProps> = ({ selectedNode }) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();

  const [filters, setFilters] = useState<FilterState>({
    level: "all",
    tense: "all",
    context: "all"
  });

  // Get items for the selected node
  const selectedNodeItems: Item[] = selectedNode ? (graph.getNodeAttribute(selectedNode, "items") || []) : [];
  
  // Get unique values for filter options
  const allItems = useMemo(() => {
    const items = [...selectedNodeItems];
    // Add neighbor items for filter options
    if (selectedNode) {
      const neighbors = graph.neighbors(selectedNode);
      neighbors.slice(0, 5).forEach(neighbor => {
        const neighborItems = graph.getNodeAttribute(neighbor, "items") || [];
        items.push(...neighborItems);
      });
    }
    return items;
  }, [selectedNode, selectedNodeItems, graph]);

  const filterOptions = useMemo(() => {
    const levels = new Set<string>();
    const tenses = new Set<string>();
    const contexts = new Set<string>();
    
    allItems.forEach(item => {
      levels.add(item.level);
      tenses.add(item.tense);
      contexts.add(item.context);
    });
    
    return {
      levels: Array.from(levels).sort(),
      tenses: Array.from(tenses).sort(),
      contexts: Array.from(contexts).sort()
    };
  }, [allItems]);

  // Filter function
  const filterItems = (items: Item[]) => {
    return items.filter(item => {
      if (filters.level !== "all" && item.level !== filters.level) return false;
      if (filters.tense !== "all" && item.tense !== filters.tense) return false;
      if (filters.context !== "all" && item.context !== filters.context) return false;
      return true;
    });
  };

  // Apply filters to selected node items
  const filteredSelectedItems = filterItems(selectedNodeItems);
  
  // Get items for the 5 most closely linked neighbors
  const getNeighborItems = (): { neighbor: string; items: Item[]; originalCount: number }[] => {
    if (!selectedNode) return [];
    
    const neighbors = graph.neighbors(selectedNode);
    
    // Get all neighbor items with their labels and apply filters
    const neighborItems = neighbors.map(neighbor => {
      const originalItems = graph.getNodeAttribute(neighbor, "items") || [];
      const filteredItems = filterItems(originalItems);
      return {
        neighbor: graph.getNodeAttribute(neighbor, "label") || neighbor,
        items: filteredItems,
        originalCount: originalItems.length
      };
    }).slice(0, 5); // Take first 5 neighbors
    
    return neighborItems;
  };

  const neighborItems = getNeighborItems();

  const resetFilters = () => {
    setFilters({
      level: "all",
      tense: "all", 
      context: "all"
    });
  };

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
          
          <div style={{ 
            padding: "10px", 
            backgroundColor: "#f8f9fa", 
            borderRadius: "4px", 
            marginBottom: "1rem",
            fontSize: "0.9em"
          }}>
            <div style={{ marginBottom: "10px", fontWeight: "bold" }}>Filters:</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "2px", fontSize: "0.8em" }}>Level:</label>
                <select 
                  value={filters.level}
                  onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                  style={{ width: "100%", padding: "2px 4px", fontSize: "0.8em" }}
                >
                  <option value="all">All</option>
                  {filterOptions.levels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "2px", fontSize: "0.8em" }}>Tense:</label>
                <select 
                  value={filters.tense}
                  onChange={(e) => setFilters(prev => ({ ...prev, tense: e.target.value }))}
                  style={{ width: "100%", padding: "2px 4px", fontSize: "0.8em" }}
                >
                  <option value="all">All</option>
                  {filterOptions.tenses.map(tense => (
                    <option key={tense} value={tense}>{tense}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "2px", fontSize: "0.8em" }}>Context:</label>
                <select 
                  value={filters.context}
                  onChange={(e) => setFilters(prev => ({ ...prev, context: e.target.value }))}
                  style={{ width: "100%", padding: "2px 4px", fontSize: "0.8em" }}
                >
                  <option value="all">All</option>
                  {filterOptions.contexts.map(context => (
                    <option key={context} value={context}>{context}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={resetFilters}
              style={{
                marginTop: "8px",
                padding: "4px 8px",
                fontSize: "0.8em",
                border: "1px solid #ccc",
                borderRadius: "3px",
                background: "white",
                cursor: "pointer"
              }}
            >
              Reset Filters
            </button>
          </div>
          
          {filteredSelectedItems.length > 0 ? (
            <div>
              <h5>Items ({filteredSelectedItems.length}{selectedNodeItems.length !== filteredSelectedItems.length ? ` of ${selectedNodeItems.length}` : ''})</h5>
              <ul style={{ fontSize: "0.9em", marginBottom: "1rem" }}>
                {filteredSelectedItems.slice(0, 10).map((item, index) => (
                  <li key={index} style={{ marginBottom: "0.5rem" }}>
                    "{item.item}" 
                    <small style={{ color: "#666", display: "block" }}>
                      {item.level} • {item.tense} • {item.context}
                    </small>
                  </li>
                ))}
              </ul>
              {filteredSelectedItems.length > 10 && (
                <small style={{ color: "#666" }}>
                  ... and {filteredSelectedItems.length - 10} more items
                </small>
              )}
            </div>
          ) : selectedNodeItems.length > 0 ? (
            <p style={{ color: "#666" }}>No items match the current filters. <button onClick={resetFilters} style={{ textDecoration: "underline", border: "none", background: "none", color: "#007bff", cursor: "pointer" }}>Reset filters</button></p>
          ) : (
            <p style={{ color: "#666" }}>No items available for this node.</p>
          )}
          
          {neighborItems.length > 0 && (
            <div style={{ marginTop: "1.5rem" }}>
              <h5>Related Items from Neighbors</h5>
              {neighborItems.map(({ neighbor, items, originalCount }, neighborIndex) => (
                items.length > 0 && (
                  <div key={neighborIndex} style={{ marginBottom: "1rem" }}>
                    <h6 style={{ color: "#555", fontSize: "0.9em" }}>
                      {neighbor} 
                      {originalCount !== items.length && (
                        <small style={{ color: "#999", fontWeight: "normal" }}>
                          ({items.length} of {originalCount})
                        </small>
                      )}
                    </h6>
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