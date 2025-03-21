import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import logger from '../lib/logger';

const log = logger.createLogger('MarketingPlanContext');

// Create context
export const MarketingPlanContext = createContext();

// Hook to use the Marketing Plan context
export const useMarketingPlan = () => {
  const context = useContext(MarketingPlanContext);
  if (!context) {
    throw new Error('useMarketingPlan must be used within a MarketingPlanProvider');
  }
  return context;
};

export const MarketingPlanProvider = ({ children }) => {
  const { user } = useAuth();
  
  // State for strategies, content outlines, and calendars
  const [strategies, setStrategies] = useState([]);
  const [contentOutlines, setContentOutlines] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch data when user changes
  useEffect(() => {
    if (user) {
      fetchAllData();
    } else {
      // Reset state when user logs out
      setStrategies([]);
      setContentOutlines([]);
      setCalendars([]);
      setIsLoading(false);
    }
  }, [user]);
  
  // Fetch all marketing plan data (strategies, outlines, calendars)
  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      log.info('Fetching all marketing plan data for user', { userId: user.id });
      
      // Fetch strategies
      const { data: strategiesData, error: strategiesError } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (strategiesError) throw strategiesError;
      
      // Fetch content outlines
      const { data: outlinesData, error: outlinesError } = await supabase
        .from('content_outlines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (outlinesError) throw outlinesError;
      
      // Fetch calendars
      const { data: calendarsData, error: calendarsError } = await supabase
        .from('calendars')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (calendarsError) throw calendarsError;
      
      log.info('Fetched marketing plan data', { 
        strategiesCount: strategiesData?.length || 0,
        outlinesCount: outlinesData?.length || 0,
        calendarsCount: calendarsData?.length || 0
      });
      
      setStrategies(strategiesData || []);
      setContentOutlines(outlinesData || []);
      setCalendars(calendarsData || []);
      setError(null);
    } catch (error) {
      log.error('Error fetching marketing plan data', error);
      setError('Failed to load marketing plan data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get strategy by ID
  const getStrategyById = (id) => {
    return strategies.find(strategy => strategy.id === id) || null;
  };
  
  // Get content outlines for a strategy
  const getOutlinesForStrategy = (strategyId) => {
    return contentOutlines.filter(outline => outline.strategy_id === strategyId);
  };
  
  // Get calendars for a strategy
  const getCalendarsForStrategy = (strategyId) => {
    return calendars.filter(calendar => calendar.strategy_id === strategyId);
  };
  
  // Find relationship chain (strategy -> outline -> calendar)
  const getMarketingChain = (entityId, entityType) => {
    try {
      let strategyId, outlineIds, calendarIds;
      
      // Find IDs based on the provided entity
      switch (entityType) {
        case 'strategy':
          strategyId = entityId;
          outlineIds = contentOutlines
            .filter(o => o.strategy_id === strategyId)
            .map(o => o.id);
          calendarIds = calendars
            .filter(c => c.strategy_id === strategyId)
            .map(c => c.id);
          break;
          
        case 'outline':
          const outline = contentOutlines.find(o => o.id === entityId);
          if (!outline) return null;
          
          strategyId = outline.strategy_id;
          outlineIds = [entityId];
          calendarIds = calendars
            .filter(c => c.strategy_id === strategyId)
            .map(c => c.id);
          break;
          
        case 'calendar':
          const calendar = calendars.find(c => c.id === entityId);
          if (!calendar) return null;
          
          strategyId = calendar.strategy_id;
          outlineIds = contentOutlines
            .filter(o => o.strategy_id === strategyId)
            .map(o => o.id);
          calendarIds = [entityId];
          break;
          
        default:
          return null;
      }
      
      // Get the actual entities
      const strategy = strategies.find(s => s.id === strategyId);
      const relatedOutlines = contentOutlines.filter(o => outlineIds.includes(o.id));
      const relatedCalendars = calendars.filter(c => calendarIds.includes(c.id));
      
      return {
        strategy,
        outlines: relatedOutlines,
        calendars: relatedCalendars
      };
    } catch (error) {
      log.error('Error getting marketing chain', { error, entityId, entityType });
      return null;
    }
  };
  
  // Delete a marketing plan entity and its dependencies
  const deleteMarketingEntity = async (entityId, entityType) => {
    try {
      log.info('Deleting marketing entity', { entityId, entityType });
      setIsLoading(true);
      
      switch (entityType) {
        case 'strategy':
          // Delete cascading (strategy -> outlines -> calendars)
          const strategyOutlines = contentOutlines.filter(o => o.strategy_id === entityId);
          const strategyCalendars = calendars.filter(c => c.strategy_id === entityId);
          
          // Delete calendars
          for (const calendar of strategyCalendars) {
            await supabase.from('calendars').delete().eq('id', calendar.id);
          }
          
          // Delete outlines
          for (const outline of strategyOutlines) {
            await supabase.from('content_outlines').delete().eq('id', outline.id);
          }
          
          // Delete strategy
          await supabase.from('strategies').delete().eq('id', entityId);
          break;
          
        case 'outline':
          // Delete outline
          await supabase.from('content_outlines').delete().eq('id', entityId);
          break;
          
        case 'calendar':
          // Delete calendar
          await supabase.from('calendars').delete().eq('id', entityId);
          break;
          
        default:
          throw new Error('Invalid entity type');
      }
      
      // Refresh data
      await fetchAllData();
      
      return true;
    } catch (error) {
      log.error('Error deleting marketing entity', { error, entityId, entityType });
      setError('Failed to delete item');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add to Supabase audit log
  const logAction = async (action, details) => {
    try {
      if (!user) return;
      
      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        action,
        details,
        created_at: new Date().toISOString()
      }]);
    } catch (error) {
      log.error('Error logging action to audit trail', { error, action, details });
    }
  };
  
  // Context value
  const value = {
    strategies,
    contentOutlines,
    calendars,
    isLoading,
    error,
    refreshData: fetchAllData,
    getStrategyById,
    getOutlinesForStrategy,
    getCalendarsForStrategy,
    getMarketingChain,
    deleteMarketingEntity,
    logAction
  };
  
  return (
    <MarketingPlanContext.Provider value={value}>
      {children}
    </MarketingPlanContext.Provider>
  );
}; 