import globals from "globals";
import pluginReact from "eslint-plugin-react";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Start with react recommended configs
  ...pluginReact.configs.flat.recommended,
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        AudioWorkletGlobalScope: true,
      },
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "no-console": "off",
      // Allow certain Three.js props in React Three Fiber components
      "react/no-unknown-property": [
        "error",
        {
          ignore: [
            "rotation-x",
            "receiveShadow",
            "args",
            "object",
            "position",
            "intensity",
            "castShadow"
          ],
        },
      ],
    },
  },
];
