module.exports = {
  apps: [
    {
      name: "new-legalmate-backend",
      script: "./server.js",
      cwd: "./backend",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 9001
      }
    }
  ]
};
