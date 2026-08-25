import { buildApp } from "./app";

const app = await buildApp();
const port = Number(process.env.PORT ?? 3000);
await app.listen({ host: "0.0.0.0", port });
