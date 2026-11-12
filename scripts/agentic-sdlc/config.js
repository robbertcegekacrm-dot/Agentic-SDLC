// Demo configuration for the Agentic SDLC demo. No secrets in here.
const path = require('path');
module.exports = {
  envUrl: 'https://cegekapowerstudios.crm.dynamics.com',
  solution: 'AgenticSDLC',
  prefix: 'cgk', // verified against the solution publisher in 00-verify.js
  optionPrefix: 76663,
  lcid: 1033,
  cacheDir: path.resolve(__dirname, '..', '..'), // repo root: .token-cache.json is git ignored
};
