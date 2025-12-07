import { createContext } from 'react';
import type { ImagePreferencesContextType } from './image_preferences_types';

export const ImagePreferencesContext = createContext<ImagePreferencesContextType | undefined>(undefined);
