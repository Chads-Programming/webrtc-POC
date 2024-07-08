import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms: Record<string, string[]> = {};

io.on("connection", (socket) => {
  console.log("CONNECTION", socket.id);
  socket.on("JOIN_ROOM", (roomID: string) => {
    if (rooms[roomID]) {
      rooms[roomID].push(socket.id);
    } else {
      rooms[roomID] = [socket.id];
    }

    const otherUser = rooms[roomID].find((x) => x !== socket.id);
    if (otherUser) {
      socket.emit("OTHER_USER", otherUser);
      socket.to(otherUser).emit("USER_JOINED", socket.id);
    }
  });

  socket.on("OFFER", (payload: { target: string }) => {
    io.to(payload.target).emit("OFFER", payload);
  });

  socket.on("ANSWER", (payload: { target: string }) => {
    io.to(payload.target).emit("ANSWER", payload);
  });

  socket.on(
    "ICE_CANDIDATE",
    (incoming: { target: string; candidate: string }) => {
      io.to(incoming.target).emit("ICE_CANDIDATE", incoming.candidate);
    }
  );
});

server.listen(8000, () =>
  console.log("SERVER RUNNING ON: http://localhost:8000")
);
