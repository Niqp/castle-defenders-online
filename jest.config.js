module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  roots: ['<rootDir>/server'],
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true,
};
