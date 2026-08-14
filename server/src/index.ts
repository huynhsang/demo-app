import { db } from './db.js';
import { createApp } from './app.js';

const PORT = 4000;
const app = createApp(db);
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
