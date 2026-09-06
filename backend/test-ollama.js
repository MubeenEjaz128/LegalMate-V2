const http = require('http');

class OllamaClient {
  constructor() {
    this.baseUrl = 'http://localhost:11434';
    this.model = 'llama3.2:3b';
  }

  async test() {
    console.log('Testing Ollama API...');
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: 'What is theft in Pakistan?' }],
        stream: false
      });

      const options = {
        hostname: 'localhost',
        port: 11434,
        path: '/api/chat',
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body, 'utf8') 
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => {
            data += chunk;
            console.log(`Received chunk (${chunk.length} bytes)`);
        });
        res.on('end', () => {
          console.log(`\nTime: ${(Date.now() - startTime)/1000}s`);
          console.log('Response:', data.substring(0, 100));
          resolve();
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

new OllamaClient().test().catch(console.error);
