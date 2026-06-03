import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test'
);

async function test() {
  const { data, error } = await supabase.schema('api').from('v1_tags').select('id, name, type_id, use_count');
  console.log('v1_tags error:', error);
  console.log('v1_tags data length:', data?.length);
  
  const { data: catData, error: catError } = await supabase.schema('api').from('v1_event_categories').select('id, display_name');
  console.log('v1_categories error:', catError);
  console.log('v1_categories data length:', catData?.length);
}

test();
