class Ship {
    constructor(x, y, id, color = 'blue') {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 30;
        this.id = id;
        this.color = color;
        this.rotation = 0; // Ángulo en radianes
        this.speed = 3;
        this.turnSpeed = 0.05;
        this.thrustPower = 0.1;
        this.velocity = { x: 0, y: 0 };
        this.maxVelocity = 5;
        this.friction = 0.98;
    }

    rotate(direction) {
        if (direction === 'left') {
            this.rotation -= this.turnSpeed;
        } else if (direction === 'right') {
            this.rotation += this.turnSpeed;
        }
        // Normalizar rotación entre 0 y 2π
        this.rotation = this.rotation % (2 * Math.PI);
        if (this.rotation < 0) this.rotation += 2 * Math.PI;
    }

    thrust(power = 1) {
        // Aplicar empuje en la dirección actual
        this.velocity.x += Math.cos(this.rotation) * this.thrustPower * power;
        this.velocity.y += Math.sin(this.rotation) * this.thrustPower * power;

        // Limitar velocidad máxima
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (speed > this.maxVelocity) {
            const ratio = this.maxVelocity / speed;
            this.velocity.x *= ratio;
            this.velocity.y *= ratio;
        }
    }

    brake() {
        // Aplicar frenado más fuerte
        this.velocity.x *= 0.9;
        this.velocity.y *= 0.9;
    }

    update(canvasWidth, canvasHeight) {
        // Aplicar fricción
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;

        // Actualizar posición basada en velocidad
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Wrap alrededor de los bordes de la pantalla
        if (this.x > canvasWidth) this.x = 0;
        if (this.x < 0) this.x = canvasWidth;
        if (this.y > canvasHeight) this.y = 0;
        if (this.y < 0) this.y = canvasHeight;
    }

    draw(context) {
        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.rotation);

        // Dibujar nave (triángulo)
        context.beginPath();
        context.moveTo(this.width / 2, 0); // Frente
        context.lineTo(-this.width / 2, this.height / 2); // Esquina inferior izquierda
        context.lineTo(-this.width / 2, -this.height / 2); // Esquina superior izquierda
        context.closePath();

        // Color principal de la nave
        context.fillStyle = this.color;
        context.fill();

        // Marcar claramente la parte trasera
        context.beginPath();
        context.moveTo(-this.width / 2, this.height / 2);
        context.lineTo(-this.width / 2 + 10, 0);
        context.lineTo(-this.width / 2, -this.height / 2);
        context.closePath();
        context.fillStyle = 'red'; // Color rojo para la parte trasera
        context.fill();

        // Restaurar contexto
        context.restore();

        // Dibujar ID del jugador encima de la nave
        context.fillStyle = 'white';
        context.font = '12px Arial';
        context.fillText(this.id.substring(0, 4), this.x - 10, this.y - 20);
    }

    // Detecta si un punto (como un proyectil) golpea la parte trasera de la nave
    isBackHit(projectileX, projectileY) {
        // Convertir coordenadas del proyectil a coordenadas relativas a la nave
        const dx = projectileX - this.x;
        const dy = projectileY - this.y;

        // Rotar las coordenadas para compensar la rotación de la nave
        const rotatedX = dx * Math.cos(-this.rotation) - dy * Math.sin(-this.rotation);
        const rotatedY = dx * Math.sin(-this.rotation) + dy * Math.cos(-this.rotation);

        // Comprobar si el punto está en la parte trasera (cuarto izquierdo de la nave)
        return rotatedX < -this.width / 4 &&
            Math.abs(rotatedY) < this.height / 2;
    }

    // Método general para colisión
    detectCollision(projectile) {
        // Convertir coordenadas del proyectil a coordenadas relativas a la nave
        const dx = projectile.x - this.x;
        const dy = projectile.y - this.y;

        // Rotar las coordenadas para compensar la rotación de la nave
        const rotatedX = dx * Math.cos(-this.rotation) - dy * Math.sin(-this.rotation);
        const rotatedY = dx * Math.sin(-this.rotation) + dy * Math.cos(-this.rotation);

        // Comprobar si está dentro del rectángulo que forma la nave
        return rotatedX > -this.width / 2 && rotatedX < this.width / 2 &&
            rotatedY > -this.height / 2 && rotatedY < this.height / 2;
    }
}

export default Ship;