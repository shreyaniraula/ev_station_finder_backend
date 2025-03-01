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

// In-memory priority queue (each entry: { userId, priority, joinedAt })
let queue = [];
let isStationBusy = false;

const setStationBusy = (status)=>{
  isStationBusy = status;
}

// Service time settings
// const BASE_SERVICE_TIME = 20000; // 10 seconds (base service time)
// const MIN_SERVICE_TIME = 5000;

const BASE_SERVICE_TIME = 1800000; // 30 min (base service time)
const MIN_SERVICE_TIME = 900000;  //15 min (minimum service time)

export { queue, isStationBusy, BASE_SERVICE_TIME, MIN_SERVICE_TIME, setStationBusy };