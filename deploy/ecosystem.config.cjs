/** PM2 — run from deploy root where server.js lives */
module.exports = {
  apps: [
    {
      name: "hotpot-party",
      script: "server.js",
      cwd: "/var/www/hot-pot.ton-ton.fun",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3005",
        HOSTNAME: "127.0.0.1",
      },
    },
  ],
};
