import { FC, useState, useMemo, ChangeEvent, KeyboardEvent } from "react";
import { useSigma } from "@react-sigma/core";
import { GrClose } from "react-icons/gr";
import { BsSearch } from "react-icons/bs";
import { Submission, FiltersState } from "../types";

function matchesStart(search: string, submission: Submission): boolean {
  const lcSearch = search.toLowerCase();
  return (
    submission.scale_abbr.toLowerCase().startsWith(lcSearch) ||
    submission.scale_name.toLowerCase().includes(lcSearch) ||
    submission.citation.toLowerCase().includes(lcSearch) ||
    submission.doi.toLowerCase().startsWith(lcSearch)
  );
}

const SubmissionsPanel: FC<{
  network_submissions: Submission[];
  filters: FiltersState;
  setSubmissions: (selected_submissions: Set<number>) => void;
}> = ({ network_submissions, setSubmissions }) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();

  const [search, setSearch] = useState("");
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<number>>(new Set());

  const submissionMap = useMemo(() => {
    const map: Record<string, Submission> = {};
    Object.values(network_submissions).forEach((submission) => {
      map[submission.key] = submission;
    });
    return map;
  }, [network_submissions]);

  const submissionToNodeIds = useMemo(() => {
    const map: Record<number, Set<string>> = {};
    graph.forEachNode((node, attrs) => {
      const nodeSubmissions = attrs.submissions || [];
      nodeSubmissions.forEach((submission: number) => {
        if (!map[submission]) map[submission] = new Set();
        map[submission].add(node);
      });
    });
    return map;
  }, [graph]);

  const filteredSubmissions = useMemo(() => {
    if (!search) return [];
    return Object.values(submissionMap).filter(
      (submission) => matchesStart(search, submission) && !selectedSubmissions.has(submission.key)
    );
  }, [search, submissionMap, selectedSubmissions]);

  const handleSelect = (submissionKey: number) => {
    const updated = new Set(selectedSubmissions);
    updated.add(submissionKey);
    setSelectedSubmissions(updated);
    setSubmissions(updated);
    setSearch("");

    if (submissionToNodeIds[submissionKey]) {
      submissionToNodeIds[submissionKey].forEach((node_id) => {
        graph.setNodeAttribute(node_id, "color", "#ebc934");
      });
    }
  };

  const handleRemove = (submissionKey: number) => {
    const updated = new Set(selectedSubmissions);
    updated.delete(submissionKey);
    setSelectedSubmissions(updated);
    setSubmissions(updated);

    if (submissionToNodeIds[submissionKey]) {
      submissionToNodeIds[submissionKey].forEach((node_id: string) => {
        const color = graph.getNodeAttribute(node_id, "color_backup");
        graph.setNodeAttribute(node_id, "color", color);
      });
    }
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredSubmissions.length > 0) {
      handleSelect(filteredSubmissions[0].key);
    }
  };

  return (
    <div>
      <div className="badge-list">
        {[...selectedSubmissions].map((key) => (
          <div key={key} className="badge">
            {
              submissionMap[key].scale_abbr != "none"
                ? submissionMap[key].scale_abbr
                : submissionMap[key].citation.match(/^[^,\s]+/)?.[0] + "..."
            }
            <button onClick={() => handleRemove(key)} className="badge-remove">
              <GrClose />
            </button>
          </div>
        ))}
      </div>

      <div className="search-wrapper">
        <input
          type="search"
          placeholder="Search for a source..."
          value={search}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          className="submissions-input"
        />
        <BsSearch className="icon" />

        {search && filteredSubmissions.length > 0 && (
          <ul className="submissions-dropdown">
            {filteredSubmissions.map((submission) => (
              <li
                key={submission.key}
                onClick={() => handleSelect(submission.key)}
                className="submissions-dropdown-item"
              >
                <strong>
                  {submission.scale_abbr == "none" 
                  ? "" 
                  : submission.scale_name + 
                  submission.scale_abbr == "none" 
                  ? "" 
                  : " (" + submission.scale_abbr  + "): "}
                </strong>{submission.citation}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SubmissionsPanel;

