import { readFileSync } from "fs";

const s = readFileSync("./tmp-score.js", "utf8");
const paths = [
  ...new Set(
    [...s.matchAll(/["'](\/[a-zA-Z0-9_\-/?=&.]+)["']/g)]
      .map((m) => m[1])
      .filter(
        (p) =>
          p.includes("session") ||
          p.includes("feed") ||
          p.includes("game") ||
          p.includes("score") ||
          p.includes("site")
      )
  ),
];
console.log(paths);

const apiCalls = [...new Set([...s.matchAll(/apiBase[^;]{0,200}/g)].map((m) => m[0]))];
console.log("api snippets", apiCalls.slice(0, 10));
