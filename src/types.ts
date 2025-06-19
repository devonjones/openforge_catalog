export interface Image {
  created_at: string;
  id: string;
  image_name: string;
  image_url: string;
  updated_at: string;
}

export interface ConfigTag {
  tag: string;
}

export type ConstrainTag = 
  | { tag: string; siblings?: string[]; parent?: boolean }
  | { filter: string };

export interface ConfigTags {
  accept?: ConfigTag[];
  require?: ConfigTag[];
  deny?: ConfigTag[];
  constrain?: ConstrainTag[];
}

export interface ConfigPart {
  name: string;
  tags: ConfigTags;
  fulfills?: { part: string }[];
}

export interface BlueprintConfig {
  parts?: ConfigPart[];
  fulfills?: { part: string }[];
}

export interface Blueprint {
  blueprint_name: string;
  blueprint_type: string;
  blueprint_config?: BlueprintConfig;
  created_at: string;
  file_changed_at: string;
  file_md5: string;
  file_modified_at: string;
  file_name: string;
  file_size: number;
  full_name: string;
  id: string;
  images: Image[];
  signed_url: string;
  storage_address: string;
  tags: string[];
  updated_at: string;
}

export interface TagNode {
  __count?: number;
  __totalCount?: number;
  __subTags?: number;
  children?: Record<string, TagNode>;
  [key: string]: unknown;
}

export interface Paging {
  previous_token: string | undefined;
  next_token: string | undefined;
  total_count: number;
  start_count: number;
}
