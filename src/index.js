import connectDB from "./db/index.js";
import app from "./app.js";
import { PORT } from "./config/index.js";

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening to port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection failed! ", err);
  });
