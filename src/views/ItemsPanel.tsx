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
  showNeighborHeadings: boolean;
  showAiDrafted: boolean;
  showOnlyEdited: boolean;
}

const ItemsPanel: FC<ItemsPanelProps> = ({ selectedNode }) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();

  const [filters, setFilters] = useState<FilterState>({
    level: "all",
    tense: "all",
    context: "all",
    showNeighborHeadings: true,
    showAiDrafted: true,
    showOnlyEdited: false
  });

  // Get items for the selected node
  const selectedNodeItems: Item[] = selectedNode ? (graph.getNodeAttribute(selectedNode, "items") || []) : [];
  
  // Get unique values for filter options
  const allItems = useMemo(() => {
    const items = [...selectedNodeItems];
    // Add neighbor items for filter options
    if (selectedNode) {
      const neighbors = graph.neighbors(selectedNode).filter(neighbor => neighbor !== selectedNode);
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
      if (!filters.showAiDrafted && item.ai_drafted) return false;
      if (filters.showOnlyEdited && !item.edited) return false;
      return true;
    });
  };

  // Apply filters to selected node items
  const filteredSelectedItems = filterItems(selectedNodeItems);
  
  // Get items for the 5 most closely linked neighbors
  const getNeighborItems = (): { neighbor: string; items: Item[]; originalCount: number; weight: number }[] => {
    if (!selectedNode) return [];
    
    const neighbors = graph.neighbors(selectedNode).filter(neighbor => neighbor !== selectedNode);
    
    // Get all neighbor items with their labels, weights, and apply filters
    const neighborItems = neighbors.map(neighbor => {
      const originalItems = graph.getNodeAttribute(neighbor, "items") || [];
      const filteredItems = filterItems(originalItems);
      
      // Get the edge weight between selectedNode and this neighbor
      // Try both directions since the graph might be directed
      let edgeWeight = 0;
      try {
        if (graph.hasEdge(selectedNode, neighbor)) {
          edgeWeight = graph.getEdgeAttribute(selectedNode, neighbor, "weight") || 0;
        } else if (graph.hasEdge(neighbor, selectedNode)) {
          edgeWeight = graph.getEdgeAttribute(neighbor, selectedNode, "weight") || 0;
        }
      } catch (error) {
        console.warn("Could not find edge weight between", selectedNode, "and", neighbor);
        edgeWeight = 0;
      }
      
      return {
        neighbor: graph.getNodeAttribute(neighbor, "label") || neighbor,
        items: filteredItems,
        originalCount: originalItems.length,
        weight: edgeWeight
      };
    })
    .sort((a, b) => b.weight - a.weight) // Sort by weight in descending order (highest weight first)
    .slice(0, 5); // Take top 5 neighbors by weight
    
    return neighborItems;
  };

  const neighborItems = getNeighborItems();

  const resetFilters = () => {
    setFilters({
      level: "all",
      tense: "all", 
      context: "all",
      showNeighborHeadings: true,
      showAiDrafted: true,
      showOnlyEdited: false
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
            <div style={{ marginTop: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", fontSize: "0.8em", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={filters.showNeighborHeadings}
                  onChange={(e) => setFilters(prev => ({ ...prev, showNeighborHeadings: e.target.checked }))}
                  style={{ marginRight: "5px" }}
                />
                Show neighbor headings
              </label>
            </div>
            <div style={{ marginTop: "4px" }}>
              <label style={{ display: "flex", alignItems: "center", fontSize: "0.8em", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={filters.showAiDrafted}
                  onChange={(e) => setFilters(prev => ({ ...prev, showAiDrafted: e.target.checked }))}
                  style={{ marginRight: "5px" }}
                />
                Show AI drafted items
              </label>
            </div>
            <div style={{ marginTop: "4px" }}>
              <label style={{ display: "flex", alignItems: "center", fontSize: "0.8em", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={filters.showOnlyEdited}
                  onChange={(e) => setFilters(prev => ({ ...prev, showOnlyEdited: e.target.checked }))}
                  style={{ marginRight: "5px" }}
                />
                Only show human-edited items
              </label>
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
              <ul style={{ fontSize: "0.9em", marginBottom: "0.4rem" }}>
                {filteredSelectedItems.slice(0, 10).map((item, index) => (
                  <li key={index} style={{ marginBottom: "0.2rem" }}>
                    "{item.item}" 
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
            <div>
              {filters.showNeighborHeadings && (<h5>Items from Neighbors</h5>)
              }
              {neighborItems.map(({ neighbor, items, originalCount, weight }, neighborIndex) => (
                items.length > 0 && (
                  <div key={neighborIndex} style={{ marginBottom: filters.showNeighborHeadings ? "0.2rem" : "0" }}>
                    {filters.showNeighborHeadings && (
                      <h6 style={{ color: "#555", fontSize: "0.9em", marginTop: "1rem" , marginBottom: "0.5rem" }}>
                        {neighbor} 
                        <small style={{ color: "#999", fontWeight: "normal" }}>
                          {" "}(edge weight: {weight.toFixed(2)}
                          {originalCount !== items.length && `, ${items.length} of ${originalCount} items`}
                          {originalCount === items.length && `, ${items.length} items`})
                        </small>
                      </h6>
                    )}
                    <ul style={{ 
                      fontSize: "0.8em", 
                      marginTop: filters.showNeighborHeadings ? "0" : "0",
                      marginBottom: filters.showNeighborHeadings ? "0" : "0"
                    }}>
                      {items.map((item, index) => (
                        <li key={index} style={{ marginBottom: "0.3rem" }}>
                          "{item.item}"
                        </li>
                      ))}
                    </ul>
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