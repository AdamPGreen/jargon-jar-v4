import { useState, useEffect } from 'react';

export type TimePeriod = 'all' | 'month' | 'week';

export interface LeaderboardUser {
  user_id: string;
  name: string;
  image_url: string | null;
  total_amount: number;
  charge_count: number;
}

export interface LeaderboardJargon {
  word_id: string;
  word: string;
  description?: string;
  total_amount: number;
  usage_count: number;
}

// Calculate the date range based on time period
const getDateFilter = (timePeriod: TimePeriod): string | null => {
  if (timePeriod === 'all') return null;
  
  const now = new Date();
  if (timePeriod === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString();
  }
  
  if (timePeriod === 'week') {
    const firstDay = new Date(now);
    const day = now.getDay() || 7; // Convert Sunday from 0 to 7
    firstDay.setDate(now.getDate() - day + 1); // Set to the first day of the week (Monday)
    firstDay.setHours(0, 0, 0, 0);
    return firstDay.toISOString();
  }
  
  return null;
};

interface FetchLeaderboardOptions {
  workspaceId: string;
  timePeriod: TimePeriod;
  limit?: number;
}

export function useUserAmountLeaderboard({ 
  workspaceId, 
  timePeriod,
  limit = 10 
}: FetchLeaderboardOptions) {
  const [data, setData] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!workspaceId) return;
      
      setIsLoading(true);
      setError(null);
      
      const dateFilter = getDateFilter(timePeriod);
      const params = new URLSearchParams({
        workspace_id: workspaceId,
        limit: limit.toString()
      });
      
      if (dateFilter) {
        params.append('date_from', dateFilter);
      }
      
      try {
        const response = await fetch(`/api/leaderboard/users/amount?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }
        
        const result = await response.json();
        setData(result.data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [workspaceId, timePeriod, limit]);

  return { data, isLoading, error };
}

export function useUserFrequencyLeaderboard({ 
  workspaceId, 
  timePeriod,
  limit = 10 
}: FetchLeaderboardOptions) {
  const [data, setData] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!workspaceId) return;
      
      setIsLoading(true);
      setError(null);
      
      const dateFilter = getDateFilter(timePeriod);
      const params = new URLSearchParams({
        workspace_id: workspaceId,
        limit: limit.toString()
      });
      
      if (dateFilter) {
        params.append('date_from', dateFilter);
      }
      
      try {
        const response = await fetch(`/api/leaderboard/users/frequency?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }
        
        const result = await response.json();
        setData(result.data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [workspaceId, timePeriod, limit]);

  return { data, isLoading, error };
}

export function useJargonAmountLeaderboard({ 
  workspaceId, 
  timePeriod,
  limit = 10 
}: FetchLeaderboardOptions) {
  const [data, setData] = useState<LeaderboardJargon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!workspaceId) return;
      
      setIsLoading(true);
      setError(null);
      
      const dateFilter = getDateFilter(timePeriod);
      const params = new URLSearchParams({
        workspace_id: workspaceId,
        limit: limit.toString()
      });
      
      if (dateFilter) {
        params.append('date_from', dateFilter);
      }
      
      try {
        const response = await fetch(`/api/leaderboard/jargon/amount?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }
        
        const result = await response.json();
        setData(result.data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [workspaceId, timePeriod, limit]);

  return { data, isLoading, error };
}

export function useJargonFrequencyLeaderboard({ 
  workspaceId, 
  timePeriod,
  limit = 10 
}: FetchLeaderboardOptions) {
  const [data, setData] = useState<LeaderboardJargon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!workspaceId) return;
      
      setIsLoading(true);
      setError(null);
      
      const dateFilter = getDateFilter(timePeriod);
      const params = new URLSearchParams({
        workspace_id: workspaceId,
        limit: limit.toString()
      });
      
      if (dateFilter) {
        params.append('date_from', dateFilter);
      }
      
      try {
        const response = await fetch(`/api/leaderboard/jargon/frequency?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }
        
        const result = await response.json();
        setData(result.data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [workspaceId, timePeriod, limit]);

  return { data, isLoading, error };
} 