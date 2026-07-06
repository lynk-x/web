const fs = require('fs');
const path = require('path');

// Target tags list
const tagsData = [
  // Existing tags (so we backfill/insert them with embeddings too)
  { name: 'Techno', type_id: 'genre', slug: 'techno', categories: ['music-nightlife'] },
  { name: 'Amapiano', type_id: 'genre', slug: 'amapiano', categories: ['music-nightlife'] },
  { name: 'Afrobeats', type_id: 'genre', slug: 'afrobeats', categories: ['music-nightlife'] },
  { name: 'Networking', type_id: 'genre', slug: 'networking', categories: ['business-professional'] },
  { name: 'Startup', type_id: 'genre', slug: 'startup', categories: ['business-professional', 'tech-innovation'] },
  { name: 'Web3', type_id: 'genre', slug: 'web3', categories: ['tech-innovation'] },
  { name: 'AI', type_id: 'genre', slug: 'ai', categories: ['tech-innovation'] },
  { name: 'Wellness', type_id: 'genre', slug: 'wellness', categories: ['health-wellness'] },
  { name: 'Premium', type_id: 'vibe', slug: 'premium', categories: [] },

  // Music & Nightlife
  { name: 'Hip-Hop', type_id: 'genre', slug: 'hip-hop', categories: ['music-nightlife'] },
  { name: 'House', type_id: 'genre', slug: 'house', categories: ['music-nightlife'] },
  { name: 'Jazz', type_id: 'genre', slug: 'jazz', categories: ['music-nightlife'] },
  { name: 'Rock', type_id: 'genre', slug: 'rock', categories: ['music-nightlife'] },
  { name: 'R&B', type_id: 'genre', slug: 'r-and-b', categories: ['music-nightlife'] },
  { name: 'Electronic', type_id: 'genre', slug: 'electronic', categories: ['music-nightlife'] },
  { name: 'Live Band', type_id: 'genre', slug: 'live-band', categories: ['music-nightlife'] },
  { name: 'High Energy', type_id: 'vibe', slug: 'high-energy', categories: ['music-nightlife', 'sports-games'] },
  { name: 'Rooftop', type_id: 'vibe', slug: 'rooftop', categories: ['music-nightlife'] },
  { name: 'Underground', type_id: 'vibe', slug: 'underground', categories: ['music-nightlife'] },
  { name: 'Late Night', type_id: 'vibe', slug: 'late-night', categories: ['music-nightlife'] },

  // Arts & Entertainment
  { name: 'Comedy', type_id: 'genre', slug: 'comedy', categories: ['arts-entertainment'] },
  { name: 'Theatre', type_id: 'genre', slug: 'theatre', categories: ['arts-entertainment'] },
  { name: 'Film Screening', type_id: 'genre', slug: 'film-screening', categories: ['arts-entertainment'] },
  { name: 'Art Gallery', type_id: 'genre', slug: 'art-gallery', categories: ['arts-entertainment'] },
  { name: 'Fashion Show', type_id: 'genre', slug: 'fashion-show', categories: ['arts-entertainment'] },
  { name: 'Poetry', type_id: 'genre', slug: 'poetry', categories: ['arts-entertainment'] },
  { name: 'Creative', type_id: 'vibe', slug: 'creative', categories: ['arts-entertainment'] },
  { name: 'Intimate', type_id: 'vibe', slug: 'intimate', categories: ['arts-entertainment'] },
  { name: 'Immersive', type_id: 'vibe', slug: 'immersive', categories: ['arts-entertainment'] },

  // Business & Professional
  { name: 'Marketing', type_id: 'genre', slug: 'marketing', categories: ['business-professional'] },
  { name: 'Finance', type_id: 'genre', slug: 'finance', categories: ['business-professional'] },
  { name: 'Real Estate', type_id: 'genre', slug: 'real-estate', categories: ['business-professional'] },
  { name: 'Leadership', type_id: 'genre', slug: 'leadership', categories: ['business-professional'] },
  { name: 'Pitch Event', type_id: 'genre', slug: 'pitch-event', categories: ['business-professional'] },
  { name: 'Career Fair', type_id: 'genre', slug: 'career-fair', categories: ['business-professional'] },
  { name: 'Corporate', type_id: 'vibe', slug: 'corporate', categories: ['business-professional'] },
  { name: 'Structured', type_id: 'vibe', slug: 'structured', categories: ['business-professional'] },
  { name: 'High-End', type_id: 'vibe', slug: 'high-end', categories: ['business-professional'] },
  { name: 'Entrepreneurs', type_id: 'audience', slug: 'entrepreneurs', categories: ['business-professional'] },
  { name: 'Executives', type_id: 'audience', slug: 'executives', categories: ['business-professional'] },
  { name: 'Job Seekers', type_id: 'audience', slug: 'job-seekers', categories: ['business-professional'] },

  // Education & Training
  { name: 'Workshop', type_id: 'genre', slug: 'workshop', categories: ['education-training'] },
  { name: 'Bootcamp', type_id: 'genre', slug: 'bootcamp', categories: ['education-training'] },
  { name: 'Public Speaking', type_id: 'genre', slug: 'public-speaking', categories: ['education-training'] },
  { name: 'Coding', type_id: 'genre', slug: 'coding', categories: ['education-training'] },
  { name: 'Language Exchange', type_id: 'genre', slug: 'language-exchange', categories: ['education-training'] },
  { name: 'Beginner Friendly', type_id: 'experience-level', slug: 'beginner-friendly', categories: ['education-training'] },
  { name: 'Advanced', type_id: 'experience-level', slug: 'advanced', categories: ['education-training'] },
  { name: 'All Levels', type_id: 'experience-level', slug: 'all-levels', categories: ['education-training'] },

  // Tech & Innovation
  { name: 'SaaS', type_id: 'genre', slug: 'saas', categories: ['tech-innovation'] },
  { name: 'Cybersecurity', type_id: 'genre', slug: 'cybersecurity', categories: ['tech-innovation'] },
  { name: 'FinTech', type_id: 'genre', slug: 'fintech', categories: ['tech-innovation'] },
  { name: 'Biotech', type_id: 'genre', slug: 'biotech', categories: ['tech-innovation'] },
  { name: 'Data Science', type_id: 'genre', slug: 'data-science', categories: ['tech-innovation'] },
  { name: 'Robotics', type_id: 'genre', slug: 'robotics', categories: ['tech-innovation'] },
  { name: 'Futuristic', type_id: 'vibe', slug: 'futuristic', categories: ['tech-innovation'] },
  { name: 'Collaborative', type_id: 'vibe', slug: 'collaborative', categories: ['tech-innovation', 'community'] },

  // Food & Drinks
  { name: 'Alcohol', type_id: 'genre', slug: 'alcohol', categories: ['food-drinks'] },
  { name: 'Wine Tasting', type_id: 'genre', slug: 'wine-tasting', categories: ['food-drinks'] },
  { name: 'Craft Beer', type_id: 'genre', slug: 'craft-beer', categories: ['food-drinks'] },
  { name: 'Fine Dining', type_id: 'genre', slug: 'fine-dining', categories: ['food-drinks'] },
  { name: 'Vegan', type_id: 'genre', slug: 'vegan', categories: ['food-drinks'] },
  { name: 'Cooking Class', type_id: 'genre', slug: 'cooking-class', categories: ['food-drinks'] },
  { name: 'Food Truck', type_id: 'genre', slug: 'food-truck', categories: ['food-drinks'] },
  { name: 'Gourmet', type_id: 'vibe', slug: 'gourmet', categories: ['food-drinks'] },
  { name: 'Cozy', type_id: 'vibe', slug: 'cozy', categories: ['food-drinks'] },
  { name: 'Social', type_id: 'vibe', slug: 'social', categories: ['food-drinks'] },
  { name: 'Gluten-Free Friendly', type_id: 'genre', slug: 'gluten-free-friendly', categories: ['food-drinks'] },
  { name: 'Nut-Free Friendly', type_id: 'genre', slug: 'nut-free-friendly', categories: ['food-drinks'] },
  { name: 'Dairy-Free Friendly', type_id: 'genre', slug: 'dairy-free-friendly', categories: ['food-drinks'] },

  // Sports & Games
  { name: 'Esports', type_id: 'genre', slug: 'esports', categories: ['sports-games'] },
  { name: 'Board Games', type_id: 'genre', slug: 'board-games', categories: ['sports-games'] },
  { name: 'Running Club', type_id: 'genre', slug: 'running-club', categories: ['sports-games'] },
  { name: 'Fitness', type_id: 'genre', slug: 'fitness', categories: ['sports-games', 'health-wellness'] },
  { name: 'Tournament', type_id: 'genre', slug: 'tournament', categories: ['sports-games'] },
  { name: 'Hiking', type_id: 'genre', slug: 'hiking', categories: ['sports-games'] },
  { name: 'Soccer / Football', type_id: 'genre', slug: 'soccer-football', categories: ['sports-games'] },
  { name: 'Padel & Tennis', type_id: 'genre', slug: 'padel-tennis', categories: ['sports-games'] },
  { name: 'Cycling', type_id: 'genre', slug: 'cycling', categories: ['sports-games'] },
  { name: 'Trivia', type_id: 'genre', slug: 'trivia', categories: ['sports-games'] },
  { name: 'Arcade & Pinball', type_id: 'genre', slug: 'arcade-pinball', categories: ['sports-games'] },
  { name: 'Billiards & Darts', type_id: 'genre', slug: 'billiards-darts', categories: ['sports-games'] },
  { name: 'Competitive', type_id: 'vibe', slug: 'competitive', categories: ['sports-games'] },
  { name: 'Friendly', type_id: 'vibe', slug: 'friendly', categories: ['sports-games'] },

  // Health & Wellness
  { name: 'Meditation', type_id: 'genre', slug: 'meditation', categories: ['health-wellness'] },
  { name: 'Mental Health', type_id: 'genre', slug: 'mental-health', categories: ['health-wellness'] },
  { name: 'Pilates', type_id: 'genre', slug: 'pilates', categories: ['health-wellness'] },
  { name: 'Yoga', type_id: 'genre', slug: 'yoga', categories: ['health-wellness'] },
  { name: 'Nutrition', type_id: 'genre', slug: 'nutrition', categories: ['health-wellness'] },
  { name: 'Calming', type_id: 'vibe', slug: 'calming', categories: ['health-wellness'] },
  { name: 'Restorative', type_id: 'vibe', slug: 'restorative', categories: ['health-wellness'] },
  { name: 'Mindful', type_id: 'vibe', slug: 'mindful', categories: ['health-wellness'] },

  // Seasonal & Holiday
  { name: 'Summer Party', type_id: 'genre', slug: 'summer-party', categories: ['seasonal-holiday'] },
  { name: 'Halloween', type_id: 'genre', slug: 'halloween', categories: ['seasonal-holiday'] },
  { name: "New Year's Eve", type_id: 'genre', slug: 'new-years-eve', categories: ['seasonal-holiday'] },
  { name: 'Lunar New Year', type_id: 'genre', slug: 'lunar-new-year', categories: ['seasonal-holiday'] },
  { name: "Valentine's Day", type_id: 'genre', slug: 'valentines-day', categories: ['seasonal-holiday'] },
  { name: "St. Patrick's Day", type_id: 'genre', slug: 'st-patricks-day', categories: ['seasonal-holiday'] },
  { name: 'Easter', type_id: 'genre', slug: 'easter', categories: ['seasonal-holiday'] },
  { name: 'Eid al-Fitr', type_id: 'genre', slug: 'eid-al-fitr', categories: ['seasonal-holiday'] },
  { name: 'Diwali', type_id: 'genre', slug: 'diwali', categories: ['seasonal-holiday'] },
  { name: 'Oktoberfest', type_id: 'genre', slug: 'oktoberfest', categories: ['seasonal-holiday'] },
  { name: 'Thanksgiving', type_id: 'genre', slug: 'thanksgiving', categories: ['seasonal-holiday'] },
  { name: 'Christmas', type_id: 'genre', slug: 'christmas', categories: ['seasonal-holiday'] },
  { name: 'Festive', type_id: 'vibe', slug: 'festive', categories: ['seasonal-holiday'] },
  { name: 'Carnival', type_id: 'vibe', slug: 'carnival', categories: ['seasonal-holiday'] },

  // Community & Gatherings
  { name: 'Charity / Volunteering', type_id: 'genre', slug: 'charity-volunteering', categories: ['community'] },
  { name: 'Local Market', type_id: 'genre', slug: 'local-market', categories: ['community'] },
  { name: 'Pet Friendly', type_id: 'genre', slug: 'pet-friendly', categories: ['community'] },
  { name: 'Free Entry', type_id: 'service', slug: 'free-entry', categories: ['community'] },
  { name: 'Cashless Only', type_id: 'service', slug: 'cashless-only', categories: ['community'] },
  { name: 'Free Parking', type_id: 'service', slug: 'free-parking', categories: ['community'] },

  // Accessibility
  { name: 'Wheelchair Accessible', type_id: 'accessibility', slug: 'wheelchair-accessible', categories: [] },
  { name: 'Sign Language Support', type_id: 'accessibility', slug: 'sign-language-support', categories: [] },
  { name: 'Sensory Friendly', type_id: 'accessibility', slug: 'sensory-friendly', categories: [] },
  { name: 'Assistive Listening', type_id: 'accessibility', slug: 'assistive-listening', categories: [] }
];

async function run() {
  console.log('Loading Hugging Face Transformers...');
  const { pipeline, env } = await import('@huggingface/transformers');
  env.allowLocalModels = false;
  
  console.log('Loading Granite ONNX embedding model...');
  const extractor = await pipeline('feature-extraction', 'yuiseki/granite-embedding-97m-multilingual-r2-ONNX');

  console.log(`Generating embeddings for ${tagsData.length} tags...`);
  
  let sqlInserts = [];
  let categoryMappings = [];
  
  for (let i = 0; i < tagsData.length; i++) {
    const tag = tagsData[i];
    const inputParts = [`Tag: ${tag.name}`];
    if (tag.type_id) {
      inputParts.push(`Type: ${tag.type_id}`);
    }
    const textToEmbed = inputParts.join('. ');
    
    // Generate embedding vector
    const output = await extractor(textToEmbed, { pooling: 'cls', normalize: true });
    const vector = Array.from(output.data);
    const vectorString = `[${vector.map(v => v.toFixed(6)).join(',')}]`;
    
    // Output INSERT statement
    sqlInserts.push(`    (extensions.gen_random_uuid(), '${tag.type_id}', '${tag.name.replace(/'/g, "''")}', '${tag.slug}', '${vectorString}', true, 'approved')`);
    
    if (tag.categories && tag.categories.length > 0) {
      for (const cat of tag.categories) {
        categoryMappings.push({ cat, slug: tag.slug });
      }
    }
    
    if ((i + 1) % 10 === 0 || i === tagsData.length - 1) {
      console.log(`Processed ${i + 1}/${tagsData.length} tags...`);
    }
  }

  // Build the event categories, tag types, and forum hashtags SQL script
  let eventsSocialScript = `BEGIN;

-- 3. Event Categories
INSERT INTO events.event_categories (id, display_name, status) VALUES
    ('music-nightlife', 'Music & Nightlife', 'approved'),
    ('arts-entertainment', 'Arts & Entertainment', 'approved'),
    ('business-professional', 'Business & Professional', 'approved'),
    ('education-training', 'Education & Training', 'approved'),
    ('tech-innovation', 'Tech & Innovation', 'approved'),
    ('food-drinks', 'Food & Drinks', 'approved'),
    ('sports-games', 'Sports & Games', 'approved'),
    ('health-wellness', 'Health & Wellness', 'approved'),
    ('seasonal-holiday', 'Seasonal & Holiday', 'approved'),
    ('community', 'Community Gatherings', 'approved')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, status = 'approved';

-- 4. Tag Architecture (Discovery Engine)
INSERT INTO identity.tag_types (id, description, weight) VALUES
    ('genre', 'Primary event niche (e.g. Techno, Jazz, Networking)', 2.0),
    ('trend', 'Velocity indicators (e.g. Trending Now, Viral, Selling Fast)', 1.8),
    ('vibe', 'Atmospheric indicators (e.g. Chill, High Energy, Indoor)', 1.5),
    ('audience', 'Target demographic (e.g. Couples, Family Friendly, Professionals)', 1.4),
    ('experience-level', 'Prerequisite knowledge (e.g. Beginner, Expert)', 1.2),
    ('service', 'Amenities (e.g. Free WiFi, VIP Table, Cashless)', 1.1),
    ('accessibility', 'Inclusion markers (e.g. Wheelchair, Sign Language Support)', 1.0),
    ('demographic', 'Target demographic grouping (18+, Tech Founders)', 1.0),
    ('other', 'Miscellaneous descriptive metadata', 0.8)
ON CONFLICT (id) DO UPDATE SET weight = EXCLUDED.weight;

-- ── Forum Hashtags
INSERT INTO social.forum_hashtags (id, display_name) VALUES
('urgent', 'Urgent'),
('activity', 'Activity'),
('Q&A', 'Q&A'),
('Resources', 'Resources'),
('Rules', 'Rules')
ON CONFLICT (id) DO NOTHING;

COMMIT;
`;

  // Build the tags and category mappings SQL script
  let tagsScript = `BEGIN;

-- Remove existing tags mappings and tags to prevent duplicates during seed re-run
TRUNCATE identity.category_tags CASCADE;
DELETE FROM identity.tags;

-- 5. Seeding Interest Tags with pre-calculated Granite embeddings
INSERT INTO identity.tags (id, type_id, name, slug, embedding, is_official, status) VALUES
${sqlInserts.join(',\n')};

-- 5a. Category-Tag Mappings
INSERT INTO identity.category_tags (category_id, tag_id)
`;

  const unionSelects = categoryMappings.map(mapping => {
    return `SELECT '${mapping.cat}', id FROM identity.tags WHERE slug = '${mapping.slug}'`;
  });  tagsScript += unionSelects.join('\nUNION ALL\n') + ';\n\n';
  tagsScript += 'COMMIT;\n';

  // Build the disclaimers SQL script
  let disclaimersScript = `BEGIN;

-- Remove existing disclaimers to prevent duplicates during seed re-run
TRUNCATE content.disclaimers CASCADE;

-- 5b. Seeding Tag-Linked Disclaimers (Strenuous Physical Activity Warning)
INSERT INTO content.disclaimers (tag_id, title, content, status, effective_date)
VALUES 
    ((SELECT id FROM identity.tags WHERE slug = 'hiking'), 
     'Strenuous Physical Activity Warning', 
     'This event involves strenuous physical activity, outdoor navigation, or high-intensity exercise. Participants are responsible for ensuring they are in adequate physical health, carrying sufficient hydration, and wearing appropriate attire.', 
     'approved', 
     now()),
    ((SELECT id FROM identity.tags WHERE slug = 'running-club'), 
     'Strenuous Physical Activity Warning', 
     'This event involves strenuous physical activity, outdoor navigation, or high-intensity exercise. Participants are responsible for ensuring they are in adequate physical health, carrying sufficient hydration, and wearing appropriate attire.', 
     'approved', 
     now()),
    ((SELECT id FROM identity.tags WHERE slug = 'fitness'), 
     'Strenuous Physical Activity Warning', 
     'This event involves strenuous physical activity, outdoor navigation, or high-intensity exercise. Participants are responsible for ensuring they are in adequate physical health, carrying sufficient hydration, and wearing appropriate attire.', 
     'approved', 
     now())
ON CONFLICT (tag_id, title) DO UPDATE 
SET content = EXCLUDED.content, 
    effective_date = EXCLUDED.effective_date,
    status = EXCLUDED.status;

COMMIT;
`;

  const eventsSocialPath = path.join(__dirname, '../../supabase/seed/03_events_social.sql');
  const tagsPath = path.join(__dirname, '../../supabase/seed/04_interest_tags.sql');
  const disclaimersPath = path.join(__dirname, '../../supabase/seed/04_tag_disclaimers.sql');
  
  fs.writeFileSync(eventsSocialPath, eventsSocialScript, 'utf8');
  fs.writeFileSync(tagsPath, tagsScript, 'utf8');
  fs.writeFileSync(disclaimersPath, disclaimersScript, 'utf8');
  
  console.log(`\nSuccess!`);
  console.log(`- Events/Social Seed written to: ${eventsSocialPath}`);
  console.log(`- Tags Seed written to: ${tagsPath}`);
  console.log(`- Disclaimers Seed written to: ${disclaimersPath}`);
}

run().catch(err => {
  console.error('Generation failed:', err);
});
