import { readFileSync } from "fs";

function revive(arr, idx, seen = new Map()) {
  if (idx === undefined || idx === null) return idx;
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

const data = JSON.parse(readFileSync("./tmp-payload.json", "utf8"));
const root = revive(data, 0);
const payload = root.data ?? root;

function findByTitle(o, title, out = []) {
  if (!o || typeof o !== "object") return out;
  if (!Array.isArray(o) && o.title === title) out.push(o);
  if (Array.isArray(o)) for (const x of o) findByTitle(x, title, out);
  else for (const v of Object.values(o)) findByTitle(v, title, out);
  return out;
}

const games = findByTitle(payload, "Quiniela Real");
const game = games[0];
console.log("game keys", Object.keys(game));
console.log("sessions", JSON.stringify(game.sessions, null, 2)?.slice(0, 2000));

// also check feed
function findKey(o, key, out = []) {
  if (!o || typeof o !== "object") return out;
  if (!Array.isArray(o) && key in o) out.push(o[key]);
  if (Array.isArray(o)) for (const x of o) findKey(x, key, out);
  else for (const v of Object.values(o)) findKey(v, key, out);
  return out;
}

const feeds = findKey(payload, "feed");
console.log("feed count", feeds.length);
if (feeds[0]) console.log("feed sample", JSON.stringify(feeds[0], null, 2).slice(0, 1500));

const siteForDates = findKey(payload, "siteForDate");
console.log("siteForDate count", siteForDates.length);
if (siteForDates[0]) {
  const sfd = siteForDates[0];
  console.log("siteForDate keys", Object.keys(sfd));
  const qGames = findByTitle(sfd, "Quiniela Real");
  if (qGames[0]?.sessions) console.log("sfd sessions", JSON.stringify(qGames[0].sessions, null, 2).slice(0, 2000));
}
