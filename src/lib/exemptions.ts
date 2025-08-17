// src/lib/exemptions.ts
import { createClient } from '@supabase/supabase-js'

// Use the same admin pattern you already use in lib/walmart.ts
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Returns true if the user is approved to list without a barcode.
 * Adjust filters if your table tracks brand/category specifically.
 */
export async function hasGtinExemption(
  userId: string,
  productType?: string | null
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('walmart_gtin_exemptions')
    .select('status')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .limit(1)

  if (error) throw error
  return !!data?.length
}
