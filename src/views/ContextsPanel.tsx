import { useSigma } from "@react-sigma/core";
import { keyBy, mapValues, sortBy, values } from "lodash";
import { FC, useEffect, useMemo, useState } from "react";
import { AiOutlineCheckCircle, AiOutlineCloseCircle } from "react-icons/ai";
import { MdLabel } from "react-icons/md";
import { BiRadioCircleMarked } from "react-icons/bi";

import { FiltersState } from "../types";
import Panel from "./Panel";

export interface Context {
  key: string;
  label: string;
}

const ContextsPanel: FC<{
  contexts: Context[];
  filters: FiltersState;
  toggleContext: (context: string) => void;
  setContexts: (contexts: Record<string, boolean>) => void;
}> = ({ contexts, filters, toggleContext, setContexts }) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const [isolateMode, setIsolateMode] = useState(false);
  const [isolatedContext, setIsolatedContext] = useState<string | null>(null);
  const submissionsPerContext = useMemo(() => {
    const index: Record<string, number> = {};
    graph.forEachNode((_, nodeData) => {
      // Get contexts from the node's contexts array
      const nodeContexts = nodeData.contexts || [];
      // Count each unique context once per node
      nodeContexts.forEach((ctx: string) => {
        index[ctx] = (index[ctx] || 0) + 1;
      });
    });
    return index;
  }, []);

  const maxSubmissionsPerContext = useMemo(
    () => Math.max(...values(submissionsPerContext), 1),
    [submissionsPerContext]
  );
  const visibleContextsCount = useMemo(() => Object.keys(filters.contexts).length, [filters]);

  const [visibleSubmissionsPerContext, setVisibleSubmissionsPerContext] = useState<Record<string, number>>(
    submissionsPerContext
  );

  useEffect(() => {
    // To ensure the graphology instance has up to date "hidden" values for
    // nodes, we wait for next frame before reindexing. This won't matter in the
    // UX, because of the visible nodes bar width transition.
    requestAnimationFrame(() => {
      const index: Record<string, number> = {};
      graph.forEachNode((_, nodeData) => {
        if (!nodeData.hidden) {
          // Get contexts from the node's contexts array
          const nodeContexts = nodeData.contexts || [];
          // Count each unique context once per node
          nodeContexts.forEach((ctx: string) => {
            index[ctx] = (index[ctx] || 0) + 1;
          });
        }
      });
      setVisibleSubmissionsPerContext(index);
    });
  }, [filters]);

  const sortedContexts = useMemo(
    () => sortBy(contexts, (context) => -(submissionsPerContext[context.key] || 0)),
    [contexts, submissionsPerContext]
  );

  const handleContextClick = (contextKey: string) => {
    if (isolateMode) {
      // In isolate mode
      if (isolatedContext === contextKey) {
        // Clicking the same context: show all contexts
        setIsolatedContext(null);
        setContexts(mapValues(keyBy(contexts, "key"), () => true));
      } else {
        // Clicking a different context: isolate only that context
        setIsolatedContext(contextKey);
        setContexts({ [contextKey]: true });
      }
    } else {
      // Normal mode: toggle context
      toggleContext(contextKey);
    }
  };

  const handleIsolateModeToggle = () => {
    if (isolateMode) {
      // Turning off isolate mode: show all contexts and re-enable buttons
      setIsolateMode(false);
      setIsolatedContext(null);
      setContexts(mapValues(keyBy(contexts, "key"), () => true));
    } else {
      // Turning on isolate mode: show all contexts initially
      setIsolateMode(true);
      setIsolatedContext(null);
      setContexts(mapValues(keyBy(contexts, "key"), () => true));
    }
  };

  return (
    <Panel
      title={
        <>
          <MdLabel className="text-muted" /> Contexts
          {visibleContextsCount < contexts.length ? (
            <span className="text-muted text-small">
              {" "}
              ({visibleContextsCount} / {contexts.length})
            </span>
          ) : (
            ""
          )}
        </>
      }
    >
      <p>
        <i className="text-muted">Click a context to show/hide related pages from the network.</i>
      </p>
      <p className="buttons">
        <button 
          className="btn" 
          onClick={() => setContexts(mapValues(keyBy(contexts, "key"), () => true))}
          disabled={isolateMode}
          style={isolateMode ? { opacity: 0.5, cursor: "not-allowed" } : {}}
        >
          <AiOutlineCheckCircle /> Check all
        </button>{" "}
        <button 
          className="btn" 
          onClick={() => setContexts({})}
          disabled={isolateMode}
          style={isolateMode ? { opacity: 0.5, cursor: "not-allowed" } : {}}
        >
          <AiOutlineCloseCircle /> Uncheck all
        </button>{" "}
        <button 
          className={`btn ${isolateMode ? "active" : ""}`}
          onClick={handleIsolateModeToggle}
          style={isolateMode ? { backgroundColor: "#5a67d8", color: "white" } : {}}
        >
          <BiRadioCircleMarked /> Isolate one
        </button>
      </p>
      <ul>
        {sortedContexts.map((context) => {
          const submissionsCount = submissionsPerContext[context.key] || 0;
          const visibleSubmissionsCount = visibleSubmissionsPerContext[context.key] || 0;
          return (
            <li
              className="caption-row"
              key={context.key}
              title={`${submissionsCount} node${submissionsCount !== 1 ? "s" : ""}${
                visibleSubmissionsCount !== submissionsCount
                  ? visibleSubmissionsCount > 0
                    ? ` (only ${visibleSubmissionsCount !== 1 ? `${visibleSubmissionsCount} are` : "one is"} visible)`
                    : " (all hidden)"
                  : ""
              }`}
            >
              <input
                type="checkbox"
                checked={filters.contexts[context.key] || false}
                onChange={() => handleContextClick(context.key)}
                id={`context-${context.key}`}
              />
              <label htmlFor={`context-${context.key}`}>
                <div className="node-label">
                  <span>{context.label}</span>
                  <div className="bar" style={{ width: (100 * submissionsCount) / maxSubmissionsPerContext + "%" }}>
                    <div
                      className="inside-bar"
                      style={{
                        width: (100 * visibleSubmissionsCount) / submissionsCount + "%",
                      }}
                    />
                  </div>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
};

export default ContextsPanel;
