const ragService = require('../services/ragService');

async function test() {
    try {
        console.log("Initializing RAG Service...");
        await ragService.initialize();

        const query = "What is the Abandoned Properties Management Act 1975?";
        console.log(`Querying: "${query}"`);

        const response = await ragService.query(query);
        console.log("Response:", response.answer);
        console.log("Sources:", response.sources);

    } catch (error) {
        console.error("Test failed:", error);
    }
}

test();
