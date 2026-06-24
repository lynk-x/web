const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Custom simple env parser to avoid installing dotenv
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../.env.local')
  ];
  
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      console.log(`Loading environment from: ${envPath}`);
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = (match[2] || '').trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  console.error('Please run: export SUPABASE_SERVICE_ROLE_KEY=your_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

let extractorPipeline = null;

async function getExtractor() {
  if (!extractorPipeline) {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowLocalModels = false;
    extractorPipeline = await pipeline('feature-extraction', 'yuiseki/granite-embedding-97m-multilingual-r2-ONNX');
  }
  return extractorPipeline;
}

async function generateEmbedding(text) {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'cls', normalize: true });
  return Array.from(output.data);
}

async function backfillEvents() {
  console.log('\n--- Starting Events Backfill ---');
  
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, description, location, category_id, event_categories(display_name)');

  if (error) {
    console.error('Failed to fetch events:', error);
    return;
  }

  console.log(`Found ${events.length} events to process.`);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const categoryName = event.event_categories ? event.event_categories.display_name : undefined;
    const locationName = event.location ? (event.location.name || '') : undefined;
    
    const inputParts = [
      `Event: ${event.title}`,
      `Details: ${event.description || ''}`,
    ];
    if (locationName) inputParts.push(`Location: ${locationName}`);
    if (categoryName) inputParts.push(`Category: ${categoryName}`);
    
    const textToEmbed = inputParts.join('. ').slice(0, 10000);

    try {
      console.log(`[${i + 1}/${events.length}] Generating embedding for Event ID: ${event.id} ("${event.title}")`);
      const embedding = await generateEmbedding(textToEmbed);
      
      const { error: updateError } = await supabase
        .from('events')
        .update({ embedding })
        .eq('id', event.id);

      if (updateError) {
        console.error(`Failed to update embedding for Event ${event.id}:`, updateError);
      }
    } catch (err) {
      console.error(`Error processing Event ${event.id}:`, err);
    }
  }
  console.log('--- Events Backfill Completed ---');
}

async function backfillCampaigns() {
  console.log('\n--- Starting Campaigns Backfill ---');
  
  const supabaseAds = createClient(supabaseUrl, supabaseServiceRoleKey, {
    db: { schema: 'advertising' },
    auth: { persistSession: false }
  });

  const { data: campaigns, error } = await supabaseAds
    .from('campaigns')
    .select('id, title, description, target_tags, target_countries');

  if (error) {
    console.error('Failed to fetch campaigns:', error);
    return;
  }

  console.log(`Found ${campaigns.length} campaigns to process.`);

  for (let i = 0; i < campaigns.length; i++) {
    const campaign = campaigns[i];
    
    const inputParts = [
      `Campaign: ${campaign.title}`,
      `Description: ${campaign.description || ''}`
    ];
    if (campaign.target_tags && campaign.target_tags.length > 0) {
      inputParts.push(`Target Tags: ${campaign.target_tags.join(', ')}`);
    }
    if (campaign.target_countries && campaign.target_countries.length > 0) {
      inputParts.push(`Target Regions: ${campaign.target_countries.join(', ')}`);
    }
    
    const textToEmbed = inputParts.join('. ').slice(0, 10000);

    try {
      console.log(`[${i + 1}/${campaigns.length}] Generating embedding for Campaign ID: ${campaign.id} ("${campaign.title}")`);
      const embedding = await generateEmbedding(textToEmbed);
      
      const { error: updateError } = await supabaseAds
        .from('campaigns')
        .update({ embedding })
        .eq('id', campaign.id);

      if (updateError) {
        console.error(`Failed to update embedding for Campaign ${campaign.id}:`, updateError);
      }
    } catch (err) {
      console.error(`Error processing Campaign ${campaign.id}:`, err);
    }
  }
  console.log('--- Campaigns Backfill Completed ---');
}

async function backfillTags() {
  console.log('\n--- Starting Tags Backfill ---');
  
  const supabaseIdentity = createClient(supabaseUrl, supabaseServiceRoleKey, {
    db: { schema: 'identity' },
    auth: { persistSession: false }
  });

  const { data: tags, error } = await supabaseIdentity
    .from('tags')
    .select('id, name, type_id');

  if (error) {
    console.error('Failed to fetch tags:', error);
    return;
  }

  console.log(`Found ${tags.length} tags to process.`);

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    
    const inputParts = [`Tag: ${tag.name}`];
    if (tag.type_id) {
      inputParts.push(`Type: ${tag.type_id}`);
    }
    
    const textToEmbed = inputParts.join('. ').slice(0, 10000);

    try {
      console.log(`[${i + 1}/${tags.length}] Generating embedding for Tag ID: ${tag.id} ("${tag.name}")`);
      const embedding = await generateEmbedding(textToEmbed);
      
      const { error: updateError } = await supabaseIdentity
        .from('tags')
        .update({ embedding })
        .eq('id', tag.id);

      if (updateError) {
        console.error(`Failed to update embedding for Tag ${tag.id}:`, updateError);
      }
    } catch (err) {
      console.error(`Error processing Tag ${tag.id}:`, err);
    }
  }
  console.log('--- Tags Backfill Completed ---');
}

async function backfillTopics() {
  console.log('\n--- Starting Topics Backfill ---');
  
  const supabasePulse = createClient(supabaseUrl, supabaseServiceRoleKey, {
    db: { schema: 'pulse' },
    auth: { persistSession: false }
  });

  const { data: topics, error } = await supabasePulse
    .from('topics')
    .select('id, display_name, description, keywords');

  if (error) {
    console.error('Failed to fetch topics:', error);
    return;
  }

  console.log(`Found ${topics.length} topics to process.`);

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    
    const inputParts = [`Topic: ${topic.display_name}`];
    if (topic.description) {
      inputParts.push(`Description: ${topic.description}`);
    }
    if (topic.keywords && topic.keywords.length > 0) {
      inputParts.push(`Keywords: ${topic.keywords.join(', ')}`);
    }
    
    const textToEmbed = inputParts.join('. ').slice(0, 10000);

    try {
      console.log(`[${i + 1}/${topics.length}] Generating embedding for Topic ID: ${topic.id} ("${topic.display_name}")`);
      const embedding = await generateEmbedding(textToEmbed);
      
      const { error: updateError } = await supabasePulse
        .from('topics')
        .update({ embedding })
        .eq('id', topic.id);

      if (updateError) {
        console.error(`Failed to update embedding for Topic ${topic.id}:`, updateError);
      }
    } catch (err) {
      console.error(`Error processing Topic ${topic.id}:`, err);
    }
  }
  console.log('--- Topics Backfill Completed ---');
}

async function run() {
  try {
    await backfillEvents();
    await backfillCampaigns();
    await backfillTags();
    await backfillTopics();
    console.log('\nAll backfills completed successfully!');
  } catch (err) {
    console.error('Fatal error during backfill run:', err);
  }
}

run();
