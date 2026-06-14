#!/usr/bin/env npx
import { readFileSync, writeFileSync } from "fs";

const readme = readFileSync("README.md", "utf-8");

const result = readme.replace(
  /<!-- %%embed%% (\S+) -->\n(```typescript\n[\s\S]*?\n```)?/g,
  (_match, file: string) => {
    const code = readFileSync(file, "utf-8").trimEnd();
    return `<!-- %%embed%% ${file} -->\n\`\`\`typescript\n${code}\n\`\`\`\n`;
  }
);

writeFileSync("README.md", result);
