import { createContext } from "react";
import type { PostContextType } from "./PostTypes";

export const PostContext = createContext<PostContextType | undefined>(undefined);
