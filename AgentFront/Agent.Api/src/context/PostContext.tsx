import React, { createContext, useContext, useState } from "react";

interface ToolCall {
  name: string;
  arguments?: any;
  result?: any;
}

interface PostData {
  message: string;
  imageUrl?: string;
  imageDockerUrl?: string;
  toolCalls?: ToolCall[];
}

interface PostContextType {
  postData: PostData | null;
  setPostData: (data: PostData | null) => void;
}

const PostContext = createContext<PostContextType | undefined>(undefined);

export function PostProvider({ children }: { children: React.ReactNode }) {
  const [postData, setPostData] = useState<PostData | null>(null);

  return (
    <PostContext.Provider value={{ postData, setPostData }}>
      {children}
    </PostContext.Provider>
  );
}

export function usePost() {
  const context = useContext(PostContext);
  if (context === undefined) {
    throw new Error("usePost must be used within a PostProvider");
  }
  return context;
}
