const main = require('./jest.config');

/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  ...main,
  globals: {
    ...main.globals,
    'ts-jest': {
      ...main.globals['ts-jest'],
      plugins: [
        { "transform": "./coverage/instrumented/transform.js" }
      ]
    }
  }
};
