export interface Image {
  created_at: string;
  id: string;
  image_name: string;
  image_url: string;
  updated_at: string;
}

export interface Blueprint {
  blueprint_name: string;
  blueprint_type: string;
  config: string;
  created_at: string;
  file_changed_at: string;
  file_md5: string;
  file_modified_at: string;
  file_name: string;
  file_size: number;
  full_name: string;
  id: string;
  images: Image[];
  storage_address: string;
  tags: string[];
  updated_at: string;
}

export interface TagNode {
  __count?: number;
  __totalCount?: number;
  __subTags?: number;
  children?: Record<string, TagNode>;
  [key: string]: any;
}

export interface Paging {
  previous_token: string | undefined;
  next_token: string | undefined;
  total_count: number;
  start_count: number;
}
