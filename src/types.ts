export interface NodeData {
  key: string;
  label: string;
  tag: string;
  URL: string;
  cluster: string;
  submissions: Set<string>;
  x: number;
  y: number;
}

export interface Cluster {
  key: string;
  color: string;
  clusterLabel: string;
}

export interface Tag {
  key: string;
  image: string;
}

export interface Submission {
  key: string;
  scale_abbr: string;
  scale_name: string;
  citation: string;
  doi: string;
}

export interface Dataset {
  nodes: NodeData[];
  edges: [string, string][];
  clusters: Cluster[];
  tags: Tag[];
  submissions: Submission[];
}

export interface FiltersState {
  clusters: Record<string, boolean>;
  tags: Record<string, boolean>;
  selected_submissions: Set<string>;
}
