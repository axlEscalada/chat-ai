const serverModule = require('../backend/dist/server');
const app = serverModule.default || serverModule;

module.exports = app;
