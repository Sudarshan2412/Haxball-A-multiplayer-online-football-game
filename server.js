const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

let players = {};
let nextPlayerNumber = 1;

io.on("connection", (socket) => {
    if (nextPlayerNumber > 2) {
        socket.disconnect();
        return;
    }

    let playerNum = nextPlayerNumber;
    players[playerNum] = socket;
    socket.emit("assignPlayer", playerNum);

    console.log(`Player ${playerNum} connected`);
    nextPlayerNumber++;

    if (Object.keys(players).length === 2) {
        io.emit("startGame"); 
        console.log("Both players connected. Game starting.");
    }

    socket.on("playerMove", (data) => {
        socket.broadcast.emit("playerMove", data);
    });

    socket.on("ballState", (data) => {
        socket.broadcast.emit("ballState", data);
    });

    socket.on("ballKick", (data) => {
        socket.broadcast.emit("ballState", data);
    });

    socket.on("goalScored", (team) => {
        io.emit("goalUpdate", team);
        io.emit("resetGame");
    });

    socket.on("resetGame", () => {
        io.emit("resetGame");
    });

    socket.on("disconnect", () => {
        console.log(`Player ${playerNum} disconnected`);
        delete players[playerNum];
        if (playerNum < nextPlayerNumber) nextPlayerNumber = playerNum;

        io.emit("playerDisconnected");
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});