import { FlatCompat } from "@eslint/eslintrc"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const config = [
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "import/no-anonymous-default-export": "off",
      "prefer-const": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
]

export default config
