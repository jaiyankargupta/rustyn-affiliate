/// <reference types="vite/client" />
import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL as string;

export function useApi() {
  const { accessToken, refreshAccess } = useAuth();

  const call = useCallback(async (path: string, options: RequestInit = {}): Promise<any> => {
    const doRequest = async (token: string | null) => {
      return fetch(`${API}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
    };

    let res = await doRequest(accessToken);

    if (res.status === 401) {
      // Try refreshing the access token once
      const newToken = await refreshAccess();
      if (!newToken) throw new Error('session expired — please log in again');
      res = await doRequest(newToken);
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'request failed');
    return json;
  }, [accessToken, refreshAccess]);

  return { call };
}
