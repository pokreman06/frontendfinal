export interface ToolCall {
  name: string;
  arguments?: Record<string, unknown>;
  result?: Record<string, unknown> | string;
}

export interface PostData {
  message: string;
  imageUrl?: string;
  imageDockerUrl?: string;
  toolCalls?: ToolCall[];
}

export interface PostContextType {
  postData: PostData | null;
  setPostData: (data: PostData | null) => void;
}
