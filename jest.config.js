module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      compiler: 'ttypescript',
      tsconfig: './src/test/tsconfig-test.json',
      diagnostics: false //TODO work out why type-checking fails
    },
  }
};