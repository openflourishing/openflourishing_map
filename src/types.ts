export interface NodeData {
  key: string;
  label: string;
  tag: string;
  URL: string;
  cluster: string;
  submissions: Set<number>;
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
  key: number;
  datetime: string;
  contributor_id: number
  citation: string;
  scale_name: string;
  scale_abbr: string;
  doi: string;
  issn: string;
  isbn: string;
  context: string;
  notes: string;
  language: string;
  type: string;
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
  selected_submissions: Set<number>;
}
