console.log("Starting server...");
import http from 'http';
import app from './server';

const server = http.createServer(app);
let currentApp = app;
try {
    server.listen(3000, () => {
        console.log("Server is listening on http://localhost:3000");
    });
} catch (error) {
    console.error("Error while starting the server:", error);
}
