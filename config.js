
module.exports = {
  ssl: {
    key: '/path/to/your/domain.key',
    cert: '/path/to/your/domain.crt',
    enabled: false
  },
  server: {
    port: 8080,
    root: 'selfie',
    id: 'selfielog'
  },
  aws: {
    bucket: 'yourBucket',
    access: 'yourAccessKey',
    secret: 'yourSecretKey'
  },
  imagemin: {
    interlaced: true,
    progressive: true,
    optimizationLevel: 3
  },
  hashid: {
    salt: 'yourHashSalt',
    length: 4
  },
  redis: {
    port: 0,
    host: 'your.redis.host'
  },
  binary: {
    port: 9000,
    id: 'binary'
  },
  logger: {
    info: true,
    warn: true,
    debug: true,
    trace: true,
    error: true,
    fatal: true
  }
};
