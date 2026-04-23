import { useState, useEffect, useCallback, useRef } from 'react';
import { paymentService } from '../services/supabaseService';

/**
 * Generic hook for Supabase data fetching.
 * Returns { data, loading, error, refetch, setData }.
 */
export function useSupabase(fetchFn) {
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRef.current();
      setData(Array.isArray(result) ? result : result ? [result] : []);
    } catch (err) {
      console.error('Supabase fetch failed:', err?.message || err);
      setData([]);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { doFetch(); }, [doFetch]);

  return { data, loading, error, refetch: doFetch, setData };
}

/**
 * Hook for a single record by ID.
 */
export function useSupabaseById(fetchFn, id) {
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await fetchRef.current(id);
        if (!cancelled) {
          setData(result ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Supabase fetch by ID failed:', err.message);
          setData(null);
          setError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) load();
    return () => { cancelled = true; };
  }, [id, tick]);

  return { data, loading, error, setData, refetch };
}

/**
 * Hook for fetching payments by invoice ID.
 */
export function usePaymentsByInvoice(invoiceId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!invoiceId) {
        setData([]);
        return;
      }
      setLoading(true);
      try {
        const result = await paymentService.listByInvoice(invoiceId);
        if (!cancelled) setData(result || []);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch payments:', err.message);
          setError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [invoiceId]);

  return { data, loading, error, setData };
}

/**
 * Hook for fetching all payments.
 */
export function usePayments() {
  return useSupabase(paymentService.list);
}
