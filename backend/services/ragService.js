const fs = require('fs');
const path = require('path');
const { ChatOpenAI } = require('@langchain/openai');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { franc } = require('franc-min');

// Lightweight Ollama REST client — no extra packages needed
class OllamaClient {
  constructor({ baseUrl = 'http://127.0.0.1:11434', model = 'llama3.2:3b', temperature = 0 } = {}) {
    this.baseUrl = baseUrl.replace('localhost', '127.0.0.1'); // Fix Node IPv6 hanging issue
    this.model = model;
    this.temperature = temperature;
  }

  // Call Ollama /api/chat endpoint with messages array
  async _callOllama(messages) {
    const url = `${this.baseUrl}/api/chat`;
    const body = JSON.stringify({
      model: this.model,
      messages: messages,
      stream: false,
      options: { temperature: this.temperature }
    });

    try {
      // Use native fetch to avoid Node http module hangs/socket bugs
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: body,
        signal: AbortSignal.timeout(240000) // 240s max for slow CPU generation
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data?.message?.content || '';
    } catch (e) {
      console.error('[Ollama Fetch Error Details]:', e, e.cause);
      throw new Error(`Ollama failed: ${e.message}`);
    }
  }

  // Compatible with LangChain chain: invoke({ context, history, question }) via prompt template
  // We receive the already-formatted prompt string from StringOutputParser chain
  async invoke(formattedMessages) {
    // formattedMessages is an array of BaseMessage objects from LangChain prompt
    const messages = formattedMessages.map(m => ({
      role: m._getType() === 'human' ? 'user' : 'system',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }));
    return this._callOllama(messages);
  }

  // LangChain pipe compatibility
  pipe(next) {
    const self = this;
    return {
      invoke: async (input) => {
        const result = await self.invoke(input);
        return next.invoke ? next.invoke(result) : result;
      }
    };
  }
}
let HNSWLib = null;
let transformersPipeline = null;

const tryLoadHNSWLib = () => {
  if (HNSWLib) {
    return HNSWLib;
  }

  try {
    ({ HNSWLib } = require('@langchain/community/vectorstores/hnswlib'));
    return HNSWLib;
  } catch (error) {
    return null;
  }
};

const resolveUsableHNSWLib = async () => {
  const HNSW = tryLoadHNSWLib();
  if (!HNSW) {
    return null;
  }

  try {
    if (typeof HNSW.imports === 'function') {
      await HNSW.imports();
    }
    return HNSW;
  } catch (error) {
    return null;
  }
};

const tryLoadTransformersPipeline = () => {
  if (transformersPipeline) {
    return transformersPipeline;
  }

  try {
    ({ pipeline: transformersPipeline } = require('@xenova/transformers'));
    return transformersPipeline;
  } catch (error) {
    return null;
  }
};

class LocalEmbeddings {
  constructor() {
    this.pipe = null;
    this.modelName = 'Xenova/all-MiniLM-L6-v2';
  }

  async initialize() {
    if (!this.pipe) {
      const pipeline = tryLoadTransformersPipeline();
      if (!pipeline) {
        throw new Error('Failed to load @xenova/transformers pipeline.');
      }

      console.log('Loading local embedding model:', this.modelName);
      this.pipe = await pipeline('feature-extraction', this.modelName);
      console.log('Local embedding model loaded.');
    }
  }

  async embedDocuments(texts) {
    await this.initialize();
    const embeddings = [];
    const BATCH_SIZE = 16;

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const cleanBatch = batch.map(t => t.replace(/\n/g, ' '));

      try {
        const output = await this.pipe(cleanBatch, { pooling: 'mean', normalize: true });
        // The output for a list of inputs is a Tensor with shape [batch_size, hidden_size]
        // We need to convert it to arrays.
        // output.tolist() usually works for Xenova tensors
        if (output && output.tolist) {
          embeddings.push(...output.tolist());
        } else if (output && output.data) {
          // Fallback if tolist() isn't available, but for batch it's tricky with raw data
          // Assuming tolist() exists which is standard for new transformers.js
          embeddings.push(...output.tolist());
        }
      } catch (err) {
        console.error(`Batch failed at index ${i}, falling back to single processing`, err);
        // Fallback to single
        for (const text of cleanBatch) {
          const out = await this.pipe(text, { pooling: 'mean', normalize: true });
          embeddings.push(Array.from(out.data));
        }
      }

      // Log progress
      if ((i + BATCH_SIZE) % 100 < BATCH_SIZE) {
        console.log(`Embedded ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length} chunks...`);
      }
      // Yield to event loop
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return embeddings;
  }

  async embedQuery(text) {
    await this.initialize();
    const cleanText = text.replace(/\n/g, ' ');
    const output = await this.pipe(cleanText, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }
}

class HashEmbeddings {
  constructor({ dimensions = 512 } = {}) {
    this.dimensions = dimensions;
  }

  _hash(str, seed = 2166136261) {
    let h = seed >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  _embed(text) {
    const vector = new Array(this.dimensions).fill(0);
    const tokens = String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const features = [];
    for (let i = 0; i < tokens.length; i++) {
      features.push(tokens[i]);
      if (i + 1 < tokens.length) features.push(tokens[i] + '_' + tokens[i + 1]);
    }

    for (const feature of features) {
      const h1 = this._hash(feature);
      const h2 = this._hash(feature, 0x9e3779b1);
      const index = h1 % this.dimensions;
      const sign = (h2 & 1) === 0 ? 1 : -1;
      vector[index] += sign;
    }

    let norm = 0;
    for (const value of vector) norm += value * value;
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < vector.length; i++) vector[i] /= norm;
    return vector;
  }

  async embedDocuments(texts) {
    return texts.map((text) => this._embed(text));
  }

  async embedQuery(text) {
    return this._embed(text);
  }
}

const createEmbeddings = () => {
  const mode = (process.env.RAG_EMBEDDING_MODE || 'transformer').toLowerCase();
  if (mode === 'hash') {
    console.log('[RAG] Using fast hash embeddings for retrieval.');
    return new HashEmbeddings({
      dimensions: parseInt(process.env.RAG_HASH_DIMENSIONS || '512', 10)
    });
  }
  return new LocalEmbeddings();
};

const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { Document } = require('@langchain/core/documents');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { RunnableSequence } = require('@langchain/core/runnables');

class RAGService {
  constructor() {
    this.vectorStore = null;
    this.model = null;
    this.fallbackModel = null;
    this.localModel = null;  // Ollama — 3rd fallback (local LLM)
    this.activeProvider = null; // 'codecraft', 'perplexity', or 'gemini'
    this.deadProviders = new Set(); // Track permanently failed cloud providers
    this.isInitialized = false;
    this.ragEnabled = true;
    this.ragDisableReason = '';
    this.vectorStorePath = path.join(__dirname, '../storage/vector_store_hnsw');
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing RAG Service...');

    // Initialize PRIMARY model: CodeCraft (OpenAI-compatible)
    const codecraftKey = process.env.CODECRAFT_API_KEY;
    const codecraftBaseUrl = process.env.CODECRAFT_BASE_URL || 'https://codecraftapi.com/v1';
    const codecraftModel = process.env.CODECRAFT_MODEL || 'gpt-5.6-sol';

    if (codecraftKey) {
      this.model = new ChatOpenAI({
        model: codecraftModel,
        temperature: 0,
        maxRetries: 1,
        timeout: 60000,
        apiKey: codecraftKey,
        configuration: {
          baseURL: codecraftBaseUrl,
        },
      });
      this.activeProvider = 'codecraft';
      console.log(`[RAG] Primary AI model: CodeCraft ${codecraftModel}`);
    }

    // Optional fallback: Perplexity
    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    if (perplexityKey) {
      const perplexityModel = new ChatOpenAI({
        model: 'sonar',
        temperature: 0,
        maxRetries: 0,
        timeout: 15000,
        apiKey: perplexityKey,
        configuration: {
          baseURL: 'https://api.perplexity.ai',
        },
      });

      if (!this.model) {
        this.model = perplexityModel;
        this.activeProvider = 'perplexity';
        console.log('[RAG] Primary AI model: Perplexity Sonar');
      } else if (!this.fallbackModel) {
        this.fallbackModel = perplexityModel;
        console.log('[RAG] Fallback AI model: Perplexity Sonar');
      }
    }

    // Optional fallback: Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const geminiModel = new ChatGoogleGenerativeAI({
        model: 'gemini-2.0-flash',
        temperature: 0,
        maxRetries: 0,
        timeout: 15000,
        apiKey: geminiKey,
        maxOutputTokens: 2048,
      });

      if (!this.model) {
        this.model = geminiModel;
        this.activeProvider = 'gemini';
        console.log('[RAG] Primary AI model: Gemini 2.0 Flash');
      } else if (!this.fallbackModel) {
        this.fallbackModel = geminiModel;
        console.log('[RAG] Fallback AI model: Gemini 2.0 Flash');
      }
    }

    // Ollama is opt-in only. Do not silently use localhost in production.
    if (process.env.ENABLE_OLLAMA_FALLBACK === 'true') {
      const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
      const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';
      this.localModel = new OllamaClient({
        baseUrl: ollamaBaseUrl,
        model: ollamaModel,
        temperature: 0,
      });
      console.log(`[RAG] Optional local fallback enabled: Ollama (${ollamaModel})`);
    }

    if (!this.model) {
      console.error('[RAG] No cloud AI model configured. Set CODECRAFT_API_KEY (recommended), PERPLEXITY_API_KEY, or GEMINI_API_KEY.');
    }

    const HNSW = await resolveUsableHNSWLib();
    if (!HNSW) {
      this.ragEnabled = false;
      this.ragDisableReason = 'hnswlib-node runtime is unavailable in this environment';
      this.isInitialized = true;
      console.warn(`[RAG] Disabled: ${this.ragDisableReason}.`);
      return;
    }

    // Initialize Embeddings (Local - Free)
    const embeddings = createEmbeddings();

    // Check if vector store exists on disk
    if (fs.existsSync(this.vectorStorePath)) {
      console.log('Loading existing vector store...');
      try {
        this.vectorStore = await HNSW.load(this.vectorStorePath, embeddings);
        this.isInitialized = true;
        console.log('Vector store loaded.');
        return;
      } catch (error) {
        console.error('Error loading vector store:', error);
        this.ragEnabled = false;
        this.ragDisableReason = 'vector store load failed';
        this.isInitialized = true;
        console.warn(`[RAG] Disabled: ${this.ragDisableReason}.`);
        return;
      }
    }

    this.ragEnabled = false;
    this.ragDisableReason = 'vector store not found; run ingestion to enable RAG';
    this.isInitialized = true;
    console.warn(`[RAG] Disabled: ${this.ragDisableReason}.`);
  }

  async createVectorStore(embeddings) {
    const HNSW = await resolveUsableHNSWLib();
    if (!HNSW) {
      throw new Error('Cannot create vector store because hnswlib-node runtime is unavailable.');
    }

    const datasetPath = path.join(__dirname, '../dataset.json');
    if (!fs.existsSync(datasetPath)) {
      throw new Error('dataset.json not found!');
    }

    const rawData = fs.readFileSync(datasetPath, 'utf8');
    const dataset = JSON.parse(rawData);
    const documents = [];

    // Process dataset.json
    for (const entry of dataset) {
      const docs = await this.processEntry(entry);
      documents.push(...docs);
    }

    console.log(`Processed ${documents.length} chunks from dataset.json.`);

    // Create Vector Store
    this.vectorStore = await HNSW.fromDocuments(documents, embeddings);

    // Save to disk
    await this.vectorStore.save(this.vectorStorePath);
    console.log('Vector store saved.');
  }

  // Refactored processing logic to be reusable
  async processEntry(entry) {
    const cleanedText = this.cleanText(entry.text);
    const lawTitle = this.detectLawTitle(cleanedText) || entry.file_name;

    // Create chunks
    const chunks = await this.chunkText(cleanedText, {
      fileName: entry.file_name,
      lawTitle: lawTitle
    });
    return chunks;
  }

  async addDataset(filePath) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.ragEnabled) {
      throw new Error('RAG ingestion is disabled because hnswlib-node is unavailable.');
    }

    const HNSW = await resolveUsableHNSWLib();
    if (!HNSW) {
      throw new Error('Cannot ingest dataset because hnswlib-node runtime is unavailable.');
    }

    console.log(`Adding dataset from: ${filePath}`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Dataset not found at ${filePath}`);
    }

    const rawData = fs.readFileSync(filePath, 'utf8');
    let dataset;
    try {
      dataset = JSON.parse(rawData);
    } catch (e) {
      throw new Error('Invalid JSON in dataset file.');
    }

    const allDocuments = [];
    for (const entry of dataset) {
      const docs = await this.processEntry(entry);
      allDocuments.push(...docs);
    }

    console.log(`Total ${allDocuments.length} chunks to process.`);

    const ADD_BATCH_SIZE = 200;

    for (let i = 0; i < allDocuments.length; i += ADD_BATCH_SIZE) {
      const batch_docs = allDocuments.slice(i, i + ADD_BATCH_SIZE);

      if (!this.vectorStore) {
        const embeddings = createEmbeddings();
        this.vectorStore = await HNSW.fromDocuments(batch_docs, embeddings);
      } else {
        await this.vectorStore.addDocuments(batch_docs);
      }

      await this.vectorStore.save(this.vectorStorePath);
      console.log(`Saved chunks ${i + 1} to ${Math.min(i + ADD_BATCH_SIZE, allDocuments.length)}/${allDocuments.length}.`);
    }

    console.log('Ingestion complete. Vector store updated and saved.');
  }

  async buildVectorStoreFromDatasets(fileNames = ['dataset.json', 'dataset1.json']) {
    const HNSW = await resolveUsableHNSWLib();
    if (!HNSW) {
      throw new Error('Cannot build vector store because hnswlib-node runtime is unavailable.');
    }

    const embeddings = createEmbeddings();
    let store = null;
    const batchSize = Math.max(25, parseInt(process.env.RAG_BUILD_BATCH_SIZE || '100', 10));

    for (const fileName of fileNames) {
      const datasetPath = path.join(__dirname, '..', fileName);
      if (!fs.existsSync(datasetPath)) {
        console.warn(`[RAG Build] Skipping missing dataset: ${fileName}`);
        continue;
      }

      console.log(`[RAG Build] Reading ${fileName}...`);
      const rawData = fs.readFileSync(datasetPath, 'utf8');
      const dataset = JSON.parse(rawData);
      console.log(`[RAG Build] ${fileName}: ${dataset.length} source records`);

      let pendingDocs = [];
      let processed = 0;

      const flush = async () => {
        if (!pendingDocs.length) return;
        if (!store) {
          store = await HNSW.fromDocuments(pendingDocs, embeddings);
        } else {
          await store.addDocuments(pendingDocs);
        }
        processed += pendingDocs.length;
        console.log(`[RAG Build] ${fileName}: indexed ${processed} chunks`);
        pendingDocs = [];
      };

      for (const entry of dataset) {
        const docs = await this.processEntry(entry);
        pendingDocs.push(...docs);
        if (pendingDocs.length >= batchSize) {
          await flush();
        }
      }

      await flush();
    }

    if (!store) {
      throw new Error('No documents were available to build the RAG vector store.');
    }

    fs.mkdirSync(path.dirname(this.vectorStorePath), { recursive: true });
    await store.save(this.vectorStorePath);
    this.vectorStore = store;
    this.ragEnabled = true;
    this.ragDisableReason = '';
    console.log(`[RAG Build] Vector store saved to ${this.vectorStorePath}`);
    return this.vectorStorePath;
  }

  cleanText(text) {
    if (!text) return "";

    let cleaned = text;

    // 1. Remove page numbers (e.g., "Page 1 of 19", "Page 2")
    cleaned = cleaned.replace(/Page\s+\d+(\s+of\s+\d+)?/gi, '');

    // 2. Remove repeated headers/footers (This is hard to do perfectly without heuristics, 
    // but we can try to remove common patterns if we knew them. 
    // For now, we rely on the fact that page numbers are often the main noise).

    // 3. Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  detectLawTitle(text) {
    // Heuristic: Look for the first all-caps line or "ACT", "ORDINANCE" in the first few chars
    // This is a simple heuristic.
    const match = text.match(/(?:THE\s+)?([A-Z\s]+(?:ACT|ORDINANCE|ORDER)[A-Z\s,\d]*)/i);
    if (match) {
      return match[1].trim();
    }
    return null;
  }

  async chunkText(text, metadata) {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 3500, // ~800-1000 tokens
      chunkOverlap: 600, // ~150 tokens
      separators: ["\n\n", "\n", " ", ""], // Try to split by paragraphs first
    });

    const docs = await splitter.createDocuments([text]);

    // Enhance metadata for each chunk
    return docs.map(doc => {
      // Try to detect section in this specific chunk
      const sectionMatch = doc.pageContent.match(/(?:Section|Article)\s+(\d+[A-Z]*)/i);
      const section = sectionMatch ? sectionMatch[1] : null;

      return new Document({
        pageContent: doc.pageContent,
        metadata: {
          ...metadata,
          section: section
        }
      });
    });
  }

  detectLanguage(text) {
    // 1. Check Roman Urdu Heuristics FIRST (Strong Override)
    const romanUrduKeywords = ["kya", "hai", "ka", "ki", "saza", "qanoon", "chori", "mein", "ko", "se", "par", "aur", "nahi", "wala", "wali", "krna", "karna", "tha", "thi", "ga", "gi", "hy", "dy", "ly"];
    const lowerText = text.toLowerCase();

    // Check if at least one keyword matches logic
    const isRomanUrdu = romanUrduKeywords.some(word => new RegExp(`\\b${word}\\b`).test(lowerText));
    if (isRomanUrdu) {
      return 'ro';
    }

    // 2. Fallback to franc
    const langCode = franc(text);
    return langCode;
  }

  async query(question, chatHistory = []) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const normalizedQuestion = String(question || '').trim();
    const isGreeting = /^(hi|hii+|hey|hello|hy|salam|assalam(?:\s*o\s*alaikum)?|aoa)[!.?\s]*$/i.test(normalizedQuestion);
    if (isGreeting) {
      return {
        answer: "Hello! I am your AI legal assistant. I can help with Pakistani laws and website-related guidance.",
        sources: []
      };
    }

    // Must have at least one AI model
    if (!this.model) {
      return {
        answer: "AI assistant is temporarily unavailable. No AI API keys configured. Please contact the administrator.",
        sources: []
      };
    }

    // Topic Detection (before RAG retrieval for efficiency)
    const isLegalQuestion = /law|legal|court|divorce|marriage|custody|crime|rights|act|section|judge|lawyer|attorney|petition|case|punjab|pakistan|قانون|طلاق|شادی/i.test(question);
    const isWebsiteQuestion = /appointment|booking|book.*lawyer|payment|website|platform|chat|call|video|audio|service|fee/i.test(question);

    // 1. Retrieve Relevant Context (RAG) — only if vector store available
    let relevantDocs = [];
    let contextText = "No context available";

    if (this.ragEnabled && this.vectorStore) {
      try {
        const results = await this.vectorStore.similaritySearchWithScore(question, 5);
        const MAX_L2_DISTANCE = (process.env.RAG_EMBEDDING_MODE || '').toLowerCase() === 'hash' ? 1.15 : 0.70;

        if (results && results.length > 0) {
          relevantDocs = results
            .filter(([doc, score]) => score < MAX_L2_DISTANCE)
            .map(([doc, score]) => doc);
        }

        if (relevantDocs.length > 0) {
          contextText = relevantDocs.map(doc => `${doc.pageContent}`).join("\n\n---\n\n");
        }
      } catch (ragError) {
        console.warn('[RAG] Vector store search failed, proceeding without context:', ragError.message);
      }
    }

    const hasRelevantContext = relevantDocs.length > 0;

    // If no relevant context found for legal questions, return early
    if (isLegalQuestion && !hasRelevantContext) {
      return {
        answer: "I apologize, but I don't have specific information about this in our legal database. Please consult a qualified lawyer or contact our support team for assistance.",
        sources: []
      };
    }

    // 2. Prepare Prompt Variables
    let historyText = "";
    if (chatHistory && chatHistory.length > 0) {
      historyText = chatHistory.map(m => `User: ${m.userQuery}\nAssistant: ${m.aiResponse}`).join("\n\n");
    }

    // 3. Unified System Prompt
    const systemPromptText = `You are a professional AI Legal Assistant integrated into an existing RAG-based system.
This system already retrieves relevant context from Pakistani laws and public website data.

========================
STRICT RAG ENFORCEMENT (CRITICAL)
========================
You MUST ONLY answer based on the RETRIEVED CONTEXT provided below.

IF the retrieved context is empty or not relevant to the question:
- Do NOT make up information
- Do NOT use general knowledge
- Do NOT provide generic answers
- Respond EXACTLY with: "I apologize, but I don't have specific information about this in our legal database. Please consult a qualified lawyer or contact our support team for assistance."

ONLY answer when:
1. Relevant context is provided in the RETRIEVED CONTEXT section below
2. The context directly relates to the user's question
3. You can cite information from the provided legal documents

========================
STRICT TOPIC ENFORCEMENT (CRITICAL)
========================
You ONLY answer questions about:
1. Pakistani laws (family law, civil law, criminal procedure, cyber law, etc.)
2. This legal platform's website features (booking lawyers, appointments, payments, chat, etc.)

You MUST REJECT all other topics including:
- Programming/coding questions (Python, JavaScript, etc.)
- General knowledge questions
- Math problems
- Science, history, geography
- Technology tutorials
- Any topic unrelated to Pakistani law or this legal website

If a question is OFF-TOPIC, respond EXACTLY with:
"I apologize, but I can only assist with questions about Pakistani laws and this legal platform's services. Please ask me about legal matters or how to use our website."

Do NOT attempt to answer off-topic questions. Do NOT provide any code, calculations, or general information.

========================
YOUR CORE RESPONSIBILITY
========================
1) Provide clear, user-friendly general legal information related to Pakistani laws (especially Punjab), and
2) Provide public assistance related to this legal platform’s website.

You must FIRST understand and use the context provided by the existing RAG services.
The retrieved context is the strict factual boundary for legal answers.
Do NOT add legal facts, sections, procedures, penalties, or claims that are not supported by the retrieved context.

========================
LANGUAGE RULES (STRICT)
========================
- Respond in the SAME language as the user.
- IF user asks in English -> Respond in clear, professional English.
- IF user asks in Roman Urdu -> Respond in Roman Urdu ONLY (Latin script).
- NEVER use Urdu script/Arabic characters (e.g., "چوری", "خدا").
- Use English letters ONLY.
- Do NOT mix Urdu and English sentences randomly; keep the flow consistent.

========================
FORMATTING RULES (CRITICAL)
========================
ALWAYS follow this exact structure:

1. **Clean Opening**: Start with a 1-2 sentence clear definition or introduction. NO asterisks at the beginning.

2. **Organized Sections**: Use proper markdown headings
   - Main sections: ## Section Name (with space after ##)
   - Subsections: ### Subsection Name (if needed)
   - ALWAYS add ONE blank line before each heading
   - ALWAYS add ONE blank line after each heading
   - Example: "## Legal Process" NOT "Legal Process" or "*Legal Process"
   
3. **Lists and Bullet Points**:
   - Use simple numbered lists (1., 2., 3.) or bullet points (-)
   - Each item should be on a new line
   - NO asterisks in list items
   - NO nested formatting inside list items unless absolutely necessary
   - Add ONE blank line before starting a list
   
4. **Emphasis**:
   - Use **bold** ONLY for key terms (max 3-5 per response)
   - NEVER use italics with asterisks (*word*)
   - Avoid overusing formatting
   
5. **Spacing**:
   - ONE blank line between paragraphs
   - ONE blank line before and after headings
   - ONE blank line before lists
   - NO extra blank lines

6. **DO NOT**:
   - NEVER start sentences, paragraphs, or sections with standalone asterisks (*)
   - NEVER use *word* for italics - use plain text instead
   - Use asterisks ONLY for **bold** formatting (double asterisks)
   - Over-format responses
   - Create cluttered or dense text blocks
   - Use inconsistent spacing
   
7. **CRITICAL**: Remove ALL standalone asterisks from your response. They make the text look unprofessional.

Example of GOOD formatting (FOLLOW THIS EXACTLY):

Divorce is the legal dissolution of a marriage by a court, which ends the spouses' legal duties and allows them to remarry.

## Legal Process

The divorce is finalized when a judge issues a formal decree in court. This process typically involves several steps that must be completed according to Pakistani law.

## Key Issues Decided

During divorce proceedings, the court decides:

1. Division of property and debts
2. Child custody and visitation rights
3. Child support payments
4. Spousal support (maintenance/alimony) if applicable

## Types of Divorce

**Full Divorce**: The marriage is completely dissolved and both parties return to single status.

**Judicial Separation**: The right to live apart is granted, but the marriage technically remains intact.

## Grounds for Divorce

Divorce can be granted based on fault grounds such as adultery, cruelty, or desertion. Alternatively, no-fault divorce is available when there are irreconcilable differences.

---

**Disclaimer**: This information is for general legal guidance only and does not constitute legal advice. For specific matters, consult a qualified lawyer.

NOTE: NO asterisks at line starts, NO *italics*, ONLY **bold** for emphasis.

========================
CORE BEHAVIOR
========================
You are a legal assistant, NOT a document validator.
Your goal is to help the user clearly understand Pakistani law or the website process.

Do NOT mention:
- datasets
- training data
- vector stores
- internal documents
- source limitations
- phrases like “not available in dataset”

Do NOT include sections like "Sources Used", "References", "Citations", or lists of Acts at the end of the response. The system will automatically append sources if available.

Never explain internal system behavior to the user.

========================
RAG GROUNDING RULE
========================
- Use only the retrieved context for factual legal content.
- Do not rely on general model knowledge to fill missing legal facts.
- If the retrieved context is not sufficient, use the exact no-information response defined above.
- Never invent Acts, Sections, penalties, procedures, dates, or citations.

========================
AUTOMATIC MODE HANDLING
========================
You automatically decide the mode based on the user’s question.
Do NOT ask the user to choose a mode.

MODE 1 — PAKISTANI LAWS:
- Answer general legal questions about Pakistani laws.
- Focus on family law, civil law, criminal procedure (basic), and cyber law (basic).
- Provide step-by-step explanations where possible.
- Mention relevant Acts or Sections if helpful, but do NOT over-cite.
- Explain only Pakistani legal principles that are supported by the retrieved context.
- Do NOT provide legal advice.
- Do NOT give case-specific opinions or verdicts.

MODE 2 — WEBSITE ASSISTANCE:
- Answer questions about the platform’s public features only.
- Explain:
  - lawyer booking process
  - appointment scheduling
  - video/audio call usage
  - chat feature usage
  - payment flow (public information only)
- Do NOT access or mention private or internal data.

========================
STRICT PRIVACY RULES
========================
You must NEVER:
- access or reveal personal data of clients, lawyers, or admins
- discuss earnings, private meetings, internal records
- answer questions about specific users or individual cases

If asked for private or confidential data, politely refuse with:
“I cannot access or share private or confidential information.”

========================
ANSWER STYLE
========================
- Be clear, structured, and user-friendly.
- Prefer numbered steps or bullet points.
- Avoid long, defensive, or technical explanations.
- Avoid moral, political, or religious opinions.
- Keep answers concise and practical (aim for 150-250 words unless more detail is requested).
- Use clean, professional formatting as outlined above.
- If the user asks for a basic process, do not include advanced details, exceptions, or provincial comparisons unless asked.

For legal process questions, follow this structure:
- Clean opening (1-2 sentences defining the topic)
- Main content organized in clear sections with headings
- 4-6 clear steps if it's a process
- End with disclaimer

========================
DISCLAIMER RULE
========================
For legal questions ONLY, add this EXACT disclaimer at the end:

---

**Disclaimer**: This information is for general legal guidance only and does not constitute legal advice. For specific matters, consult a qualified lawyer.

IMPORTANT: Use three dashes (---) NOT two dashes (--) for the separator.

Do NOT add disclaimers to website assistance answers.

========================
GREETING (FIRST MESSAGE ONLY)
========================
“Hello! I am your AI legal assistant. I can help with Pakistani laws and website-related guidance.”

Only greet the user if this is the first message in the conversation.
Do not repeat the greeting if conversation history exists.

========================
MODEL CONTEXT
========================
You are running as an AI legal assistant.
Do not mention the model name, provider, or API details in responses.

========================
RETRIEVED CONTEXT (MANDATORY - Use ONLY this information):
{context}

IMPORTANT: If the above context is empty or says "No context", you MUST respond with:
"I apologize, but I don't have specific information about this in our legal database. Please consult a qualified lawyer or contact our support team for assistance."

========================
PREVIOUS CONVERSATION:
{history}
`;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPromptText],
      ["human", "{question}"]
    ]);

    // 4. Call Model
    const chain = RunnableSequence.from([prompt, this.model, new StringOutputParser()]);

    // Topic Validation (Check for Off-Topic Questions)
    const offTopicPatterns = [
      /write.*code|python|javascript|java\s|programming|function|variable|loop|array/i,
      /add.*numbers|calculate|math|equation|formula/i,
      /recipe|cooking|food/i,
      /weather|climate/i,
      /sports|football|cricket(?!.*law)|game/i,
      /movie|film|music|song/i,
      /history(?!.*law)|geography|science(?!.*law)/i,
      /tutorial|how to (make|build|create)(?!.*(case|petition|application))/i
    ];

    // Check if question is clearly off-topic (not about law or website)
    // Note: isLegalQuestion and isWebsiteQuestion are already defined above
    const isOffTopic = offTopicPatterns.some(rx => rx.test(question));

    if (isOffTopic && !isLegalQuestion && !isWebsiteQuestion) {
      return {
        answer: "I apologize, but I can only assist with questions about Pakistani laws and this legal platform's services. Please ask me about legal matters or how to use our website.",
        sources: []
      };
    }

    // Safety Fallback (Hard Check for Forbidden Topics)
    const forbiddenPatterns = [
      /earnings|revenue|profit|income/i,
      /salary|pay|compensation/i,
      /private\s+meeting|recording|call\s+logs/i,
      /user\s+data|personal\s+data|cnic|address|phone/i,
      /admin\s+password|credentials|api\s+key/i,
      /specific\s+client|specific\s+lawyer/i
    ];

    if (forbiddenPatterns.some(rx => rx.test(question))) {
      return {
        answer: "I cannot access or share private or confidential information.",
        sources: []
      };
    }

    try {
      const rawResponse = await this._invokeWithFallback(chain, {
        context: contextText || "No context available",
        history: historyText,
        question: question
      });

      // 6. Formatting (Cleanup only, Model handles Disclaimer)
      const formattedResponse = this.formatResponse(rawResponse);

      // Sources metadata
      const sources = relevantDocs.map(doc => ({
        file: doc.metadata.lawTitle || 'Unknown Law',
        preview: doc.pageContent.substring(0, 100) + "...",
        section: doc.metadata.section
      }));

      return { answer: formattedResponse, sources: sources };
    } catch (error) {
      console.error("Error invoking model:", error);
      return { answer: "I apologize, but I am currently unable to process your request. Please try again later.", sources: [] };
    }
  }

  /**
   * Build a concise Ollama-friendly prompt (small model, short context window).
   */
  _buildOllamaMessages(input) {
    const systemMsg = `You are a Pakistani legal assistant. Answer ONLY about Pakistani laws or this legal website's features.

Rules:
- Answer based on the CONTEXT below only
- If context is empty or irrelevant, say: "I don't have specific info on this. Please consult a qualified lawyer."
- For website questions (appointments, booking, payments), explain clearly
- Respond in the SAME language as the user (English or Roman Urdu)
- Keep answers concise and clear (100-200 words)
- End legal answers with: "Note: This is general info, not legal advice. Consult a lawyer for your case."
- NEVER answer off-topic questions (coding, cooking, sports, etc.)

CONTEXT:
${input.context || 'No context available'}

PREVIOUS CONVERSATION:
${input.history || 'None'}`;

    return [
      { role: 'system', content: systemMsg },
      { role: 'user', content: input.question }
    ];
  }

  /**
   * Directly call Ollama with the given prompt inputs (bypasses LangChain chain).
   */
  async _invokeOllamaDirect(promptTemplate, input) {
    // Use concise Ollama-specific prompt instead of the huge cloud prompt
    const messages = this._buildOllamaMessages(input);
    return this.localModel._callOllama(messages);
  }

  /**
   * Invoke the AI chain with automatic fallback to the secondary model.
   * Tries primary → Gemini → Ollama (local) in order.
   * Dead providers are skipped immediately.
   */
  async _invokeWithFallback(chain, input) {
    const promptTemplate = chain.first;

    try {
      return await chain.invoke(input);
    } catch (primaryError) {
      const primaryMessage = primaryError?.message || String(primaryError);
      console.error(`[RAG] Primary provider (${this.activeProvider || 'unknown'}) failed: ${primaryMessage.substring(0, 300)}`);

      if (this.fallbackModel) {
        try {
          console.warn('[RAG] Trying configured cloud fallback model...');
          const fallbackChain = RunnableSequence.from([
            promptTemplate,
            this.fallbackModel,
            new StringOutputParser()
          ]);
          const result = await fallbackChain.invoke(input);
          console.log('[RAG] Cloud fallback succeeded.');
          return result;
        } catch (fallbackError) {
          console.error('[RAG] Cloud fallback failed:', (fallbackError?.message || String(fallbackError)).substring(0, 300));
        }
      }

      if (this.localModel) {
        try {
          console.warn('[RAG] Trying explicitly enabled Ollama fallback...');
          return await this._invokeOllamaDirect(promptTemplate, input);
        } catch (ollamaError) {
          console.error('[RAG] Ollama fallback failed:', (ollamaError?.message || String(ollamaError)).substring(0, 300));
        }
      }

      throw primaryError;
    }
  }


  formatResponse(text) {
    if (!text) return "";
    let formatted = text;

    // Remove standalone asterisks at the beginning of lines
    formatted = formatted.replace(/^\*+\s*/gm, '');
    
    // Remove asterisks used for emphasis (single asterisks around words)
    formatted = formatted.replace(/(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)/g, '$1');
    
    // Fix double dashes to triple dashes for proper markdown separators
    formatted = formatted.replace(/^--$/gm, '---');
    
    // Ensure headings have proper spacing (blank line before heading)
    formatted = formatted.replace(/([^\n])\n(#{1,3}\s)/g, '$1\n\n$2');
    
    // Ensure blank line after headings
    formatted = formatted.replace(/(#{1,3}\s.+)\n([^\n])/g, '$1\n\n$2');
    
    // Ensure lists have blank line before them (but not if preceded by heading)
    formatted = formatted.replace(/([^\n#])\n(\d+\.\s|[-*]\s)/g, '$1\n\n$2');
    
    // Standard markdown cleanup: Max 2 newlines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Clean up any remaining formatting issues
    formatted = formatted.trim();

    return formatted;
  }
}

module.exports = new RAGService();
