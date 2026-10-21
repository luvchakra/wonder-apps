// Unit tests run in plain Node, where the `server-only` package throws on import. Pre-fill the
// module cache with an empty module so server code can be tested; the build still enforces the guard.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const path = require.resolve("server-only");
require.cache[path] = { id: path, filename: path, loaded: true, exports: {} };
