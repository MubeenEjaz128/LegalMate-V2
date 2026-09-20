const fs = require('fs');
const path = require('path');
const ragService = require('../services/ragService');

async function main() {
  if (process.env.BUILD_RAG_INDEX !== 'true') {
    console.log('[RAG Build] BUILD_RAG_INDEX is not true; skipping vector index build.');
    return;
  }

  const storePath = path.join(__dirname, '../storage/vector_store_hnsw');
  const cachePath = path.join(__dirname, '../node_modules/.cache/legalmate-rag/vector_store_hnsw');
  const forceRebuild = process.env.REBUILD_RAG_INDEX === 'true';

  // Render caches node_modules between builds. Reuse the built index when available.
  if (!forceRebuild && fs.existsSync(cachePath)) {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.rmSync(storePath, { recursive: true, force: true });
    fs.cpSync(cachePath, storePath, { recursive: true });
    console.log('[RAG Build] Restored vector store from Render build cache.');
    return;
  }

  const files = (process.env.RAG_DATASET_FILES || 'dataset.json,dataset1.json')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  console.log('[RAG Build] Building HNSW vector store from:', files.join(', '));
  await ragService.buildVectorStoreFromDatasets(files);

  if (fs.existsSync(storePath)) {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.rmSync(cachePath, { recursive: true, force: true });
    fs.cpSync(storePath, cachePath, { recursive: true });
    console.log('[RAG Build] Cached vector store for future Render deploys.');
  }

  console.log('[RAG Build] Completed successfully.');
}

main().catch((error) => {
  console.error('[RAG Build] Failed:', error);
  process.exit(1);
});
