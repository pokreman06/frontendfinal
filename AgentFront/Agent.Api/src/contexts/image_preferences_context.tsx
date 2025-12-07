import { useState, type ReactNode } from 'react';
import { ImagePreferencesContext } from './ImagePreferencesContextOnly';
import type { PreferenceItem } from './image_preferences_types';

export function ImagePreferencesProvider({ children }: { children: ReactNode }) {
  const [themes, setThemes] = useState<PreferenceItem[]>([
    { id: 1, name: "Anime", active: true },
    { id: 2, name: "Realistic", active: true },
    { id: 3, name: "Cartoon", active: false },
    { id: 4, name: "Cyberpunk", active: true },
    { id: 5, name: "Fantasy", active: false },
  ]);

  const [moods, setMoods] = useState<PreferenceItem[]>([
    { id: 1, name: "Vibrant", active: true },
    { id: 2, name: "Dark", active: false },
    { id: 3, name: "Peaceful", active: true },
    { id: 4, name: "Energetic", active: false },
    { id: 5, name: "Mysterious", active: true },
    { id: 6, name: "Whimsical", active: false },
  ]);

  const addTheme = (name: string) => {
    if (name.trim()) {
      setThemes([...themes, { 
        id: Date.now(), 
        name: name.trim(), 
        active: true 
      }]);
    }
  };

  const addMood = (name: string) => {
    if (name.trim()) {
      setMoods([...moods, { 
        id: Date.now(), 
        name: name.trim(), 
        active: true 
      }]);
    }
  };

  const toggleTheme = (id: number) => {
    setThemes(themes.map(theme => 
      theme.id === id ? { ...theme, active: !theme.active } : theme
    ));
  };

  const toggleMood = (id: number) => {
    setMoods(moods.map(mood => 
      mood.id === id ? { ...mood, active: !mood.active } : mood
    ));
  };

  const removeTheme = (id: number) => {
    setThemes(themes.filter(theme => theme.id !== id));
  };

  const removeMood = (id: number) => {
    setMoods(moods.filter(mood => mood.id !== id));
  };

  const getActiveThemes = () => themes.filter(t => t.active);
  
  const getActiveMoods = () => moods.filter(m => m.active);

  return (
    <ImagePreferencesContext.Provider
      value={{
        themes,
        moods,
        addTheme,
        addMood,
        toggleTheme,
        toggleMood,
        removeTheme,
        removeMood,
        getActiveThemes,
        getActiveMoods,
      }}
    >
      {children}
    </ImagePreferencesContext.Provider>
  );
}