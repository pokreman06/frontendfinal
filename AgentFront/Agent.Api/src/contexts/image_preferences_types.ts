export interface PreferenceItem {
  id: number;
  name: string;
  active: boolean;
}

export interface ImagePreferencesContextType {
  themes: PreferenceItem[];
  moods: PreferenceItem[];
  addTheme: (name: string) => void;
  addMood: (name: string) => void;
  toggleTheme: (id: number) => void;
  toggleMood: (id: number) => void;
  removeTheme: (id: number) => void;
  removeMood: (id: number) => void;
  getActiveThemes: () => PreferenceItem[];
  getActiveMoods: () => PreferenceItem[];
}
