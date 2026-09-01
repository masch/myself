const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: ["dist/**", ".expo/**", "web-build/**", "node_modules/**"],
  },
];
