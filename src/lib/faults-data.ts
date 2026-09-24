'use client';
import { useRTDBList } from '@/firebase/database/use-db';
import { ref, push, set, remove } from 'firebase/database';
import { useDatabase } from '@/firebase';
import type { FaultOption } from './types';

export function useFaultsData() {
  const database = useDatabase();
  const { data: faultOptions, isLoading } = useRTDBList<FaultOption>('faults');

  const addFaultOption = async (option: Omit<FaultOption, 'id'>) => {
    if (!database) throw new Error("Database not available");
    const newRef = push(ref(database, 'faults'));
    const newOption = { ...option, id: newRef.key! };
    await set(newRef, newOption);
    return newOption;
  };

  const deleteFaultOption = async (id: string) => {
    if (!database) throw new Error("Database not available");
    await remove(ref(database, `faults/${id}`));
  };

  return {
    faultOptions,
    isLoading,
    addFaultOption,
    deleteFaultOption,
  };
}
