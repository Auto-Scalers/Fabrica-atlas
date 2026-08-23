module.exports = {
  apps: [
    {
      name: "mission-control",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Auto-restart on crash
      autorestart: true,
      // Watch for file changes (disable in production)
      watch: false,
      // Max memory before restart
      max_memory_restart: "512M",
      // Merge stdout and stderr logs
      merge_logs: true,
    },
  ],
};
