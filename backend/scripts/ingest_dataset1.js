const ragService = require('../services/ragService');
const path = require('path');

async function ingest() {
    try {
        console.log("Starting ingestion of dataset1.json...");
        await ragService.initialize();

        const datasetPath = path.join(__dirname, '../dataset1.json');
        console.log(`Target dataset: ${datasetPath}`); // Debug log

        await ragService.addDataset(datasetPath);

        console.log("Ingestion complete!");
    } catch (error) {
        console.error("Ingestion failed:", error);
    }
}

ingest();
