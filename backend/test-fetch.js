async function testFetch() {
  console.log('Sending fetch to Ollama...');
  const start = Date.now();
  try {
    const res = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        messages: [{ role: 'user', content: 'What is theft in Pakistan?' }],
        stream: false
      })
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log(`Time: ${(Date.now()-start)/1000}s`);
    console.log('Response:', data.message.content.substring(0, 100));
  } catch (err) {
    console.log('Error:', err.message);
  }
}
testFetch();
