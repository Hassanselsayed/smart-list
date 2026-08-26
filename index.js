import { createApp } from "./src/app.js";
import { initializeDatabase } from "./src/config/database.js";

const port = process.env.PORT || 3000;
const appUrl = process.env.APP_URL || `http://localhost:${port}`;
const app = createApp();

const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(port, () => {
      console.log(`Server running on port ${port} --> ${appUrl}`);
    });
  } catch (err) {
    console.error(err);
  }
};

startServer();
