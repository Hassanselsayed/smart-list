import { createApp } from "./src/app.js";
import { initializeDatabase } from "./src/config/database.js";

const port = 3000;
const app = createApp();

const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(port, () => {
      console.log(`Server running on port ${port} --> http://localhost:${port}`);
    });
  } catch (err) {
    console.error(err);
  }
};

startServer();
