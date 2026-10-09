import { execFileSync } from "node:child_process";

const VALID = ["1", "1-solution", "2", "2-solution", "3", "3-solution"];
const arg = process.argv[2];

if (!VALID.includes(arg)) {
  console.error("Usage : npm run etape -- <étape>");
  console.error(`Étapes possibles : ${VALID.join(", ")}`);
  process.exit(1);
}

const branch = `etape-${arg}`;
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const tryGit = (...args) => {
  try {
    return git(...args);
  } catch {
    return "";
  }
};

const exists = tryGit("rev-parse", "--verify", "--quiet", `refs/heads/${branch}`) ||
  tryGit("rev-parse", "--verify", "--quiet", `refs/remotes/origin/${branch}`);
if (!exists) {
  console.error(`La branche ${branch} est introuvable. Vérifie que tu as bien cloné le repo complet.`);
  process.exit(1);
}

if (git("status", "--porcelain")) {
  const identity = tryGit("config", "user.email")
    ? []
    : ["-c", "user.name=Participant", "-c", "user.email=participant@workshop.local"];
  git("add", "-A");
  git(...identity, "commit", "-m", `Travail en cours avant le passage à ${branch}`);
  console.log("Ton travail en cours est commité sur la branche actuelle.");
}

git("switch", branch);
console.log(`Tu es sur ${branch}.`);
