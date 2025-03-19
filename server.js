
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configuración especial para Socket.IO en Vercel
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["content-type"]
    },
    // Usar solo polling para evitar problemas con WebSockets en Vercel
    transports: ['polling']
});

// Servir archivos estáticos desde la carpeta src
app.use(express.static(path.join(__dirname, 'src')));

// Ruta de verificación de estado
app.get('/api/health', (req, res) => {
    res.status(200).send('OK');
});

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

    // Resto del código de conexión
    // ...

    // Código existente sin cambios
    socket.emit('currentPlayer', players[socket.id]);
    socket.emit('existingPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('playerMovement', (movementData) => {
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        players[socket.id].rotation = movementData.rotation;
        socket.broadcast.emit('playerMoved', players[socket.id]);
    });

    socket.on('playerShoot', (bulletData) => {
        bulletData.playerId = socket.id;
        io.emit('bulletCreated', bulletData);
    });

    socket.on('playerHit', ({ hitPlayerId, bulletOwner, hitInBack }) => {
        if (hitInBack && players[hitPlayerId]) {
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

    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

// Para desarrollo local
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
});

// Para Vercel - necesario exportar la app
module.exports = app;