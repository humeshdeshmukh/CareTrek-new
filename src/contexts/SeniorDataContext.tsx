import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { seniorDataService } from '../services/seniorDataService';
import { useAuth } from '../hooks/useAuth';

type SeniorDataContextType = {
  seniorData: any[];
  loading: boolean;
  error: string | null;
  fetchSeniorData: (seniorId: string) => Promise<void>;
  saveData: (seniorId: string, data: any, dataId?: string) => Promise<void>;
  deleteData: (dataId: string) => Promise<void>;
  refreshData: () => void;
};

const SeniorDataContext = createContext<SeniorDataContextType | undefined>(undefined);

export const SeniorDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [seniorData, setSeniorData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { user } = useAuth();

  const fetchSeniorData = useCallback(async (seniorId: string) => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Check if family member has access
      const hasAccess = await seniorDataService.checkFamilyAccess(seniorId, user.id);
      if (!hasAccess) {
        throw new Error('You do not have permission to access this data');
      }
      
      // Fetch the data
      const data = await seniorDataService.getSeniorData(seniorId, user.id);
      setSeniorData(data);
    } catch (err: any) {
      console.error('Error fetching senior data:', err);
      setError(err.message || 'Failed to load senior data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const saveData = async (seniorId: string, data: any, dataId?: string) => {
    if (!user?.id) return;
    
    try {
      await seniorDataService.saveSeniorData(seniorId, user.id, data, dataId);
      // Refresh the data after saving
      await fetchSeniorData(seniorId);
    } catch (err: any) {
      console.error('Error saving data:', err);
      throw err;
    }
  };

  const deleteData = async (dataId: string) => {
    try {
      await seniorDataService.deleteSeniorData(dataId);
      // Remove the deleted item from state
      setSeniorData(prev => prev.filter(item => item.id !== dataId));
    } catch (err: any) {
      console.error('Error deleting data:', err);
      throw err;
    }
  };

  // Refresh function to manually trigger data refetch
  const refreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <SeniorDataContext.Provider 
      value={{
        seniorData,
        loading,
        error,
        fetchSeniorData,
        saveData,
        deleteData,
        refreshData,
      }}
    >
      {children}
    </SeniorDataContext.Provider>
  );
};

export const useSeniorData = (): SeniorDataContextType => {
  const context = useContext(SeniorDataContext);
  if (context === undefined) {
    throw new Error('useSeniorData must be used within a SeniorDataProvider');
  }
  return context;
};

// Create a hook for use in components that need to handle senior data
export const useSeniorDataManager = (seniorId: string) => {
  const { seniorData, loading, error, fetchSeniorData, saveData, deleteData, refreshData } = useSeniorData();
  
  // Automatically fetch data when the component mounts or seniorId changes
  useEffect(() => {
    if (seniorId) {
      fetchSeniorData(seniorId);
    }
  }, [seniorId, fetchSeniorData]);
  
  return {
    seniorData,
    loading,
    error,
    saveData: (data: any, dataId?: string) => saveData(seniorId, data, dataId),
    deleteData,
    refreshData: () => fetchSeniorData(seniorId),
  };
};
