class Projectile {
    constructor(x, y, rotation, speed, ownerId) {
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.speed = speed;
        this.width = 5;
        this.height = 10;
        this.active = true;
        this.ownerId = ownerId; // ID del jugador que disparó
        this.lifespan = 100; // Cuánto dura el proyectil
    }

    move(canvasWidth, canvasHeight) {
        // Mover en la dirección de la rotación
        this.x += Math.cos(this.rotation) * this.speed;
        this.y += Math.sin(this.rotation) * this.speed;

        // Envolver alrededor de los bordes de la pantalla
        if (this.x > canvasWidth) this.x = 0;
        if (this.x < 0) this.x = canvasWidth;
        if (this.y > canvasHeight) this.y = 0;
        if (this.y < 0) this.y = canvasHeight;

        // Reducir vida
        this.lifespan--;
        if (this.lifespan <= 0) {
            this.active = false;
        }
    }

    draw(context) {
        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.rotation);

        // Dibujar proyectil (rectángulo)
        context.fillStyle = 'yellow';
        context.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        context.restore();
    }
}

export default Projectile;