const { compilerOptions } = require('./tsconfig.json')
const { pathsToModuleNameMapper } = require('ts-jest/')

module.exports = {
  clearMocks: true,
  collectCoverage: false,
  coverageDirectory: 'coverage',

  coverageProvider: 'v8',
  roots: ['<rootDir>/src'],
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ],

  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>' })
}
