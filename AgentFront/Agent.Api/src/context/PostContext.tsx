import { useState, type ReactNode } from "react";
import { PostContext } from "./PostContextOnly";
import type { PostData } from "./PostTypes";

export function PostProvider({ children }: { children: ReactNode }) {
  const [postData, setPostData] = useState<PostData | null>(null);

  return (
    <PostContext.Provider value={{ postData, setPostData }}>
      {children}
    </PostContext.Provider>
  );
}
