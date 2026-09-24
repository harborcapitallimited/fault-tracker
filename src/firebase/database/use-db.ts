'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, Query, DatabaseReference } from 'firebase/database';
import { useDatabase } from '../provider';

/**
 * Custom hook to subscribe to a list of data from Realtime Database.
 * Returns the data as an array with IDs.
 */
export function useRTDBList<T = any>(path: string | null) {
  const database = useDatabase();
  const [data, setData] = useState<(T & { id: string })[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!database || !path) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const dbRef = ref(database, path);

    const unsubscribe = onValue(dbRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        // Convert object of objects to array with IDs
        const result = Object.entries(val).map(([id, item]: [string, any]) => ({
          ...item,
          id,
        }));
        setData(result);
      } else {
        setData([]);
      }
      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error(`RTDB Error at ${path}:`, err);
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [database, path]);

  return { data, isLoading, error };
}

/**
 * Custom hook to subscribe to a single item from Realtime Database.
 */
export function useRTDBItem<T = any>(path: string | null) {
  const database = useDatabase();
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!database || !path) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const dbRef = ref(database, path);

    const unsubscribe = onValue(dbRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData({ ...val, id: snapshot.key! });
      } else {
        setData(null);
      }
      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error(`RTDB Error at ${path}:`, err);
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [database, path]);

  return { data, isLoading, error };
}
