import { useContext } from 'react';
import { ImagePreferencesContext } from './ImagePreferencesContextOnly';

export function useImagePreferences() {
  const context = useContext(ImagePreferencesContext);
  if (context === undefined) {
    throw new Error('useImagePreferences must be used within an ImagePreferencesProvider');
  }
  return context;
}
