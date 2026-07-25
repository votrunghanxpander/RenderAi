
import { HistoryItem } from '../../types';

// In-memory storage for the session
// We don't use localStorage for images because Base64 strings will quickly exceed the 5MB quota.
let globalHistory: HistoryItem[] = [];

export const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
  const newItem: HistoryItem = {
    ...item,
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date(),
  };
  // Add to beginning of array
  globalHistory.unshift(newItem);
};

export const getHistory = (): HistoryItem[] => {
  return globalHistory;
};

export const getHistoryByType = (type: string): HistoryItem[] => {
  if (type === 'ALL') return globalHistory;
  return globalHistory.filter(item => item.type === type);
};

export const clearHistory = () => {
  globalHistory = [];
};
