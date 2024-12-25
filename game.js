const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1200;
canvas.height = 800;

// Oyun sabitleri
const GRAVITY = 0.45;
const JUMP_FORCE = -14;
const PLAYER_SPEED = 4.5;
const ACCELERATION = 0.4;
const FRICTION = 0.82;
const AIR_CONTROL = 0.6;
const COYOTE_TIME = 150;
const JUMP_BUFFER = 200;
const FALL_THRESHOLD = 800;

// Oyun durumu için yeni sabitler
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
};

// Oyun durumu
const game = {
    state: GameState.MENU,
    score: 0,
    highScore: 0,
    highScores: []
};

// Oyuncu
const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 45,
    height: 45,
    velocityX: 0,
    velocityY: 0,
    maxVelocityX: 5,
    isJumping: false,
    color: '#FF0000',
    lastGroundTime: 0,
    lastJumpPress: 0,
    canDoubleJump: false,
    fuel: 100
};

// Kamera
const camera = {
    y: 0
};

// Roket sistemi için sabitler
const ROCKET = {
    THRUST: -0.5,
    MAX_FUEL: 200,
    FUEL_CONSUMPTION: 0.3,
    FUEL_RECOVERY: 0.4,
    MIN_FUEL_TO_START: 10
};

// Oyuncu nesnesine roket özelliklerini ekle
player.fuel = ROCKET.MAX_FUEL;

// Yakıt barını çiz
function drawFuelBar() {
    const barWidth = 150;
    const barHeight = 15;
    const x = 10;
    const y = 80;

    // Arkaplan
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x, y, barWidth, barHeight);

    // Yakıt seviyesi
    const fuelPercentage = player.fuel / ROCKET.MAX_FUEL;
    const fuelWidth = barWidth * fuelPercentage;

    // Renk gradyanı (yeşilden kırmızıya)
    const hue = fuelPercentage * 120; // 0 (kırmızı) ile 120 (yeşil) arası
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fillRect(x, y, fuelWidth, barHeight);

    // Çerçeve
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Yakıt yazısı
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.fillText('ROKET YAKITI', x, y - 5);
}

// Roket efekti çizimi
function drawRocketEffect() {
    if (!keys.e || player.fuel <= ROCKET.MIN_FUEL_TO_START) return;

    // Jet motoru merkez noktası
    const jetX = player.x + player.width / 2;
    const jetY = player.y + player.height - camera.y;

    // Jet motoru gövdesi (metal kısım)
    const nozzleWidth = 20;
    const nozzleHeight = 10;
    const nozzleGradient = ctx.createLinearGradient(
        jetX - nozzleWidth / 2, jetY,
        jetX + nozzleWidth / 2, jetY
    );
    nozzleGradient.addColorStop(0, '#666666');
    nozzleGradient.addColorStop(0.5, '#999999');
    nozzleGradient.addColorStop(1, '#666666');

    ctx.fillStyle = nozzleGradient;
    ctx.beginPath();
    ctx.moveTo(jetX - nozzleWidth / 2, jetY);
    ctx.lineTo(jetX + nozzleWidth / 2, jetY);
    ctx.lineTo(jetX + nozzleWidth / 2 + 5, jetY + nozzleHeight);
    ctx.lineTo(jetX - nozzleWidth / 2 - 5, jetY + nozzleHeight);
    ctx.closePath();
    ctx.fill();

    // Ana jet alevi
    const flameCount = 30;
    for (let i = 0; i < flameCount; i++) {
        const angle = Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.15; // Çok dar açı
        const distance = Math.random() * 60;
        const x = jetX + Math.cos(angle) * distance;
        const y = jetY + Math.sin(angle) * distance + 10;

        const size = 8 + Math.random() * 6;
        const alpha = 0.95 + Math.random() * 0.05;

        // Jet alevi gradyanı
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        gradient.addColorStop(0.2, `rgba(255, 240, 220, ${alpha})`);
        gradient.addColorStop(0.3, `rgba(100, 200, 255, ${alpha * 0.9})`); // Mavi ton
        gradient.addColorStop(0.5, `rgba(50, 150, 255, ${alpha * 0.8})`);  // Koyu mavi
        gradient.addColorStop(0.7, `rgba(255, 100, 50, ${alpha * 0.6})`);  // Turuncu
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Şok dalgaları
    const shockwaveCount = 5;
    for (let i = 0; i < shockwaveCount; i++) {
        const distance = 15 + Math.random() * 20;
        const y = jetY + distance;
        const width = 15 + distance * 0.8;
        const alpha = (1 - distance / 35) * 0.3;

        ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(jetX, y, width, width / 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Isı dalgaları
    const heatwaveCount = 8;
    for (let i = 0; i < heatwaveCount; i++) {
        const distance = 20 + Math.random() * 40;
        const x = jetX + (Math.random() - 0.5) * 10;
        const y = jetY + distance;
        const size = 3 + distance * 0.2;
        const alpha = (1 - distance / 60) * 0.2;

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Merkez parlama efekti
    const glowGradient = ctx.createRadialGradient(jetX, jetY + 10, 0, jetX, jetY + 10, 30);
    glowGradient.addColorStop(0, 'rgba(100, 200, 255, 0.9)');  // Parlak mavi merkez
    glowGradient.addColorStop(0.4, 'rgba(50, 150, 255, 0.5)'); // Orta mavi
    glowGradient.addColorStop(0.7, 'rgba(255, 100, 50, 0.3)'); // Turuncu geçiş
    glowGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');       // Kırmızı bitiş

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(jetX, jetY + 10, 30, 0, Math.PI * 2);
    ctx.fill();
}

// Havai fişek sınıfını güncelle
class Firework {
    constructor(x, y) {
        this.x = x;
        this.y = y - camera.y; // Kamera pozisyonuna göre ayarla
        this.particles = [];
        this.colors = [
            '#FF0000', '#00FF00', '#0000FF',
            '#FFFF00', '#FF00FF', '#00FFFF',
            '#FFD700', '#FF69B4', '#7FFF00'
        ];
        this.color = this.colors[Math.floor(Math.random() * this.colors.length)];
        this.createParticles();
        this.lifetime = 1;
        this.playSound();
    }

    createParticles() {
        const particleCount = 50 + Math.random() * 30;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 2 + Math.random() * 4;
            const size = 1 + Math.random() * 2;
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                size: size,
                color: this.color
            });
        }
    }

    playSound() {
        if (!AudioSystem.context) return;

        // Patlama sesi
        const osc = AudioSystem.context.createOscillator();
        const gainNode = AudioSystem.context.createGain();

        osc.type = 'sine';
        osc.frequency.value = 400 + Math.random() * 200;
        gainNode.gain.value = 0.1;

        osc.connect(gainNode);
        gainNode.connect(AudioSystem.context.destination);

        osc.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, AudioSystem.context.currentTime + 0.3);
        setTimeout(() => osc.stop(), 300);
    }

    update() {
        this.lifetime *= 0.98;
        for (let particle of this.particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1; // Yerçekimi
            particle.alpha = this.lifetime;
        }
        return this.lifetime > 0.1;
    }

    draw(ctx) {
        ctx.save();
        for (let particle of this.particles) {
            ctx.fillStyle = `rgba(${this.hexToRgb(particle.color)},${particle.alpha})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ?
            `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` :
            '255,255,255';
    }
}

// Havai fişek sistemi
const FireworkSystem = {
    fireworks: [],
    isMouseDown: false,
    lastSpawnTime: 0,
    spawnInterval: 50, // ms

    update() {
        // Mouse basılıysa sürekli havai fişek oluştur
        if (this.isMouseDown) {
            const currentTime = performance.now();
            if (currentTime - this.lastSpawnTime >= this.spawnInterval) {
                const rect = canvas.getBoundingClientRect();
                const x = lastMouseX;
                const y = lastMouseY;
                this.createFireworkAtPosition(x, y + camera.y);
                this.lastSpawnTime = currentTime;
            }
        }

        this.fireworks = this.fireworks.filter(firework => {
            return firework.update();
        });
    },

    draw(ctx) {
        this.fireworks.forEach(firework => firework.draw(ctx));
    },

    createFireworkAtPosition(x, y) {
        this.fireworks.push(new Firework(x, y));
    }
};

// Mouse pozisyonunu takip etmek için değişkenler
let lastMouseX = 0;
let lastMouseY = 0;

// Mouse olayları
canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) { // Sol tık
        FireworkSystem.isMouseDown = true;
        const rect = canvas.getBoundingClientRect();
        lastMouseX = event.clientX - rect.left;
        lastMouseY = event.clientY - rect.top;
        FireworkSystem.createFireworkAtPosition(lastMouseX, lastMouseY + camera.y);
    }
});

canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    lastMouseX = event.clientX - rect.left;
    lastMouseY = event.clientY - rect.top;
});

canvas.addEventListener('mouseup', (event) => {
    if (event.button === 0) { // Sol tık
        FireworkSystem.isMouseDown = false;
    }
});

canvas.addEventListener('mouseleave', () => {
    FireworkSystem.isMouseDown = false;
});

// Kar taneleri için yeni sınıf
class Snowflake {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = camera.y - 10;
        this.size = Math.random() * 3 + 1;
        this.speedY = Math.random() * 2 + 1;
        this.speedX = Math.random() * 2 - 1;
        this.opacity = Math.random() * 0.5 + 0.5;
    }

    update() {
        this.y += this.speedY;
        this.x += this.speedX;
        if (this.y > camera.y + canvas.height + 10) {
            this.reset();
        }
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y - camera.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Kar taneleri dizisi
const snowflakes = Array(100).fill().map(() => new Snowflake());

// Platform sınıfını güncelle - parlama efekti ekle
class Platform {
    constructor(x, y, width, level = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = 15;
        this.isBonus = Math.random() < 0.15;
        this.isIcy = Math.random() < 0.3;
        this.colors = this.getChristmasColors();
        this.id = Math.random();
        this.glowIntensity = 0;
        this.glowDirection = 1;
        this.glowSpeed = 0.02 + Math.random() * 0.02;
    }

    update() {
        // Parlama efekti animasyonu
        this.glowIntensity += this.glowDirection * this.glowSpeed;
        if (this.glowIntensity > 1) {
            this.glowIntensity = 1;
            this.glowDirection = -1;
        } else if (this.glowIntensity < 0) {
            this.glowIntensity = 0;
            this.glowDirection = 1;
        }
    }

    draw() {
        if (this.y - camera.y < canvas.height + 100 && this.y - camera.y > -100) {
            const drawY = this.y - camera.y;

            // Parlama efekti
            ctx.shadowColor = this.isBonus ? '#FFD700' : (this.isIcy ? '#87CEEB' : '#FFFFFF');
            ctx.shadowBlur = 10 + this.glowIntensity * 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // Platform gölgesi
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.roundRect(this.x, drawY + this.height, this.width, 2, 5);
            ctx.fill();

            // Ana platform
            const gradient = ctx.createLinearGradient(this.x, drawY, this.x + this.width, drawY);
            gradient.addColorStop(0, this.colors[0]);
            gradient.addColorStop(0.5, this.colors[1]);
            gradient.addColorStop(1, this.colors[0]);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(this.x, drawY, this.width, this.height, 7);
            ctx.fill();

            // Buzlu platform için sarkıtlar
            if (this.isIcy) {
                // Buz yansıması
                const reflectionGradient = ctx.createLinearGradient(this.x, drawY, this.x, drawY + this.height);
                reflectionGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
                reflectionGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
                reflectionGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = reflectionGradient;
                ctx.fillRect(this.x, drawY, this.width, this.height);

                // Sarkıtlar
                const icicleCount = Math.floor(this.width / 15);
                for (let i = 0; i < icicleCount; i++) {
                    const icicleX = this.x + (i * 15) + 7.5;
                    const icicleHeight = 10 + Math.random() * 15;

                    // Sarkıt gövdesi
                    const icicleGradient = ctx.createLinearGradient(
                        icicleX, drawY + this.height,
                        icicleX, drawY + this.height + icicleHeight
                    );
                    icicleGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                    icicleGradient.addColorStop(1, 'rgba(200, 240, 255, 0.2)');

                    ctx.fillStyle = icicleGradient;
                    ctx.beginPath();
                    ctx.moveTo(icicleX - 3, drawY + this.height);
                    ctx.lineTo(icicleX + 3, drawY + this.height);
                    ctx.lineTo(icicleX, drawY + this.height + icicleHeight);
                    ctx.closePath();
                    ctx.fill();

                    // Sarkıt parlaması
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.beginPath();
                    ctx.moveTo(icicleX - 1, drawY + this.height);
                    ctx.lineTo(icicleX + 1, drawY + this.height);
                    ctx.lineTo(icicleX, drawY + this.height + icicleHeight * 0.7);
                    ctx.closePath();
                    ctx.fill();
                }

                // Buz kristalleri
                for (let i = 0; i < 5; i++) {
                    const crystalX = this.x + Math.random() * this.width;
                    const crystalY = drawY + Math.random() * this.height;
                    const size = 2 + Math.random() * 2;

                    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                    ctx.beginPath();
                    // Yıldız şeklinde kristal
                    for (let j = 0; j < 6; j++) {
                        const angle = (j * Math.PI * 2) / 6;
                        const x = crystalX + Math.cos(angle) * size;
                        const y = crystalY + Math.sin(angle) * size;
                        if (j === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.fill();
                }
            }

            // Parlama halkası
            const glowGradient = ctx.createRadialGradient(
                this.x + this.width / 2, drawY + this.height / 2, 0,
                this.x + this.width / 2, drawY + this.height / 2, this.width / 2
            );
            glowGradient.addColorStop(0, `rgba(255, 255, 255, ${this.glowIntensity * 0.2})`);
            glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.roundRect(
                this.x - 10,
                drawY - 10,
                this.width + 20,
                this.height + 20,
                10
            );
            ctx.fill();

            // Gölgelendirmeyi sıfırla
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
        }
    }

    getChristmasColors() {
        const christmasColors = [
            ['#FF0000', '#CC0000'], // Kırmızı şeker
            ['#FFFFFF', '#E0E0E0'], // Kar/Buz
            ['#00FF00', '#008000'], // Çam ağacı yeşili
            ['#FFD700', '#FFA500'], // Altın süs
            ['#FF69B4', '#FF1493']  // Pembe süs
        ];

        if (this.isIcy) {
            return ['#A5F2F3', '#87CEEB']; // Buz platformu
        }
        return this.isBonus ?
            ['#FFD700', '#FFA500'] : // Bonus platformlar altın
            christmasColors[Math.floor(Math.random() * christmasColors.length)];
    }
}

// Platformları oluştur
let platforms = [];
function generatePlatforms() {
    platforms = [];
    const initialPlatform = new Platform(canvas.width / 2 - 100, canvas.height - 50, 200, 0);
    platforms.push(initialPlatform);

    let lastY = canvas.height - 50;
    let lastX = canvas.width / 2 - 100;

    // Platform üretim fonksiyonu
    function createNewPlatforms() {
        // Maksimum platform sayısını kontrol et
        if (platforms.length > 1000) { // Güvenli bir üst sınır
            // En alttaki platformları temizle
            platforms = platforms.slice(-800); // Son 800 platformu tut
        }

        const lastPlatform = platforms[platforms.length - 1];
        const currentLevel = Math.floor(Math.abs(lastPlatform.y) / 1000);

        // Platform yüksekliği - daha az hesaplama
        const heightDiff = 150 + Math.random() * 50;
        const newY = lastPlatform.y - heightDiff;

        // Platform genişliği - sabit aralık
        const width = 120 + Math.random() * 60;

        // Platform pozisyonu - basitleştirilmiş hesaplama
        let newX = lastX + (Math.random() * 500 - 250);
        newX = Math.max(50, Math.min(canvas.width - width - 50, newX));

        // Çakışma kontrolü - sadece son birkaç platform ile
        let isValidPosition = true;
        for (let i = Math.max(0, platforms.length - 3); i < platforms.length; i++) {
            const platform = platforms[i];
            const verticalDist = Math.abs(platform.y - newY);
            const horizontalDist = Math.abs(platform.x - newX);

            if (verticalDist < 100 && horizontalDist < 120) {
                isValidPosition = false;
                break;
            }
        }

        if (isValidPosition) {
            // Ana platform oluştur
            const newPlatform = new Platform(newX, newY, width, currentLevel);
            platforms.push(newPlatform);
            lastX = newX;

            // Bonus platform - daha az sıklıkla
            if (Math.random() < 0.1 && platforms.length % 3 === 0) {
                const bonusX = Math.random() * (canvas.width - 100);
                const bonusY = newY - heightDiff * 0.5;
                const bonusPlatform = new Platform(bonusX, bonusY, 100, currentLevel);
                platforms.push(bonusPlatform);
            }
        }
    }

    // Başlangıç platformları
    for (let i = 0; i < 30; i++) {
        createNewPlatforms();
    }

    // Platform güncelleme fonksiyonu
    return function updatePlatforms() {
        // Görünür alanın dışındaki platformları temizle
        const cleanupDistance = 2000;
        while (platforms.length > 0 &&
            platforms[0].y > player.y + cleanupDistance) {
            platforms.shift();
        }

        // Yeni platformlar ekle
        const bufferDistance = 2000;
        const topPlatform = platforms[platforms.length - 1];

        // Performans için platform üretimini sınırla
        const maxNewPlatforms = 5;
        let newPlatformCount = 0;

        while (topPlatform.y > camera.y - bufferDistance &&
            newPlatformCount < maxNewPlatforms) {
            createNewPlatforms();
            newPlatformCount++;
        }
    };
}

// Performans optimizasyonu için görünür platform kontrolü
function getVisiblePlatforms() {
    const buffer = 200;
    return platforms.filter(platform =>
        platform.y > camera.y - buffer &&
        platform.y < camera.y + canvas.height + buffer
    );
}

// Tuş kontrolleri
const keys = {
    left: false,
    right: false,
    up: false,
    e: false
};

// Tuş kontrolleri güncelleme
document.addEventListener('keydown', (e) => {
    // Ses sistemini başlat
    if (AudioSystem.context === null) {
        AudioSystem.init();
    }

    // Menü kontrolü
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        if (game.state === GameState.MENU && highScoresDiv.style.display !== 'block') {
            startGame();
            return;
        }
    }

    // Oyun kontrolleri
    if (game.state === GameState.PLAYING) {
        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
                keys.left = true;
                break;
            case 'ArrowRight':
            case 'd':
                keys.right = true;
                break;
            case 'ArrowUp':
            case 'w':
            case ' ':
                keys.up = true;
                break;
        }
    }

    if (e.key.toLowerCase() === 'e') {
        keys.e = true;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'ArrowLeft':
        case 'a':
            keys.left = false;
            break;
        case 'ArrowRight':
        case 'd':
            keys.right = false;
            break;
        case 'ArrowUp':
        case 'w':
        case ' ':
            keys.up = false;
            break;
    }

    if (e.key.toLowerCase() === 'e') {
        keys.e = false;
    }
});

// Çarpışma kontrolü
function checkCollision(player, platform) {
    return player.x < platform.x + platform.width &&
        player.x + player.width > platform.x &&
        player.y + player.height > platform.y &&
        player.y < platform.y + platform.height;
}

// Platform çarpışma kontrolünü güncelle
function checkPlatformCollisions() {
    let onGround = false;

    const visiblePlatforms = platforms.filter(platform =>
        platform.y - camera.y < canvas.height + 100 &&
        platform.y - camera.y > -100
    );

    for (let platform of visiblePlatforms) {
        if (player.x + player.width > platform.x &&
            player.x < platform.x + platform.width &&
            player.y + player.height > platform.y &&
            player.y < platform.y + platform.height) {

            if (player.velocityY > 0 &&
                player.y + player.height - player.velocityY <= platform.y + 5) {

                player.y = platform.y - player.height;

                // Buzlu platform kontrolü - kayganlığı artırıldı
                if (platform.isIcy) {
                    player.velocityX *= 0.99; // 0.95'ten 0.99'a çıkarıldı - daha kaygan
                    if (Math.abs(player.velocityX) < 0.05) { // 0.1'den 0.05'e düşürüldü
                        player.velocityX = 0;
                    }
                } else {
                    player.velocityX *= FRICTION;
                }

                player.velocityY = 0;
                onGround = true;
                break;
            }
        }
    }

    return onGround;
}

// Platform güncelleme fonksiyonunu optimize et
function updatePlatforms() {
    // Sadece ekranda ve yakın çevrede olan platformları güncelle
    const activeRange = canvas.height * 1.5;
    platforms.forEach(platform => {
        if (Math.abs(platform.y - camera.y) < activeRange) {
            platform.update();
        }
    });

    // Platformları temizle ve yenilerini ekle
    const cleanupThreshold = player.y + 1000; // Oyuncunun 1000 birim altı
    while (platforms.length > 0 && platforms[0].y > camera.y + canvas.height + 200) {
        if (platforms[0].y < cleanupThreshold) break;
        platforms.shift();
    }

    // Yeni platformlar ekle
    while (platforms[platforms.length - 1].y > camera.y - canvas.height) {
        createNewPlatforms();
    }
}

// Oyun mantığını güncelle
function updateGame() {
    if (game.state !== GameState.PLAYING) return;

    // Platform güncellemesi
    if (typeof updatePlatformsFunc === 'function') {
        updatePlatformsFunc();
    }

    const onGround = checkPlatformCollisions();

    // Roket kontrolü
    if (keys.e && player.fuel > ROCKET.MIN_FUEL_TO_START) {
        player.velocityY += ROCKET.THRUST;
        player.fuel = Math.max(0, player.fuel - ROCKET.FUEL_CONSUMPTION);

        // Roket sesi
        if (AudioSystem.context) {
            const osc = AudioSystem.context.createOscillator();
            const gainNode = AudioSystem.context.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = 80 + Math.random() * 40;
            gainNode.gain.value = 0.05;
            osc.connect(gainNode);
            gainNode.connect(AudioSystem.context.destination);
            osc.start();
            gainNode.gain.exponentialRampToValueAtTime(0.01, AudioSystem.context.currentTime + 0.1);
            setTimeout(() => osc.stop(), 100);
        }
    } else {
        // Yakıt yenilenmesi
        player.fuel = Math.min(ROCKET.MAX_FUEL, player.fuel + ROCKET.FUEL_RECOVERY);
    }

    // Yatay hareket
    const moveMultiplier = onGround ? 1 : AIR_CONTROL;

    if (keys.left) {
        player.velocityX -= ACCELERATION * moveMultiplier;
    } else if (keys.right) {
        player.velocityX += ACCELERATION * moveMultiplier;
    } else if (!onGround) {
        player.velocityX *= FRICTION;
    }

    // Hız sınırlaması
    player.velocityX = Math.max(-player.maxVelocityX,
        Math.min(player.maxVelocityX, player.velocityX));

    // Zıplama kontrolü
    if (keys.up && onGround) {
        player.velocityY = JUMP_FORCE;
        AudioSystem.playJumpSound();
    }

    // Terminal hız kontrolü
    if (player.velocityY > 15) {
        player.velocityY = 15;
    }

    // Pozisyon güncelleme
    player.x += player.velocityX;
    player.y += player.velocityY;
    player.velocityY += GRAVITY;

    // Ekran sınırları kontrolü
    if (player.x > canvas.width) {
        player.x = 0;
    } else if (player.x + player.width < 0) {
        player.x = canvas.width - player.width;
    }

    // Kamera takibi güncellendi
    const idealCameraY = player.y - canvas.height * 0.6;

    // Yumuşak kamera takibi
    if (player.velocityY > 0) {
        // Düşerken daha hızlı takip et
        camera.y += (idealCameraY - camera.y) * 0.1;
    } else {
        // Yükselirken normal hızda takip et
        camera.y += (idealCameraY - camera.y) * 0.05;
    }

    // Skor güncelleme
    const currentScore = Math.max(0, Math.floor(Math.abs(Math.min(0, player.y)) / 150));
    if (currentScore > game.score) {
        game.score = currentScore;
        if (game.score > game.highScore) {
            game.highScore = game.score;
        }
    }

    // Düşme kontrolü - sadece çok aşağı düşerse yeniden başlat
    if (player.y > platforms[0].y + 2000) {
        AudioSystem.playGameOverSound();
        resetAndRestartGame();
    }

    // Havai fişek sistemini güncelle
    FireworkSystem.update();
}

// FPS sayacı için değişkenler
const FPS = {
    current: 0,
    frames: 0,
    lastTime: performance.now(),
    updateInterval: 1000 // Her 1 saniyede bir güncelle
};

// Mini harita için sabit değerler - daha verimli erişim için
const MINIMAP = {
    WIDTH: 100,
    HEIGHT: 150,
    PADDING: 10,
    SCALE: 0.05,
    PLATFORM_HEIGHT: 2,
    PLAYER_SIZE: 3,
    VIEW_RANGE: 2000,
    BORDER_RADIUS: 10,
    BORDER_WIDTH: 2,
    UPDATE_INTERVAL: 100 // Mini harita güncelleme aralığı (ms)
};

// Performans optimizasyonu için son mini harita güncellemesi
let lastMinimapUpdate = 0;
let visiblePlatformsCache = [];

// FPS sayacını güncelle
function updateFPS() {
    FPS.frames++;
    const currentTime = performance.now();
    const elapsed = currentTime - FPS.lastTime;

    if (elapsed >= FPS.updateInterval) {
        FPS.current = Math.round((FPS.frames * 1000) / elapsed);
        FPS.frames = 0;
        FPS.lastTime = currentTime;
    }
}

// Mini harita çizim fonksiyonu - optimize edilmiş
function drawMiniMap() {
    const currentTime = performance.now();
    const miniMapX = canvas.width - MINIMAP.WIDTH - MINIMAP.PADDING;
    const miniMapY = canvas.height - MINIMAP.HEIGHT - MINIMAP.PADDING;

    // Platform listesini sadece belirli aralıklarla güncelle
    if (currentTime - lastMinimapUpdate > MINIMAP.UPDATE_INTERVAL) {
        visiblePlatformsCache = platforms.filter(platform =>
            Math.abs(platform.y - player.y) < MINIMAP.VIEW_RANGE
        );
        lastMinimapUpdate = currentTime;
    }

    // Arkaplan ve çerçeve
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Arkaplan
    ctx.fillStyle = 'rgba(15, 25, 35, 0.85)';
    ctx.beginPath();
    ctx.roundRect(miniMapX, miniMapY, MINIMAP.WIDTH, MINIMAP.HEIGHT, MINIMAP.BORDER_RADIUS);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Izgara çizgileri
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Kırpma maskesi
    ctx.beginPath();
    ctx.roundRect(miniMapX, miniMapY, MINIMAP.WIDTH, MINIMAP.HEIGHT, MINIMAP.BORDER_RADIUS);
    ctx.clip();

    // Platformları çiz
    visiblePlatformsCache.forEach(platform => {
        // Platform pozisyonunu hesapla
        const relativeY = platform.y - player.y;
        const scaledY = relativeY * MINIMAP.SCALE;
        const drawY = miniMapY + MINIMAP.HEIGHT / 2 + scaledY;

        if (drawY > miniMapY && drawY < miniMapY + MINIMAP.HEIGHT) {
            // Platform
            const gradient = ctx.createLinearGradient(
                miniMapX + (platform.x * MINIMAP.SCALE),
                drawY,
                miniMapX + (platform.x * MINIMAP.SCALE),
                drawY + MINIMAP.PLATFORM_HEIGHT
            );
            gradient.addColorStop(0, platform.colors[0]);
            gradient.addColorStop(1, platform.colors[1]);

            ctx.fillStyle = gradient;
            ctx.fillRect(
                miniMapX + (platform.x * MINIMAP.SCALE),
                drawY,
                platform.width * MINIMAP.SCALE,
                MINIMAP.PLATFORM_HEIGHT
            );
        }
    });

    // Oyuncuyu çiz
    const playerY = miniMapY + MINIMAP.HEIGHT / 2;
    ctx.fillStyle = '#FF3333';
    ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(
        miniMapX + (player.x * MINIMAP.SCALE),
        playerY,
        MINIMAP.PLAYER_SIZE,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.restore();

    // Çerçeve
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = MINIMAP.BORDER_WIDTH;
    ctx.beginPath();
    ctx.roundRect(miniMapX, miniMapY, MINIMAP.WIDTH, MINIMAP.HEIGHT, MINIMAP.BORDER_RADIUS);
    ctx.stroke();

    // FPS sayacı
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`FPS: ${FPS.current}`, canvas.width - 10, 20);
}

// Ana çizim fonksiyonunu güncelle
function draw() {
    updateFPS();

    // Arkaplan
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#1a2a3a');
    skyGradient.addColorStop(1, '#2c3e50');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sadece görünür nesneleri çiz
    const visiblePlatforms = getVisiblePlatforms();

    // Kar taneleri
    snowflakes.forEach(snowflake => {
        if (snowflake.y - camera.y < canvas.height + 10 &&
            snowflake.y - camera.y > -10) {
            snowflake.draw();
        }
    });

    // Platformlar
    visiblePlatforms.forEach(platform => platform.draw());

    // Roket efekti
    drawRocketEffect();

    // Karakter ve UI
    drawSanta();
    drawMiniMap();
    drawUI();

    // Havai fişekleri çiz
    FireworkSystem.draw(ctx);
}

// UI çizimini ayrı bir fonksiyona al
function drawUI() {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${game.score}`, 10, 30);
    ctx.fillText(`High Score: ${game.highScore}`, 10, 60);
    drawFuelBar();
}

// Noel Baba çizimini güncelle - parlama efekti ekle
function drawSanta() {
    const santaX = player.x;
    const santaY = player.y - camera.y;

    // Parlama efekti
    ctx.shadowColor = '#FF4444';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Vücut (ceket)
    const coatGradient = ctx.createLinearGradient(
        santaX, santaY,
        santaX, santaY + player.height
    );
    coatGradient.addColorStop(0, '#FF0000');
    coatGradient.addColorStop(1, '#CC0000');
    ctx.fillStyle = coatGradient;
    ctx.beginPath();
    ctx.roundRect(santaX, santaY, player.width, player.height, 5);
    ctx.fill();

    // Kemer
    ctx.shadowColor = '#FFD700';
    ctx.fillStyle = '#4A3000';
    ctx.fillRect(santaX, santaY + player.height * 0.6, player.width, player.height * 0.15);

    // Kemer tokası
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(
        santaX + player.width * 0.4,
        santaY + player.height * 0.6,
        player.width * 0.2,
        player.height * 0.15
    );

    // Beyaz kürk kenarlar
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#FFFFFF';
    // Alt kısım
    ctx.fillRect(santaX, santaY + player.height - 5, player.width, 5);
    // Orta kısım
    ctx.fillRect(santaX, santaY + player.height * 0.5, player.width, 3);
    // Yaka
    ctx.beginPath();
    ctx.arc(
        santaX + player.width * 0.5,
        santaY + player.height * 0.2,
        player.width * 0.3,
        0,
        Math.PI,
        true
    );
    ctx.fill();

    // Yüz
    ctx.shadowColor = '#FFE4B5';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFE4B5';
    ctx.beginPath();
    ctx.arc(
        santaX + player.width * 0.5,
        santaY + player.height * 0.25,
        player.width * 0.25,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Sakal
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(
        santaX + player.width * 0.5,
        santaY + player.height * 0.3,
        player.width * 0.25,
        0,
        Math.PI
    );
    ctx.fill();

    // Gözler
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#000000';
    // Sol göz
    ctx.beginPath();
    ctx.arc(
        santaX + player.width * 0.4,
        santaY + player.height * 0.2,
        2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    // Sağ göz
    ctx.beginPath();
    ctx.arc(
        santaX + player.width * 0.6,
        santaY + player.height * 0.2,
        2,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Burun
    ctx.shadowColor = '#FF6B6B';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.arc(
        santaX + player.width * 0.5,
        santaY + player.height * 0.25,
        3,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Şapka
    ctx.shadowColor = '#FF4444';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#FF0000';
    // Ana şapka
    ctx.beginPath();
    ctx.moveTo(santaX - 2, santaY + player.height * 0.1);
    ctx.lineTo(santaX + player.width * 0.5, santaY - player.height * 0.2);
    ctx.lineTo(santaX + player.width + 2, santaY + player.height * 0.1);
    ctx.closePath();
    ctx.fill();

    // Şapka bandı
    ctx.shadowColor = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(
        santaX - 2,
        santaY + player.height * 0.1,
        player.width + 4,
        5
    );

    // Ponpon
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(
        santaX + player.width * 0.5,
        santaY - player.height * 0.15,
        5,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Gölge efekti
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(
        santaX + player.width * 0.5,
        santaY + player.height,
        player.width * 0.4,
        4,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

// Oyunu sıfırla
function resetGame() {
    if (game.score > 0) {
        saveHighScore(game.score);
    }
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    player.velocityX = 0;
    player.velocityY = 0;
    camera.y = 0;
    game.score = 0;
    generatePlatforms();
}

// Oyun döngüsü
function gameLoop() {
    if (game.state === GameState.PLAYING) {
        updateGame();
        // Kar tanelerini güncelle
        snowflakes.forEach(snowflake => snowflake.update());
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Yüksek skorları localStorage'dan yükle
function loadHighScores() {
    const saved = localStorage.getItem('highScores');
    game.highScores = saved ? JSON.parse(saved) : [];
}

// Yüksek skorları kaydet
function saveHighScore(score) {
    game.highScores.push(score);
    game.highScores.sort((a, b) => b - a);
    game.highScores = game.highScores.slice(0, 5); // Sadece en yüksek 5 skoru tut
    localStorage.setItem('highScores', JSON.stringify(game.highScores));
}

// Yüksek skorları göster
function showHighScores() {
    startButton.style.display = 'none';
    highScoresButton.style.display = 'none';
    highScoresDiv.style.display = 'block';

    // Varsa önceki talimat yazısını kaldır
    const existingInstructions = menuScreen.querySelector('.instructions');
    if (existingInstructions) {
        existingInstructions.remove();
    }

    scoresList.innerHTML = '';
    game.highScores.forEach((score, index) => {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';
        scoreItem.textContent = `${index + 1}. ${score}`;
        scoresList.appendChild(scoreItem);
    });
}

// Ana menüyü göster
function showMenu() {
    game.state = GameState.MENU;
    menuScreen.style.display = 'flex';
    menuScreen.style.flexDirection = 'column';
    menuScreen.style.alignItems = 'center';
    menuScreen.style.justifyContent = 'center';
    startButton.style.display = 'block';
    highScoresButton.style.display = 'block';
    highScoresDiv.style.display = 'none';
    AudioSystem.stopBackgroundMusic();

    // Varsa önceki kontrol ve talimat bilgilerini kaldır
    const existingControls = menuScreen.querySelector('.controls-info');
    const existingInstructions = menuScreen.querySelector('.instructions');
    if (existingControls) {
        existingControls.remove();
    }
    if (existingInstructions) {
        existingInstructions.remove();
    }

    // Kontrol bilgilerini göster
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'controls-info';
    controlsDiv.style.cssText = `
        background: rgba(0, 0, 0, 0.8);
        padding: 20px;
        border-radius: 10px;
        color: white;
        font-size: 16px;
        text-align: left;
        border: 2px solid white;
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
        margin: 20px 0;
        min-width: 300px;
    `;

    const controls = [
        { action: 'Hareket', keys: 'A / D veya ← / →' },
        { action: 'Zıplama', keys: 'W, ↑ veya SPACE' },
        { action: 'Roket', keys: 'E (Basılı Tutun)' },
        { action: 'Havai Fişek', keys: 'Mouse Tıklama' }
    ];

    const title = document.createElement('h2');
    title.textContent = 'Oyun Kontrolleri';
    title.style.marginBottom = '15px';
    title.style.textAlign = 'center';
    title.style.color = '#FFD700';
    controlsDiv.appendChild(title);

    controls.forEach(control => {
        const controlItem = document.createElement('div');
        controlItem.style.marginBottom = '10px';
        controlItem.innerHTML = `
            <span style="color: #FFD700">${control.action}:</span> 
            <span style="color: #87CEEB">${control.keys}</span>
        `;
        controlsDiv.appendChild(controlItem);
    });

    // Kontrolleri menü butonlarından önce ekle
    startButton.parentNode.insertBefore(controlsDiv, startButton);

    // Başlama talimatını ekle
    const instructions = document.createElement('div');
    instructions.className = 'instructions';
    instructions.style.cssText = `
        margin-top: 10px;
        font-size: 18px;
        color: #00FF00;
        text-align: center;
        text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
    `;
    instructions.textContent = 'Başlamak için SPACE tuşuna basın';
    menuScreen.appendChild(instructions);
}

// Oyunu başlat fonksiyonunu güncelle
function startGame() {
    if (AudioSystem.context === null) {
        AudioSystem.init();
    }
    game.state = GameState.PLAYING;
    menuScreen.style.display = 'none';
    resetGame();
    updatePlatformsFunc = generatePlatforms();
    AudioSystem.playBackgroundMusic();
}

// Web Audio API için ses sistemi
AudioSystem = {
    context: null,
    backgroundMusic: null,
    gainNode: null,
    isPlaying: false,

    init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.context.createGain();
            this.gainNode.connect(this.context.destination);
            this.gainNode.gain.value = 0.3;
        } catch (error) {
            console.error('Audio system initialization failed:', error);
        }
    },

    createOscillator(freq, type = 'sine') {
        const osc = this.context.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        return osc;
    },

    playBackgroundMusic() {
        if (!this.context || this.isPlaying) return;

        try {
            this.stopBackgroundMusic();
            const now = this.context.currentTime;

            this.backgroundMusic = {
                oscillators: [],
                interval: null,
                currentTime: 0
            };

            // Jingle Bells melodisi
            const melodyPatterns = [
                [659.25, 659.25, 659.25, 0], // E5, E5, E5
                [659.25, 659.25, 659.25, 0], // E5, E5, E5
                [659.25, 783.99, 523.25, 587.33], // E5, G5, C5, D5
                [659.25, 0, 0, 0], // E5

                [659.25, 659.25, 659.25, 0], // E5, E5, E5
                [659.25, 659.25, 659.25, 0], // E5, E5, E5
                [659.25, 783.99, 523.25, 587.33], // E5, G5, C5, D5
                [698.46, 0, 0, 0], // F5

                [783.99, 783.99, 739.99, 659.25], // G5, G5, F#5, E5
                [587.33, 0, 587.33, 587.33], // D5, D5, D5
                [659.25, 587.33, 659.25, 0], // E5, D5, E5
                [783.99, 0, 0, 0] // G5
            ];

            // Bass deseni
            const bassPatterns = [
                [196.00, 0, 196.00, 0], // G3
                [261.63, 0, 261.63, 0], // C4
                [174.61, 0, 174.61, 0], // F3
                [146.83, 0, 146.83, 0]  // D3
            ];

            let patternIndex = 0;
            let noteIndex = 0;
            const tempo = 180;
            const beatLength = 60 / tempo;

            const scheduleNotes = () => {
                const notesAhead = 4;

                for (let i = 0; i < notesAhead; i++) {
                    const noteTime = this.backgroundMusic.currentTime + i * beatLength;
                    const melodyNote = melodyPatterns[patternIndex][noteIndex];

                    if (melodyNote > 0) {
                        const mainOsc = this.context.createOscillator();
                        const mainGain = this.context.createGain();
                        mainOsc.type = 'square';
                        mainOsc.frequency.value = melodyNote;
                        mainGain.gain.value = 0.1;

                        const pwm = this.context.createOscillator();
                        pwm.frequency.value = 10;
                        const pwmGain = this.context.createGain();
                        pwmGain.gain.value = 0.005;
                        pwm.connect(pwmGain).connect(mainOsc.frequency);

                        mainOsc.connect(mainGain).connect(this.gainNode);

                        const startTime = this.context.currentTime + noteTime;
                        const stopTime = startTime + beatLength * 0.8;

                        mainOsc.start(startTime);
                        mainOsc.stop(stopTime);
                        pwm.start(startTime);
                        pwm.stop(stopTime);

                        this.backgroundMusic.oscillators.push(mainOsc, pwm);
                    }

                    const bassNote = bassPatterns[patternIndex % bassPatterns.length][noteIndex];
                    const bassOsc = this.context.createOscillator();
                    const bassGain = this.context.createGain();
                    bassOsc.type = 'triangle';
                    bassOsc.frequency.value = bassNote;
                    bassGain.gain.value = 0.15;

                    bassOsc.connect(bassGain).connect(this.gainNode);

                    const startTime = this.context.currentTime + noteTime;
                    const stopTime = startTime + beatLength;

                    bassOsc.start(startTime);
                    bassOsc.stop(stopTime);

                    this.backgroundMusic.oscillators.push(bassOsc);
                }

                noteIndex = (noteIndex + 1) % 4; // 4 notalık patern
                if (noteIndex === 0) {
                    patternIndex = (patternIndex + 1) % melodyPatterns.length;
                }

                this.backgroundMusic.currentTime += beatLength;
            };

            // İlk notaları planla
            scheduleNotes();

            // Sürekli çalma için interval ayarla
            this.backgroundMusic.interval = setInterval(() => {
                scheduleNotes();
                // Eski osilatörleri temizle
                this.backgroundMusic.oscillators = this.backgroundMusic.oscillators.filter(osc => {
                    if (osc.stopTime < this.context.currentTime) {
                        try { osc.stop(); } catch (e) { }
                        return false;
                    }
                    return true;
                });
            }, beatLength * 1000);

            this.isPlaying = true;

        } catch (error) {
            console.error('Arkaplan müziği başlatılamadı:', error);
        }
    },

    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            if (this.backgroundMusic.interval) {
                clearInterval(this.backgroundMusic.interval);
            }
            this.backgroundMusic.oscillators.forEach(osc => {
                try { osc.stop(); } catch (e) { }
            });
            this.backgroundMusic.oscillators = [];
        }
        this.isPlaying = false;
    },

    playJumpSound() {
        if (!this.context) return;

        const osc = this.createOscillator(440, 'sine');
        const gainNode = this.context.createGain();
        gainNode.gain.value = 0.1;
        osc.connect(gainNode);
        gainNode.connect(this.context.destination);

        osc.start();
        setTimeout(() => osc.stop(), 100);
    },

    playGameOverSound() {
        if (!this.context) return;

        const osc = this.createOscillator(200, 'sawtooth');
        const gainNode = this.context.createGain();
        gainNode.gain.value = 0.2;
        osc.connect(gainNode);
        gainNode.connect(this.context.destination);

        osc.start();
        osc.frequency.exponentialRampToValueAtTime(50, this.context.currentTime + 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.5);
        setTimeout(() => osc.stop(), 500);
    }
};

// DOM elementleri
const menuScreen = document.getElementById('menuScreen');
const startButton = document.getElementById('startButton');
const highScoresButton = document.getElementById('highScoresButton');
const highScoresDiv = document.getElementById('highScores');
const scoresList = document.getElementById('scoresList');
const backButton = document.getElementById('backButton');

// Menü kontrolleri
startButton.addEventListener('click', startGame);
highScoresButton.addEventListener('click', showHighScores);
backButton.addEventListener('click', showMenu);

// Oyunu başlat
loadHighScores();
showMenu();
gameLoop();

// Oyunu başlatmadan önce ses sistemini hazırla
document.addEventListener('click', () => {
    if (AudioSystem.context === null) {
        AudioSystem.init();
    }
}, { once: true });

// Yeni fonksiyon: Oyunu hemen yeniden başlat
function resetAndRestartGame() {
    if (game.score > 0) {
        saveHighScore(game.score);
    }

    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    player.velocityX = 0;
    player.velocityY = 0;
    camera.y = 0;
    game.score = 0;

    generatePlatforms();

    // Müziği yeniden başlat
    AudioSystem.stopBackgroundMusic();
    setTimeout(() => AudioSystem.playBackgroundMusic(), 100);
} 