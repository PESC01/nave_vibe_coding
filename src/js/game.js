import Ship from './ship.js';
import Projectile from './projectiles.js';

// Conexión a Socket.io
const socket = io();

// Referencias al canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// Variables de juego
let currentPlayer; // La nave del jugador actual
let otherPlayers = {}; // Otros jugadores conectados
let projectiles = []; // Proyectiles en pantalla
let keys = {}; // Teclas presionadas
let scores = {}; // Puntuaciones de los jugadores

// Eventos del teclado
window.addEventListener('keydown', (event) => {
    keys[event.code] = true;

    // Prevenir el comportamiento por defecto para las teclas de control del juego
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
        event.preventDefault();
    }

    if (event.code === 'Space' && currentPlayer) {
        fireProjectile();
    }
});

window.addEventListener('keyup', (event) => {
    keys[event.code] = false;

    // También prevenir comportamiento por defecto aquí
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
        event.preventDefault();
    }
});

// Función para disparar proyectil
function fireProjectile() {
    // Obtener posición del frente de la nave
    const offsetX = Math.cos(currentPlayer.rotation) * (currentPlayer.width / 2);
    const offsetY = Math.sin(currentPlayer.rotation) * (currentPlayer.width / 2);

    // Crear datos del proyectil
    const bulletData = {
        x: currentPlayer.x + offsetX,
        y: currentPlayer.y + offsetY,
        rotation: currentPlayer.rotation,
        speed: 10
    };

    // Emitir evento de disparo al servidor
    socket.emit('playerShoot', bulletData);
}

// Eventos de Socket.io
socket.on('currentPlayer', (playerData) => {
    console.log('Jugador actual:', playerData);
    currentPlayer = new Ship(
        playerData.x,
        playerData.y,
        playerData.id,
        playerData.color
    );
    scores[playerData.id] = playerData.score;
});

socket.on('existingPlayers', (players) => {
    console.log('Jugadores existentes:', players);
    Object.keys(players).forEach((id) => {
        if (id !== currentPlayer.id) {
            const playerData = players[id];
            otherPlayers[id] = new Ship(
                playerData.x,
                playerData.y,
                playerData.id,
                playerData.color
            );
            scores[id] = playerData.score;
        }
    });
});

socket.on('newPlayer', (playerData) => {
    console.log('Nuevo jugador:', playerData);
    otherPlayers[playerData.id] = new Ship(
        playerData.x,
        playerData.y,
        playerData.id,
        playerData.color
    );
    scores[playerData.id] = playerData.score;
});

socket.on('playerDisconnected', (playerId) => {
    console.log('Jugador desconectado:', playerId);
    delete otherPlayers[playerId];
    delete scores[playerId];
});

socket.on('playerMoved', (playerData) => {
    if (otherPlayers[playerData.id]) {
        otherPlayers[playerData.id].x = playerData.x;
        otherPlayers[playerData.id].y = playerData.y;
        otherPlayers[playerData.id].rotation = playerData.rotation;
    }
});

socket.on('bulletCreated', (bulletData) => {
    // Si es un proyectil de otro jugador, añadirlo a los proyectiles locales
    if (bulletData.playerId !== currentPlayer?.id) {
        projectiles.push(new Projectile(
            bulletData.x,
            bulletData.y,
            bulletData.rotation,
            bulletData.speed,
            bulletData.playerId
        ));
    } else {
        // Si es nuestro proyectil, también lo añadimos
        projectiles.push(new Projectile(
            bulletData.x,
            bulletData.y,
            bulletData.rotation,
            bulletData.speed,
            currentPlayer.id
        ));
    }
});

socket.on('scoreUpdate', (data) => {
    // Actualizar puntuaciones locales
    Object.keys(data.players).forEach(id => {
        scores[id] = data.players[id].score;
    });
});

// Función principal del bucle de juego
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (!currentPlayer) return;

    // Actualizar movimiento del jugador
    if (keys['KeyW'] || keys['ArrowUp']) {
        currentPlayer.thrust();
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
        currentPlayer.brake();
    }
    if (keys['KeyA'] || keys['ArrowLeft']) {
        currentPlayer.rotate('left');
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        currentPlayer.rotate('right');
    }

    // Actualizar posición del jugador
    currentPlayer.update(canvas.width, canvas.height);

    // Enviar posición actualizada al servidor
    socket.emit('playerMovement', {
        x: currentPlayer.x,
        y: currentPlayer.y,
        rotation: currentPlayer.rotation
    });

    // Actualizar proyectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        projectile.move(canvas.width, canvas.height);

        // Comprobar colisiones con jugadores
        if (projectile.ownerId !== currentPlayer.id && currentPlayer.detectCollision(projectile)) {
            // Comprobar si golpeó la parte trasera
            const hitInBack = currentPlayer.isBackHit(projectile.x, projectile.y);

            if (hitInBack) {
                // Emitir evento de golpe al servidor
                socket.emit('playerHit', {
                    hitPlayerId: currentPlayer.id,
                    bulletOwner: projectile.ownerId,
                    hitInBack: true
                });

                // Añadir efecto visual de golpe
                currentPlayer.color = 'red'; // Cambiar temporalmente el color
                setTimeout(() => {
                    currentPlayer.color = scores[currentPlayer.id] < 0 ? 'gray' : 'blue';
                }, 200);
            }

            // Eliminar el proyectil
            projectiles.splice(i, 1);
            continue;
        }

        // Comprobar colisiones con otros jugadores
        for (const id in otherPlayers) {
            const otherPlayer = otherPlayers[id];

            if (projectile.ownerId === currentPlayer.id && otherPlayer.detectCollision(projectile)) {
                const hitInBack = otherPlayer.isBackHit(projectile.x, projectile.y);

                if (hitInBack) {
                    // Emitir evento de golpe al servidor
                    socket.emit('playerHit', {
                        hitPlayerId: id,
                        bulletOwner: currentPlayer.id,
                        hitInBack: true
                    });
                }

                // Eliminar el proyectil
                projectiles.splice(i, 1);
                break;
            }
        }

        // Eliminar proyectiles inactivos
        if (!projectile.active) {
            projectiles.splice(i, 1);
        }
    }
}

function render() {
    // Limpiar canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dibujar jugador actual
    if (currentPlayer) {
        currentPlayer.draw(ctx);
    }

    // Dibujar otros jugadores
    Object.values(otherPlayers).forEach(player => {
        player.draw(ctx);
    });

    // Dibujar proyectiles
    projectiles.forEach(projectile => {
        projectile.draw(ctx);
    });

    // Dibujar puntuaciones
    renderScoreboard();
}

function renderScoreboard() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(canvas.width - 200, 0, 200, 30 + Object.keys(scores).length * 20);

    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText('Puntuaciones:', canvas.width - 190, 20);

    let y = 40;
    Object.keys(scores).forEach(id => {
        const name = id === currentPlayer?.id ? 'TÚ' : id.substring(0, 4);
        ctx.fillStyle = id === currentPlayer?.id ? 'yellow' : 'white';
        ctx.fillText(`${name}: ${scores[id]}`, canvas.width - 190, y);
        y += 20;
    });
}

// Iniciar el juego
window.addEventListener('load', () => {
    gameLoop();
});