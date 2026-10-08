const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*']),
  expoConfig,
  {
    rules: {
      // Async Firestore loads intentionally set loading state from effects.
      'react-hooks/set-state-in-effect': 'off',
      // Reanimated shared values are mutable by design.
      'react-hooks/immutability': 'off',
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^#[0-9A-Fa-f]{3,8}$/]",
          message: 'Use a semantic theme colour token instead of a raw hex value.',
        },
      ],
    },
  },
]);
