#!/usr/bin/env node

console.log('Starting test...');

process.env.MCP_DISABLE_LOGGING = 'true';

import { PersistentCacheManager } from './dist/cache/persistent-manager.js';

console.log('Imported cache manager');

const cacheManager = new PersistentCacheManager(86400000);
console.log('Created cache manager');

process.exit(0);