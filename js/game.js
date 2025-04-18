// === CONFIGURATION DES DÉCHETS ET PROJECTILES ===
const WASTE_TYPES = [
    { key: 'waste_recycle', sprite: 'waste_plastic.png', bin: 'jaune',
      save: { pulls: 1800, wood: 1410, water: 48.2 } },
    { key: 'waste_glass',   sprite: 'waste_glass.png',   bin: 'bleu',
      save: { bottles: 2222, sand: 660, water: 1.17 } },
    { key: 'waste_black_bag', sprite: 'waste_black_bag.png', bin: 'noir',
      save: {} }
  ];
  
  // === ÉCONOMIES DE TRI ===
const savings = {
    waste_recycle:   { pulls: 0,    wood: 0,    water: 0   },
    waste_glass:     { bottles: 0,  sand: 0,    water: 0   },
    waste_black_bag: {}
  };
  
  const PROJECTILE_TYPES = [
    { key: 'bullet_green_bin', sprite: 'bullet_green_bin.png', bin: 'jaune' },
    { key: 'bullet_blue_bin',  sprite: 'bullet_blue_bin.png',  bin: 'bleu'     },
    { key: 'bullet_black_bin', sprite: 'bullet_black_bin.png', bin: 'noir' },
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
      arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: { preload, create, update }
  };
  
  const game = new Phaser.Game(config);
  
  // === VARIABLES GLOBALES ===
  let player, cursors, bullets, wasteGroup;
  let lastFired = 0, score = 0, lives = 3;
  let scoreText, livesText, binText, gameOverText, savingsText;
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
  
    // Clavier + changement de bac
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
  
    // Descente continue
    moveWasteTimer = this.time.addEvent({
      delay: 2000,
      callback: moveWasteDown,
      callbackScope: this,
      loop: true
    });
  }
  
  // === BOUCLE DE JEU ===
  function update(time) {
    if (isGameOver) return;
  
    // Déplacement joueur
    if (cursors.left.isDown)       player.setVelocityX(-300);
    else if (cursors.right.isDown) player.setVelocityX(300);
    else                             player.setVelocityX(0);
    player.setVelocityY(0);
  
    // Mise à jour du bac
    binText.setText('Bac: ' + currentBin);
  
    // Nettoyage projectiles hors-écran
    bullets.children.each(b => {
      if (b.active && b.y < 0) b.destroy();
    }, this);

    // **NOUVEAU** : nettoyage déchets hors-écran
  wasteGroup.children.each(w => {
    if (w.active && w.y > config.height) {
      w.destroy();
    }
  }, this);
  
    // **Spawn** nouvelle vague si le groupe est vide
    if (wasteGroup.countActive(true) === 0) {
      createWaste(this);
    }
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
    const typeKey = waste.texture.key;
    const chosenBin = bullet.getData('bin'),
          correctBin = waste.getData('bin');
    bullet.destroy();
    waste.destroy();
    if (chosenBin === correctBin){
        score += 10;
        const cfg = WASTE_TYPES.find(w => w.key === typeKey);
            if (cfg && cfg.save) {
            const store = savings[typeKey];
            for (const k in cfg.save) {
            store[k] = (store[k] || 0) + cfg.save[k];
    }
  }
    }
    
    else { score -= 5; loseLife.call(this); }
    if (score < 0) score = 0;
    if (score > score + 100 ) wasteSpeed = wasteSpeed + 10;
    scoreText.setText('Score: ' + score);

    
  
    // spawn si plus aucun actif
    if (wasteGroup.countActive(true) === 0 && !isGameOver) {
      createWaste(this);
    }
  }
  
  function wasteHitsPlayer(player, waste) {
    waste.destroy();
    loseLife.call(this);
  
    // spawn si plus aucun actif
    if (wasteGroup.countActive(true) === 0 && !isGameOver) {
      createWaste(this);
    }
  }
  
  function loseLife() {
    if (invulnerable) return;
    lives = Math.max(0, lives - 1);
    livesText.setText('Lives: ' + lives);
    if (lives > 0) {
      invulnerable = true;
      player.setTint(0xff0000);
      this.time.addEvent({ delay: 1000, callback: () => {
        invulnerable = false; player.clearTint();
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
      { fontSize: '64px', fill: '#000' }
    ).setOrigin(0.5);

    const r = savings.waste_recycle;
    const g = savings.waste_glass;
    const lines = [
        `Plastique trié → ${r.pulls} pulls, ${r.wood} kg bois, ${r.water} m³ eau`,
        `Verre trié → ${g.bottles} bouteilles, ${g.sand} kg sable, ${g.water} m³ eau`
    ];
    savingsText = this.add.text(
        config.width/2, config.height/2 + 20,
        lines,
        { fontSize:'16px', fill:'#000', align:'center' }
     ).setOrigin(0.5, 0);
  }
  
  function moveWasteDown() {
    if (isGameOver) return;
    wasteGroup.children.each(w => w.y += wasteSpeed, this);
  
    // spawn si plus aucun actif
    if (wasteGroup.countActive(true) === 0 && !isGameOver) {
      createWaste(this);
    }
  }
  
  function createWaste(scene) {
    console.log(wasteGroup)
    if (wasteGroup) {
      wasteGroup.clear(true, true);
    } else { 
      wasteGroup=scene.physics.add.group();  // Il ne faut pas refaire cette ligne
    }
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
    score = 0; lives = 3; isGameOver = false; invulnerable = false;
    scoreText.setText('Score: 0');
    livesText.setText('Lives: 3');
    if (gameOverText) gameOverText.destroy();
    if (savingsText) savingsText.destroy();
    this.physics.resume();
    player.clearTint().setPosition(config.width/2, config.height - 100);
    bullets.clear(true, true);
    createWaste(this);
    moveWasteTimer.paused = false;

    for (const key in savings) {
        for (const res in savings[key]) {
          savings[key][res] = 0;
        }
      }
  }
  
  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });
  