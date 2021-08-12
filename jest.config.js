/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      compiler: 'ttypescript',
      tsconfig: {
        moduleResolution: 'Node',
        esModuleInterop: true,
        strict: true,
        allowJs: true,
        plugins: [
          { "transform": "./src/transform.ts" }
        ]
      },
      diagnostics: false //TODO work out why type-checking fails
    }
  }
};