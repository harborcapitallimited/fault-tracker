'use client';
import { useRTDBList } from '@/firebase/database/use-db';
import { ref, push, set, remove } from 'firebase/database';
import { useDatabase } from '@/firebase';
import type { ActionOption } from './types';

export function useActionsData() {
  const database = useDatabase();
  const { data: actionOptions, isLoading } = useRTDBList<ActionOption>('actionOptions');

  const addActionOption = async (option: Omit<ActionOption, 'id'>) => {
    if (!database) throw new Error("Database not available");
    const newRef = push(ref(database, 'actionOptions'));
    const newOption = { ...option, id: newRef.key! };
    await set(newRef, newOption);
    return newOption;
  };

  const deleteActionOption = async (id: string) => {
    if (!database) throw new Error("Database not available");
    await remove(ref(database, `actionOptions/${id}`));
  };

  return {
    actionOptions,
    isLoading,
    addActionOption,
    deleteActionOption,
  };
}
