export interface NodeData {
  key: string;
  label: string;
  tag: string;
  URL: string;
  cluster: string;
  submissions: Set<number>;
  x: number;
  y: number;
  z: number;
  pos_2d_x: number;
  pos_2d_y: number;
  pos_nd_0: number;
  pos_nd_1: number;
  pos_nd_2: number;
  items: Item[];
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
  contributor_ids: string
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
  edges: [string, string, number][];
  clusters: Cluster[];
  tags: Tag[];
  submissions: Submission[];
}

export interface FiltersState {
  clusters: Record<string, boolean>;
  tags: Record<string, boolean>;
  contexts: Record<string, boolean>;
  selected_submissions: Set<number>;
}


export interface Item {
  item: string;
  level: string
  tense: string;
  response_categories: string[];
  direction: number;
  context: string;
  item_submission_id: number;
  ai_drafted: boolean;
  edited: boolean;
}

