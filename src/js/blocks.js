class Block {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isDestroyed = false;
    }

    draw(context) {
        if (!this.isDestroyed) {
            context.fillStyle = 'brown';
            context.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update() {
        // Logic for block movement or behavior can be added here
    }

    detectCollision(projectile) {
        if (this.isDestroyed) return false;

        return (
            projectile.x < this.x + this.width &&
            projectile.x + projectile.width > this.x &&
            projectile.y < this.y + this.height &&
            projectile.y + projectile.height > this.y
        );
    }

    destroy() {
        this.isDestroyed = true;
    }
}

export default Block;