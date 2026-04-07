import app from "./src/app.js";
import { createServer } from "http";
import { initSocket } from "./src/config/socket.js";

const PORT = process.env.PORT;
const server = createServer(app);

initSocket(server);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});