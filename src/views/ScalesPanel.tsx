import { FC, useState, useMemo, ChangeEvent, KeyboardEvent } from "react";
import { useSigma } from "@react-sigma/core";
import { GrClose } from "react-icons/gr";
import { BsSearch } from "react-icons/bs";
import { Scale, FiltersState } from "../types";

function matchesStart(search: string, scale: Scale): boolean {
  const lcSearch = search.toLowerCase();
  return (
    scale.key.toLowerCase().startsWith(lcSearch) ||
    scale.name.toLowerCase().includes(lcSearch) ||
    scale.citation.toLowerCase().includes(lcSearch) ||
    scale.doi.toLowerCase().startsWith(lcSearch)
  );
}

const ScalesPanel: FC<{
  network_scales: Scale[];
  filters: FiltersState;
  setScales: (selected_scales: Set<string>) => void;
}> = ({ network_scales, setScales }) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();

  const [search, setSearch] = useState("");
  const [selectedScales, setSelectedScales] = useState<Set<string>>(new Set());

  const scaleToNodeIds = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    graph.forEachNode((node, attrs) => {
      const nodeScales = attrs.scales || [];
      nodeScales.forEach((scale: string) => {
        if (!map[scale]) map[scale] = new Set();
        map[scale].add(node);
      });
    });
    return map;
  }, [graph]);

  const filteredScales = useMemo(() => {
    if (!search) return [];
    return network_scales.filter(
      (scale) => matchesStart(search, scale) && !selectedScales.has(scale.key)
    );
  }, [search, network_scales, selectedScales]);

  const handleSelect = (scaleKey: string) => {
    const updated = new Set(selectedScales);
    updated.add(scaleKey);
    setSelectedScales(updated);
    setScales(updated);
    setSearch("");

    if (scaleToNodeIds[scaleKey]) {
      scaleToNodeIds[scaleKey].forEach((node_id) => {
        graph.setNodeAttribute(node_id, "highlighted", true);
      });
    }
  };

  const handleRemove = (scaleKey: string) => {
    const updated = new Set(selectedScales);
    updated.delete(scaleKey);
    setSelectedScales(updated);
    setScales(updated);

    if (scaleToNodeIds[scaleKey]) {
      scaleToNodeIds[scaleKey].forEach((node_id) => {
        graph.setNodeAttribute(node_id, "highlighted", false);
      });
    }
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredScales.length > 0) {
      handleSelect(filteredScales[0].key);
    }
  };

  return (
    <div>
      <div className="badge-list">
        {[...selectedScales].map((key) => (
          <div key={key} className="badge">
            {key}
            <button onClick={() => handleRemove(key)} className="badge-remove">
              <GrClose />
            </button>
          </div>
        ))}
      </div>

      <div className="search-wrapper">
        <input
          type="search"
          placeholder="Search for a scale..."
          value={search}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          className="scales-input"
        />
        <BsSearch className="icon" />

        {search && filteredScales.length > 0 && (
          <ul className="scales-dropdown">
            {filteredScales.map((scale) => (
              <li
                key={scale.key}
                onClick={() => handleSelect(scale.key)}
                className="scales-dropdown-item"
              >
                <strong>{scale.key}</strong>: {scale.name} ({scale.citation})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ScalesPanel;

