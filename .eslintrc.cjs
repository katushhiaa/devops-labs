module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true, 
  },
  globals: {
    __ENV: 'readonly', 
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
  ],
  rules: {
    'no-unused-vars': 'warn',
  },
};