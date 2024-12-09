import globals from "globals";
import pluginReact from "eslint-plugin-react";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        AudioWorkletGlobalScope: true,
      },
      parserOptions: {
        ecmaVersion: 2020, // Specify ECMAScript version
        sourceType: "module", // Allow use of imports
        ecmaFeatures: {
          jsx: true, // Enable JSX support
        },
      },
    },
    settings: {
      react: {
        version: "detect", // Automatically detect the React version
      },
    },
    rules: {
      "no-console": "off", // Disable no-console rule
      "react/no-unknown-property": ["error", { ignore: ["rotation-x", "receiveShadow", "args", "object", "position", "intensity", "castShadow"] }], // Allow specific properties for @react-three/fiber
    },
  },
  pluginReact.configs.flat.recommended,
];