let extractorPipeline: any = null;
let preloadPromise: Promise<void> | null = null;

/**
 * Triggers loading/downloading the embedding model pipeline in the background.
 */
export async function preloadEmbeddingModel(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  if (preloadPromise) {
    return preloadPromise;
  }

  preloadPromise = (async () => {
    try {
      if (!extractorPipeline) {
        console.log('[Embedding] Preloading model...');
        const { pipeline, env } = await import('@huggingface/transformers');
        
        // Ensure we load models from the Hugging Face CDN
        env.allowLocalModels = false;
        
        extractorPipeline = await pipeline('feature-extraction', 'yuiseki/granite-embedding-97m-multilingual-r2-ONNX');
        console.log('[Embedding] Model preloaded successfully.');
      }
    } catch (error) {
      console.error('[Embedding] Failed to preload embedding model:', error);
      // Reset promise to allow retrying if it failed
      preloadPromise = null;
    }
  })();

  return preloadPromise;
}

/**
 * Generates a 384-dimensional vector embedding for an event using the IBM Granite multilingual embedding model.
 * Dynamic imports are used to avoid Next.js Server-Side Rendering (SSR) issues.
 */
export async function generateEventEmbedding(
  title: string,
  description: string,
  locationName?: string,
  categoryName?: string
): Promise<number[]> {
  if (typeof window === 'undefined') return [];

  try {
    if (!extractorPipeline) {
      const { pipeline, env } = await import('@huggingface/transformers');
      
      // Ensure we load models from the Hugging Face CDN
      env.allowLocalModels = false;
      
      extractorPipeline = await pipeline('feature-extraction', 'yuiseki/granite-embedding-97m-multilingual-r2-ONNX');
    }

    // Construct the semantic text string matching the server schema
    const inputParts = [
      `Event: ${title}`,
      `Details: ${description}`,
    ];
    if (locationName) inputParts.push(`Location: ${locationName}`);
    if (categoryName) inputParts.push(`Category: ${categoryName}`);
    
    const textToEmbed = inputParts.join('. ').slice(0, 10000);

    // Run inference (CLS pooling, normalized vector output)
    const output = await extractorPipeline(textToEmbed, { pooling: 'cls', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error('[Embedding] Failed to generate embedding client-side:', error);
    return [];
  }
}

/**
 * Generates a 384-dimensional vector embedding for an ad campaign using the IBM Granite multilingual embedding model.
 */
export async function generateCampaignEmbedding(
  title: string,
  description: string,
  targetTags?: string[],
  targetCountries?: string[]
): Promise<number[]> {
  if (typeof window === 'undefined') return [];

  try {
    if (!extractorPipeline) {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      extractorPipeline = await pipeline('feature-extraction', 'yuiseki/granite-embedding-97m-multilingual-r2-ONNX');
    }

    const inputParts = [
      `Campaign: ${title}`,
      `Description: ${description}`,
    ];
    if (targetTags && targetTags.length > 0) {
      inputParts.push(`Target Tags: ${targetTags.join(', ')}`);
    }
    if (targetCountries && targetCountries.length > 0) {
      inputParts.push(`Target Regions: ${targetCountries.join(', ')}`);
    }
    
    const textToEmbed = inputParts.join('. ').slice(0, 10000);
    const output = await extractorPipeline(textToEmbed, { pooling: 'cls', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error('[Embedding] Failed to generate campaign embedding client-side:', error);
    return [];
  }
}

/**
 * Generates a 384-dimensional vector embedding for a tag using the IBM Granite multilingual embedding model.
 */
export async function generateTagEmbedding(
  name: string,
  typeId?: string
): Promise<number[]> {
  if (typeof window === 'undefined') return [];

  try {
    if (!extractorPipeline) {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      extractorPipeline = await pipeline('feature-extraction', 'yuiseki/granite-embedding-97m-multilingual-r2-ONNX');
    }

    const inputParts = [`Tag: ${name}`];
    if (typeId) inputParts.push(`Type: ${typeId}`);
    
    const textToEmbed = inputParts.join('. ').slice(0, 10000);
    const output = await extractorPipeline(textToEmbed, { pooling: 'cls', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error('[Embedding] Failed to generate tag embedding client-side:', error);
    return [];
  }
}

/**
 * Generates a 384-dimensional vector embedding for a topic using the IBM Granite multilingual embedding model.
 */
export async function generateTopicEmbedding(
  displayName: string,
  description?: string,
  keywords?: string[]
): Promise<number[]> {
  if (typeof window === 'undefined') return [];

  try {
    if (!extractorPipeline) {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      extractorPipeline = await pipeline('feature-extraction', 'yuiseki/granite-embedding-97m-multilingual-r2-ONNX');
    }

    const inputParts = [`Topic: ${displayName}`];
    if (description) inputParts.push(`Description: ${description}`);
    if (keywords && keywords.length > 0) inputParts.push(`Keywords: ${keywords.join(', ')}`);
    
    const textToEmbed = inputParts.join('. ').slice(0, 10000);
    const output = await extractorPipeline(textToEmbed, { pooling: 'cls', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error('[Embedding] Failed to generate topic embedding client-side:', error);
    return [];
  }
}
