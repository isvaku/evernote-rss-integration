module.exports = {
  'env': {
    'es2021': true,
    'node': true,
  },
  'extends': [
    'google',
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'ecmaVersion': 'latest',
    'sourceType': 'module',
  },
  'plugins': [
    '@typescript-eslint',
  ],
  'rules': {
    "semi": "off",
    "@typescript-eslint/semi": ["error", "always"],
    "new-cap": ["error", { "capIsNewExceptionPattern": "^express\\.." }],
  },
};
