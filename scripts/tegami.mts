// Tegami versioning and publishing config.
// Run it through the package script: `bun run tegami <command>`.
import { tegami } from "tegami";
import { runCli } from "tegami/cli";
import { github } from "tegami/plugins/github";

const paper = tegami({
  npm: {
    client: "bun",
  },
  plugins: [
    github({
      repo: "pulgueta/lazymage",
      versionPr: {
        base: "master",
      },
    }),
  ],
});

await runCli(paper);
