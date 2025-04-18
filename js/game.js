// === CONFIGURATION DES DÉCHETS ET PROJECTILES ===
const WASTE_TYPES = [
    { key: 'waste_recycle',    sprite: 'waste_plastic.png',   bin: 'recyclage' },
    { key: 'waste_glass',      sprite: 'waste_glass.png',     bin: 'verre'     },
    { key: 'waste_black_bag',  sprite: 'waste-black_bag.png',  bin: 'black_bin' },
  ];
  
  const PROJECTILE_TYPES = [
    { key: 'bullet_green_bin', sprite: 'bullet_green_bin.png', bin: 'recyclage' },
    { key: 'bullet_blue_bin',  sprite: 'bullet_blue_bin.png',  bin: 'verre'     },
    { key: 'bullet_black_bin', sprite: 'bullet_black_bin.png', bin: 'black_bin' },
  ];
  
  const BINS = PROJECTILE_TYPES.map(p => p.bin);
  let currentBin = BINS[0];
  
  // === INITIALISATION DE PHASER ===
  const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: true }
    },
    scene: { preload, create, update }
  };
  
  const game = new Phaser.Game(config);
  
  // === VARIABLES GLOBALES ===
  let player, cursors, bullets, wasteGroup;
  let lastFired = 0, score = 0, lives = 3;
  let scoreText, livesText, binText, gameOverText;
  let invulnerable = false, isGameOver = false;
  let moveWasteTimer, wasteSpeed = 60;
  
  // === CHARGEMENT DES ASSETS ===
  function preload() {
    this.load.image('player', 'assets/images/human.png');
    WASTE_TYPES.forEach(w => this.load.image(w.key, `assets/images/${w.sprite}`));
    PROJECTILE_TYPES.forEach(p => this.load.image(p.key, `assets/images/${p.sprite}`));
  }
  
  // === CREATION DU JEU ===
  function create() {
    this.cameras.main.setBackgroundColor('#f0f0f0');
  
    // Joueur
    player = this.physics.add.sprite(config.width/2, config.height - 100, 'player')
      .setCollideWorldBounds(true)
      .setScale(0.1);
  
    // Projectiles
    bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 20
    });
  
    // Première vague
    createWaste(this);
  
    // Clavier
    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-ONE',   () => currentBin = BINS[0]);
    this.input.keyboard.on('keydown-TWO',   () => currentBin = BINS[1]);
    this.input.keyboard.on('keydown-THREE', () => currentBin = BINS[2]);
    this.input.keyboard.on('keydown-SPACE', () => {
      if (isGameOver) restartGame.call(this);
      else shootBullet(this.time.now);
    }, this);
  
    // UI
    scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '16px', fill: '#000' });
    livesText = this.add.text(10, 30, 'Lives: 3', { fontSize: '16px', fill: '#000' });
    binText   = this.add.text(10, 50, 'Bac: ' + currentBin, { fontSize: '16px', fill: '#000' });
  
    // Collisions
    this.physics.add.collider(bullets, wasteGroup, hitWaste, null, this);
    this.physics.add.overlap(player, wasteGroup, wasteHitsPlayer, null, this);
  
    // Descente
    moveWasteTimer = this.time.addEvent({
      delay: 2000,
      callback: moveWasteDown,
      callbackScope: this,
      loop: true
    });
  
    // **NOUVEAU** : Timer de spawn de vagues
    this.time.addEvent({
      delay: 8000,              // toutes les 8 secondes
      callback: () => {
        if (!isGameOver) createWaste(this);
      },
      loop: true
    });
  }
  
  // === BOUCLE DE JEU ===
  function update(time) {
    if (isGameOver) return;
  
    // Déplacement du joueur
    if (cursors.left.isDown)       player.setVelocityX(-300);
    else if (cursors.right.isDown) player.setVelocityX(300);
    else                             player.setVelocityX(0);
    player.setVelocityY(0);
  
    // UI du bac
    binText.setText('Bac: ' + currentBin);
  
    // Nettoyage des projectiles hors écran
    bullets.children.each(b => {
      if (b.active && b.y < 0) b.destroy();
    }, this);
  }
  
  // === FONCTIONS DE JEU ===
  
  function shootBullet(time) {
    if (time <= lastFired) return;
    const p = PROJECTILE_TYPES.find(p => p.bin === currentBin);
    const bullet = bullets.get(player.x, player.y - 20, p.key);
    if (!bullet) return;
    bullet
      .setScale(0.05)
      .setActive(true)
      .setVisible(true)
      .setVelocityY(-300)
      .setData('bin', currentBin);
    lastFired = time + 200;
  }
  
  function hitWaste(bullet, waste) {
    const chosenBin = bullet.getData('bin'),
          correctBin = waste.getData('bin');
    bullet.destroy();
    waste.destroy();
  
    if (chosenBin === correctBin) score += 10;
    else {
      score -= 5;
      loseLife.call(this);
    }
    scoreText.setText('Score: ' + score);
  }
  
  function wasteHitsPlayer(player, waste) {
    waste.destroy();
    loseLife.call(this);
  }
  
  function loseLife() {
    if (invulnerable) return;
    lives = Math.max(0, lives - 1);
    livesText.setText('Lives: ' + lives);
    if (lives > 0) {
      invulnerable = true;
      player.setTint(0xff0000);
      this.time.addEvent({ delay: 1000, callback: () => {
        invulnerable = false;
        player.clearTint();
      }});
    } else {
      gameOver.call(this);
    }
  }
  
  function gameOver() {
    isGameOver = true;
    this.physics.pause();
    gameOverText = this.add.text(
      config.width/2, config.height/2,
      'Game Over',
      { fontSize: '64px', fill: '#fff' }
    ).setOrigin(0.5);
  }
  
  function moveWasteDown() {
    if (isGameOver) return;
    wasteGroup.children.each(w => w.y += wasteSpeed, this);
  }
  
  function createWaste(scene) {
    if (wasteGroup) wasteGroup.clear(true, true);
    wasteGroup = scene.physics.add.group();
    WASTE_TYPES.forEach(w => {
      const count = Phaser.Math.Between(2, 4);
      for (let i = 0; i < count; i++) {
        const x = Phaser.Math.Between(50, config.width - 50);
        wasteGroup.create(x, Phaser.Math.Between(50, 150), w.key)
          .setData('bin', w.bin)
          .setScale(0.05);
      }
    });
  }
  
  function restartGame() {
    score = 0;
    lives = 3;
    isGameOver = false;
    invulnerable = false;
    scoreText.setText('Score: 0');
    livesText.setText('Lives: 3');
    if (gameOverText) gameOverText.destroy();
    this.physics.resume();
    player.clearTint().setPosition(config.width/2, config.height - 100);
    bullets.clear(true, true);
    createWaste(this);
    moveWasteTimer.paused = false;
  }
  
  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });
  