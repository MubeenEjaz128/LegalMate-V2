const ragService = require('../services/ragService');

async function main() {
  if (process.env.BUILD_RAG_INDEX !== 'true') {
    console.log('[RAG Build] BUILD_RAG_INDEX is not true; skipping vector index build.');
    return;
  }

  const files = (process.env.RAG_DATASET_FILES || 'dataset.json,dataset1.json')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  console.log('[RAG Build] Building HNSW vector store from:', files.join(', '));
  await ragService.buildVectorStoreFromDatasets(files);
  console.log('[RAG Build] Completed successfully.');
}

main().catch((error) => {
  console.error('[RAG Build] Failed:', error);
  process.exit(1);
});
