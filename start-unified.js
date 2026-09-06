const path = require('path');

console.log('Starting LegalMate Unified Server...');

try {
  console.log('Starting Node.js Backend...');
  const backendDir = path.join(__dirname, 'backend');
  process.chdir(backendDir);
  require(path.join(backendDir, 'server.js'));
} catch (error) {
  console.error('Failed to start Node.js Backend:', error);
  process.exit(1);
}

process.on('SIGINT', () => {
  console.log('\nShutting down Unified Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down Unified Server...');
  process.exit(0);
});
