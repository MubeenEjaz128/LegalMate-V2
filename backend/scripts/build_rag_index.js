const fs = require('fs');
const path = require('path');
const ragService = require('../services/ragService');

async function main() {
  if (process.env.BUILD_RAG_INDEX !== 'true') {
    console.log('[RAG Build] BUILD_RAG_INDEX is not true; skipping vector index build.');
    return;
  }

  const version = process.env.RAG_INDEX_VERSION || 'compact-v2';
  const storageRoot = path.join(__dirname, '../storage');
  const storePath = path.join(storageRoot, 'vector_store_hnsw');
  const sourcePath = path.join(storageRoot, 'rag_sources');

  const cacheRoot = path.join(__dirname, `../node_modules/.cache/legalmate-rag-${version}`);
  const cacheStorePath = path.join(cacheRoot, 'vector_store_hnsw');
  const cacheSourcePath = path.join(cacheRoot, 'rag_sources');
  const forceRebuild = process.env.REBUILD_RAG_INDEX === 'true';

  if (
    !forceRebuild &&
    fs.existsSync(cacheStorePath) &&
    fs.existsSync(cacheSourcePath)
  ) {
    fs.mkdirSync(storageRoot, { recursive: true });
    fs.rmSync(storePath, { recursive: true, force: true });
    fs.rmSync(sourcePath, { recursive: true, force: true });
    fs.cpSync(cacheStorePath, storePath, { recursive: true });
    fs.cpSync(cacheSourcePath, sourcePath, { recursive: true });
    console.log(`[RAG Build] Restored compact RAG index ${version} from Render build cache.`);
    return;
  }

  const files = (process.env.RAG_DATASET_FILES || 'dataset.json,dataset1.json')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  console.log(`[RAG Build] Building compact RAG index ${version} from:`, files.join(', '));
  await ragService.buildVectorStoreFromDatasets(files);

  if (fs.existsSync(storePath) && fs.existsSync(sourcePath)) {
    fs.mkdirSync(cacheRoot, { recursive: true });
    fs.rmSync(cacheStorePath, { recursive: true, force: true });
    fs.rmSync(cacheSourcePath, { recursive: true, force: true });
    fs.cpSync(storePath, cacheStorePath, { recursive: true });
    fs.cpSync(sourcePath, cacheSourcePath, { recursive: true });
    console.log(`[RAG Build] Cached compact RAG index ${version} for future Render deploys.`);
  }

  console.log('[RAG Build] Completed successfully.');
}

main().catch((error) => {
  console.error('[RAG Build] Failed:', error);
  process.exit(1);
});
