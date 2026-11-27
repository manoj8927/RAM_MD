module.exports = {
  apps: [{
    name: 'status-bot',
    script: 'deploy/start.js',
    cwd: __dirname,
    interpreter: 'node',
    autorestart: true,
    restart_delay: 5000,
    max_restarts: 50,
    exp_backoff_restart_delay: 100,
    kill_timeout: 10000,
    time: true,
    max_memory_restart: '450M',
    env: { NODE_ENV: 'production' },
  }],
};
