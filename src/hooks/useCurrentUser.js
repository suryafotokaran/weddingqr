import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return {
        studioName: user?.user_metadata?.studio_name || 'WeddingQR Studio',
        fullName: user?.user_metadata?.full_name || 'Photographer',
        user,
      };
    },
    staleTime: 1000 * 60 * 5,  // cache for 5 minutes — no repeat calls
    gcTime: 1000 * 60 * 10,
    retry: false,
  });
}
