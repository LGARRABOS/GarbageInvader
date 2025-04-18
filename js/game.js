// === CONFIGURATION DES DÉCHETS ET PROJECTILES ===
const WASTE_TYPES = [
    { key: 'waste_plastic', sprite: 'waste_plastic.png', bin: 'plastique' },
    { key: 'waste_glass',   sprite: 'waste_glass.png',   bin: 'verre'     },
    { key: 'waste_paper',   sprite: 'waste_paper.png',   bin: 'papier'    },
    // pour ajouter un nouveau déchet :
    // { key: 'waste_metal', sprite: 'waste_metal.png', bin: 'metal' },
  ];
  
  const PROJECTILE_TYPES = [
    { key: 'bullet_plastique', color: 0x00ff00, bin: 'plastique' },
    { key: 'bullet_verre',     color: 0x0000ff, bin: 'verre'     },
    { key: 'bullet_papier',    color: 0xffff00, bin: 'papier'    },
    // pour ajouter un nouveau projectile :
    // { key: 'bullet_metal', color: 0xff00ff, bin: 'metal' }
  ];
  
  const BINS = PROJECTILE_TYPES.map(p => p.bin);
  let currentBin = BINS[0];
  
  // === CODE DU JEU ===
  const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: { default: 'arcade', arcade: { gravity:{ y:0 }, debug:false } },
    scene: { preload, create, update }
  };
  const game = new Phaser.Game(config);
  
  let player, cursors, bullets, wasteGroup;
  let lastFired = 0, score=0, lives=3;
  let scoreText, livesText, binText, gameOverText;
  let invulnerable=false, isGameOver=false;
  let moveWasteTimer, wasteSpeed=60;
  
  function preload() {
    // Humain
    this.load.image('player', 'assets/images/human.png');
    // Déchets
    WASTE_TYPES.forEach(w =>
      this.load.image(w.key, `assets/images/${w.sprite}`)
    );
  }
  
  function create() {
    // Génération dynamique des textures de projectiles
    PROJECTILE_TYPES.forEach(p => {
      const g = this.add.graphics();
      g.fillStyle(p.color, 1);
      g.fillRect(0,0,5,20);
      g.generateTexture(p.key,5,20);
      g.destroy();
    });
  
    // Joueur
    player = this.physics.add.sprite(config.width/2,config.height-100,'player')
      .setCollideWorldBounds(true).setScale(0.1);
  
    // Projectiles
    bullets = this.physics.add.group({ maxSize: 20 });
  
    // Déchets
    createWaste(this);
  
    // Clavier
    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-ONE',   () => currentBin=BINS[0]);
    this.input.keyboard.on('keydown-TWO',   () => currentBin=BINS[1]);
    this.input.keyboard.on('keydown-THREE', () => currentBin=BINS[2]);
    this.input.keyboard.on('keydown-SPACE', () => {
      if (isGameOver) restartGame.call(this);
      else shootBullet(this.time.now);
    }, this);
  
    // UI
    scoreText = this.add.text(10,10,'Score: 0',{fontSize:'16px',fill:'#fff'});
    livesText = this.add.text(10,30,'Lives: 3',{fontSize:'16px',fill:'#fff'});
    binText   = this.add.text(10,50,`Bac: ${currentBin}`,{fontSize:'16px',fill:'#fff'});
  
    // Collisions
    this.physics.add.collider(bullets, wasteGroup, hitWaste, null, this);
    this.physics.add.overlap(player, wasteGroup, wasteHitsPlayer, null, this);
  
    // Timer pour descendre les déchets
    moveWasteTimer = this.time.addEvent({
      delay:2000, callback:moveWasteDown, callbackScope:this, loop:true
    });
  }
  
  function update(time) {
    if (isGameOver) return;
    // Déplacement joueur
    if (cursors.left.isDown)  player.setVelocityX(-300);
    else if (cursors.right.isDown) player.setVelocityX(300);
    else player.setVelocityX(0);
    player.setVelocityY(0);
  
    // UI du bac
    binText.setText('Bac: ' + currentBin);
  
    // Nettoyage balles
    bullets.children.each(b => {
      if (b.active && b.y<0) b.destroy();
    }, this);
  
    // Nouvelle vague ?
    if (wasteGroup.countActive(true)===0) createWaste(this);
  }
  
  function shootBullet(time) {
    if (time<=lastFired) return;
    // On trouve la config du projectile courant
    const p = PROJECTILE_TYPES.find(p=>p.bin===currentBin);
    const b = bullets.get(player.x, player.y-20, p.key);
    if (!b) return;
    b.setActive(true).setVisible(true).setVelocityY(-300)
     .setData('bin',currentBin);
    lastFired = time+200;
  }
  
  function hitWaste(bullet, waste) {
    const chosen = bullet.getData('bin'),
          correct= waste.getData('bin');
    bullet.destroy(); waste.destroy();
    if (chosen===correct) score+=10;
    else { score-=5; loseLife.call(this); }
    scoreText.setText('Score: '+score);
  }
  
  function wasteHitsPlayer(player, waste) {
    waste.destroy();
    loseLife.call(this);
  }
  
  function loseLife() {
    if (invulnerable) return;
    lives=Math.max(0,lives-1);
    livesText.setText('Lives: '+lives);
    if (lives>0) {
      invulnerable=true; player.setTint(0xff0000);
      this.time.addEvent({delay:1000, callback:()=>{invulnerable=false;player.clearTint();}});
    } else gameOver.call(this);
  }
  
  function gameOver() {
    isGameOver=true;
    this.physics.pause();
    gameOverText = this.add.text(config.width/2,config.height/2,'Game Over',{
      fontSize:'64px',fill:'#fff'}).setOrigin(0.5);
  }
  
  function moveWasteDown() {
    if (isGameOver) return;
    wasteGroup.children.each(w=>w.y+=wasteSpeed,this);
  }
  
  function createWaste(scene) {
    if (wasteGroup) wasteGroup.clear(true,true);
    wasteGroup = scene.physics.add.group();
    WASTE_TYPES.forEach(w => {
      const count = Phaser.Math.Between(2,4);
      for (let i=0;i<count;i++) {
        const x = Phaser.Math.Between(50,config.width-50);
        scene.add.existing(
          wasteGroup.create(x, Phaser.Math.Between(50,150), w.key)
            .setData('bin',w.bin).setScale(0.1)
        );
      }
    });
  }
  
  function restartGame() {
    // Reset
    score=0; lives=3; isGameOver=false; invulnerable=false;
    scoreText.setText('Score: 0');
    livesText.setText('Lives: 3');
    if (gameOverText) gameOverText.destroy();
    this.physics.resume();
    player.clearTint().setPosition(config.width/2,config.height-100);
    bullets.clear(true,true);
    createWaste(this);
    moveWasteTimer.paused=false;
  }
  
  window.addEventListener('resize',()=>{
    game.scale.resize(window.innerWidth,window.innerHeight);
  });
  