import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { ProductContextInput } from '@/types/wizard';

export function usePersistedContext() {
  const { user } = useAuth();

  const saveContext = useCallback(async (ctx: ProductContextInput): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('product_contexts')
      .insert({
        user_id: user.id,
        product_name: ctx.productName,
        industry: ctx.industry,
        product_type: ctx.productType,
        platform: ctx.platform,
        user_types: ctx.userTypes,
        product_description: ctx.productDescription,
        mission: ctx.mission,
        north_star: ctx.northStar,
        persona: ctx.persona,
        strategy: ctx.strategy,
        objectives: ctx.objectives,
        ac_format: ctx.acFormat,
      })
      .select('id')
      .single();
    if (error) { console.error('Save context error:', error); return null; }
    return data?.id ?? null;
  }, [user]);

  const loadContexts = useCallback(async (): Promise<(ProductContextInput & { id: string })[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('product_contexts')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      productName: r.product_name,
      industry: r.industry,
      productType: r.product_type,
      platform: r.platform,
      userTypes: r.user_types,
      productDescription: r.product_description,
      mission: r.mission,
      northStar: r.north_star,
      persona: r.persona,
      strategy: r.strategy,
      objectives: r.objectives,
      acFormat: r.ac_format || 'plain',
    }));
  }, [user]);

  return { saveContext, loadContexts };
}
