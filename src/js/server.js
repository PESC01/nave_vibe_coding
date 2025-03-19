
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'src')));

// Almacenar información de jugadores
const players = {};

io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado:', socket.id);

    // Crear jugador nuevo
    players[socket.id] = {
        id: socket.id,
        x: Math.random() * 700 + 50,
        y: Math.random() * 500 + 50,
        rotation: 0,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        score: 0
    };

    // Enviar info de jugador actual
    socket.emit('currentPlayer', players[socket.id]);

    // Enviar info de jugadores existentes al nuevo jugador
    socket.emit('existingPlayers', players);

    // Notificar a otros jugadores sobre el nuevo jugador
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // Actualizar posición y rotación del jugador
    socket.on('playerMovement', (movementData) => {
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        players[socket.id].rotation = movementData.rotation;

        // Emitir el movimiento a otros jugadores
        socket.broadcast.emit('playerMoved', players[socket.id]);
    });

    // Manejar disparos
    socket.on('playerShoot', (bulletData) => {
        // Añadir ID del jugador que dispara
        bulletData.playerId = socket.id;
        // Emitir a todos incluyendo al emisor
        io.emit('bulletCreated', bulletData);
    });

    // Cuando un jugador golpea a otro
    socket.on('playerHit', ({ hitPlayerId, bulletOwner, hitInBack }) => {
        if (hitInBack && players[hitPlayerId]) {
            // Solo registrar golpe si es en la parte trasera
            players[hitPlayerId].score -= 10;

            if (players[bulletOwner]) {
                players[bulletOwner].score += 10;
            }

            io.emit('scoreUpdate', {
                hitPlayer: hitPlayerId,
                shooter: bulletOwner,
                players: players
            });
        }
    });

    // Desconexión del jugador
    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
});