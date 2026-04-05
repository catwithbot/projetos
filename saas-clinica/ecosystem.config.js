module.exports = {
  apps: [
    {
      name: 'clinic-saas',
      script: './backend/server.js',
      instances: 1,            // aumente para 'max' se tiver múltiplos CPUs
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '300M',

      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Logs
      out_file: '/var/log/clinic-saas/out.log',
      error_file: '/var/log/clinic-saas/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Restart automático em caso de crash
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
