import { FullScreenControl, SigmaContainer, ZoomControl } from "@react-sigma/core";
import { createNodeImageProgram } from "@sigma/node-image";
// import EdgeCurveProgram from "@sigma/edge-curve";
import { DirectedGraph } from "graphology";
import { constant, keyBy, mapValues, omit } from "lodash";
import { FC, useEffect, useMemo, useState } from "react";
import { BiBookContent, BiRadioCircleMarked } from "react-icons/bi";
import { BsArrowsFullscreen, BsFullscreenExit, BsZoomIn, BsZoomOut } from "react-icons/bs";
import { GrClose } from "react-icons/gr";
import { Settings } from "sigma/settings";

import { drawHover, drawLabel } from "../canvas-utils";
import { Dataset, FiltersState } from "../types";
import ClustersPanel from "./ClustersPanel";
import DescriptionPanel from "./DescriptionPanel";
import GraphDataController from "./GraphDataController";
import GraphEventsController from "./GraphEventsController";
import GraphSettingsController from "./GraphSettingsController";
import GraphTitle from "./GraphTitle";
import imageMap from './imageMap';
import SearchField from "./SearchField";
import SubmissionsPanel from "./SubmissionsPanel";
// import TagsPanel from "./TagsPanel";
import dataset from "../dataset.json";



const Root: FC = () => {
  const graph = useMemo(() => new DirectedGraph(), []);
  const [showContents, setShowContents] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [datasetState, setDataset] = useState<Dataset | null>(null);
  const [filtersState, setFiltersState] = useState<FiltersState>({
    clusters: {},
    tags: {},
    selected_submissions: new Set(),
  });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const sigmaSettings: Partial<Settings> = useMemo(
    () => ({
      nodeProgramClasses: {
        image: createNodeImageProgram({
          size: { mode: "force", value: 256 },
        }),
      },
      defaultDrawNodeLabel: drawLabel,
      defaultDrawNodeHover: drawHover,
      defaultNodeType: "image",
      defaultEdgeType: "line",
      labelDensity: 0.07,
      labelGridCellSize: 60,
      labelRenderedSizeThreshold: 15,
      labelFont: "Lato, sans-serif",
      zIndex: true,
      zoomToSizeRatioFunction: (ratio: number) => ratio,
      // edgeProgramClasses: {
      //   curved: EdgeCurveProgram,
      // },
    }),
    [],
  );

  // Load data on mount:
  useEffect(() => {
    if (datasetState !== null) return; // already set

    const nodes_by_key = keyBy(dataset.nodes, "key");
    const clusters = keyBy(dataset.clusters, "key");
    const tags = keyBy(dataset.tags, "key");
    
    dataset.nodes.forEach((node) =>
      graph.addNode(node.key, {
        ...node,
        submissions: new Set(node.submissions), // Convert to Set<string>
        ...omit(clusters[node.cluster], "key"),
        color_backup: clusters[node.cluster].color,
        image: imageMap[tags[node.tag].image],
      }),
    );
    dataset.edges.forEach(([source, target]) => {
      graph.addEdge(source, target, {
          size: 0.05,
          color: clusters[nodes_by_key[source].cluster].color,
        })
    });

    // Use size as node sizes:
    graph.forEachNode((node) => {
      const radius = (graph.getNodeAttribute(node, "size"))**0.5 * 0.5;
      graph.setNodeAttribute(node,"size", radius)
    });

    setFiltersState({
      clusters: mapValues(keyBy(dataset.clusters, "key"), constant(true)),
      tags: mapValues(keyBy(dataset.tags, "key"), constant(true)),
      selected_submissions: new Set(),
    });
    const safeDataset: Dataset = {
      ...dataset,
      nodes: dataset.nodes.map((node) => ({
          ...node,
          submissions: new Set(node.submissions),
      })),
      edges: dataset.edges.map(
        (edge) => [edge[0], edge[1]] as [string, string]
      ),
    };
    setDataset(safeDataset);
    requestAnimationFrame(() => setDataReady(true));
  }, [datasetState]);

  if (!datasetState) return null;

  return (
    <div id="app-root" className={showContents ? "show-contents" : ""}>
      <SigmaContainer graph={graph} settings={sigmaSettings} className="react-sigma">
        <GraphSettingsController hoveredNode={hoveredNode} />
        <GraphEventsController setHoveredNode={setHoveredNode} />
        <GraphDataController filters={filtersState} />

        {dataReady && (
          <>
            <div className="controls">
              <div className="react-sigma-control ico">
                <button
                  type="button"
                  className="show-contents"
                  onClick={() => setShowContents(true)}
                  title="Show caption and description"
                >
                  <BiBookContent />
                </button>
              </div>
              <FullScreenControl className="ico">
                <BsArrowsFullscreen />
                <BsFullscreenExit />
              </FullScreenControl>

              <ZoomControl className="ico">
                <BsZoomIn />
                <BsZoomOut />
                <BiRadioCircleMarked />
              </ZoomControl>
            </div>
            <div className="contents">
              <div className="ico">
                <button
                  type="button"
                  className="ico hide-contents"
                  onClick={() => setShowContents(false)}
                  title="Show caption and description"
                >
                  <GrClose />
                </button>
              </div>
              <GraphTitle filters={filtersState} />
              <div className="panels">
                <SubmissionsPanel
                  network_submissions={datasetState.submissions}
                  filters={filtersState}
                  setSubmissions={(selected_submissions) =>
                    setFiltersState((filters) => ({
                      ...filters,
                      selected_submissions,
                    }))
                  }
                />
                <SearchField filters={filtersState} />
                <DescriptionPanel />
                <ClustersPanel
                  clusters={datasetState.clusters}
                  filters={filtersState}
                  setClusters={(clusters) =>
                    setFiltersState((filters) => ({
                      ...filters,
                      clusters,
                    }))
                  }
                  toggleCluster={(cluster) => {
                    setFiltersState((filters) => ({
                      ...filters,
                      clusters: filters.clusters[cluster]
                        ? omit(filters.clusters, cluster)
                        : { ...filters.clusters, [cluster]: true },
                    }));
                  }}
                />
                {/* <TagsPanel
                  tags={datasetState.tags}
                  filters={filtersState}
                  setTags={(tags) =>
                    setFiltersState((filters) => ({
                      ...filters,
                      tags,
                    }))
                  }
                  toggleTag={(tag) => {
                    setFiltersState((filters) => ({
                      ...filters,
                      tags: filters.tags[tag] ? omit(filters.tags, tag) : { ...filters.tags, [tag]: true },
                    }));
                  }}
                /> */}
              </div>
            </div>
          </>
        )}
      </SigmaContainer>
    </div>
  );
};

export default Root;
