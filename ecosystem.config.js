module.exports = {
  apps: [{
    name: 'trustednutra-webhook',
    script: './webhook-server/server.js',

    // Instances
    instances: 1,
    exec_mode: 'fork',

    // Auto-restart
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',

    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    // Logs
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Advanced
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,

    // Monitoring
    listen_timeout: 3000,
    kill_timeout: 5000
  }]
};
