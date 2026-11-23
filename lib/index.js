'use strict';
// Minimal compatibility exports for reviewed Levanter-style plugins.
const adapter = require('./levanter-adapter');
const logger = {
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  debug: (...args) => console.debug(...args)
};
module.exports = { bot: adapter.register, Module: adapter.register, logger };
