import argon2 from "argon2";

const passphrase = process.argv[2];
if (!passphrase) {
  console.error('Usage: npm run auth:hash -- "a long private passphrase"');
  process.exit(1);
}

// Argon2id is intentionally slow and salted, so a leaked hash is costly to guess offline.
console.log(
  await argon2.hash(passphrase, {
    type: argon2.argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
  }),
);
