// Client-side compare list (DEAD-06). Only product ids are stored; the compare
// page re-hydrates names, prices and stock from the server so a stale
// localStorage snapshot can never be displayed.
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'oylkka_compare_products';
const UPDATE_EVENT = 'oylkka:compare-updated';

export const MAX_COMPARE = 4;

export function getCompareIds(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((entry): entry is string => typeof entry === 'string')
      .slice(0, MAX_COMPARE);
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: this is fine
    console.error('Failed to parse stored compare products:', error);
    return [];
  }
}

function setCompareIds(ids: string[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(ids.slice(0, MAX_COMPARE)),
    );
    window.dispatchEvent(new Event(UPDATE_EVENT));
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: this is fine
    console.error('Failed to persist compare products:', error);
  }
}

export type AddCompareResult = 'added' | 'exists' | 'full';

export function addToCompare(productId: string): AddCompareResult {
  const ids = getCompareIds();
  if (ids.includes(productId)) return 'exists';
  if (ids.length >= MAX_COMPARE) return 'full';
  setCompareIds([...ids, productId]);
  return 'added';
}

export function removeFromCompare(productId: string) {
  setCompareIds(getCompareIds().filter((id) => id !== productId));
}

export function clearCompare() {
  setCompareIds([]);
}

export function useCompareIds(): string[] {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(getCompareIds());
    const update = () => setIds(getCompareIds());
    window.addEventListener(UPDATE_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(UPDATE_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return ids;
}
