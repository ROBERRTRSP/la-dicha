import { readFileSync } from "fs";

function revive(arr, idx, seen = new Map()) {
  if (typeof idx !== "number") return idx;
  if (seen.has(idx)) return seen.get(idx);
  const v = arr[idx];
  if (v === null || typeof v !== "object") {
    seen.set(idx, v);
    return v;
  }
  if (Array.isArray(v)) {
    const out = v.map((x) => (typeof x === "number" ? revive(arr, x, seen) : x));
    seen.set(idx, out);
    return out;
  }
  const out = {};
  for (const [k, val] of Object.entries(v)) {
    out[k] = typeof val === "number" ? revive(arr, val, seen) : val;
  }
  seen.set(idx, out);
  return out;
}

function find(o, pred, out = []) {
  if (!o || typeof o !== "object") return out;
  if (pred(o)) out.push(o);
  if (Array.isArray(o)) for (const x of o) find(x, pred, out);
  else for (const v of Object.values(o)) find(v, pred, out);
  return out;
}

const html = readFileSync("./tmp-official.html", "utf8");
const m = html.match(/id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
const data = JSON.parse(m[1]);
const root = revive(data, 0);

const page = find(root, (o) => o && typeof o === "object" && "siteForDate" in o)[0];
const sfd = page.siteForDate;
console.log("siteForDate keys", Object.keys(sfd));
console.log("siteForDate dump", JSON.stringify(sfd, null, 2).slice(0, 4000));

const feed = page.feed;
console.log("\nfeed keys", feed ? Object.keys(feed) : null);
console.log("feed dump", JSON.stringify(feed, null, 2)?.slice(0, 2000));
