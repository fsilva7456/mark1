import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function StrategyContentLink({ strategy, className }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Get the strategy ID directly from the database by name
      console.log("Fetching strategy ID for:", strategy.name);
      
      const { data, error } = await supabase
        .from('strategies')
        .select('id')
        .eq('name', strategy.name)
        .single();
      
      if (error) throw error;
      
      if (data && data.id) {
        console.log("Found strategy ID:", data.id);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id);
        
        if (isUuid) {
          // Navigate to content creation with the verified UUID
          router.push(`/content/new?strategy=${encodeURIComponent(data.id)}`);
        } else {
          console.error("Retrieved non-UUID strategy ID:", data.id);
          toast.error("Invalid strategy ID format. Please contact support.");
        }
      } else {
        throw new Error("Strategy not found");
      }
    } catch (error) {
      console.error("Error retrieving strategy ID:", error);
      toast.error("Failed to prepare content generation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <button 
      onClick={handleClick}
      className={className}
      disabled={isLoading}
    >
      {isLoading ? 'Preparing...' : 'Create Content'}
    </button>
  );
} 