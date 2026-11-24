import { app } from "./app.js";

// Local development server. On Vercel, api/index.ts serves the same app instead.
const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`API ready on http://localhost:${port}/api/v1`));
