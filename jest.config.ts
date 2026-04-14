import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // プロジェクトの tsconfig.json を使用（next-env.d.ts → RouteContext が利用可能）
        tsconfig: "<rootDir>/tsconfig.json",
      },
    ],
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "/app/generated/",
    "/.next/",
  ],
};

export default config;
