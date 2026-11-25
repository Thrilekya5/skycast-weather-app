import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jnycxolpuyqzhodvsbeb.supabase.co'
const supabaseKey = 'sb_publishable_yDp40q-IBGAk9qTAKJ-i_w_e9rwq5zg'

export const supabase = createClient(supabaseUrl, supabaseKey)