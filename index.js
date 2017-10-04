addEventListener("load", () => {
  class Vector {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }

    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    }
  }

  class Game {
    constructor() {
      this.init();
    }

    restart() {
      for (var enemy of this.enemies) enemy.die();
      for (var proyectile of this.proyectiles) proyectile.div.remove();
      for (var drop of this.drops) drop.div.remove();
      this.init();
      player.position = new Vector(innerWidth / 2, innerHeight / 2);
      player.life = player.maxLife;
      this.paused = false;
    }

    init() {
      this.enemies = new Set();
      this.frame = 0;
      this.drops = new Set();
      this.proyectiles = new Set();
      this.paused = false;
      this.pressedKeys = [];
      this.backgroundPosition = 0;
      this.leftPressed = false;
      this.rightPressed = false;
      this.attDelay = 0;
      this.mousePosition = new Vector(innerWidth / 2, innerHeight / 2);
      this.damageStar = true;
      this.bottomStar = true;
      document.getElementById("health").innerText = player.life;
      document.getElementById("max-health").innerText = player.maxLife;
    }
  }

  class RoundObject {
    constructor(position, radius, speed) {
      this.radius = radius;
      this.position = position;
      this.speed = speed;
      this.div = document.createElement("div");
      this.div.style.width = radius * 2 + "px";
      this.div.style.height = radius * 2 + "px";
      document.body.appendChild(this.div);
    }
  }

  class Level {
    constructor(level, monsters) {
      this.monsterClasses = monsters;
      this.maxStartReached = 0;
      this.level = level;
    }

    start() {
      document.getElementById("level-selection").style.display = "none";
      this.index = 0;
      game.currentLevel = this;
      game.restart();
      requestAnimationFrame(loop);
    }

    spawnEnemy() {
      if (this.index < this.monsterClasses.length) {
        var c = this.monsterClasses[this.index];
        game.enemies.add(new c());
        this.index++;
      }
    }
  }

  class Player extends RoundObject {
    constructor(position, up, left, down, right, radius) {
      super(position, radius, 0, 2);
      this.up = up
      this.left = left;
      this.down = down;
      this.right = right;
      this.maxLife = 10;
      this._life = this.maxLife;
      this.maxBounces = 2;
      this.speedMultiplier = 1.5;
      this.damage = 1;
      this.attDelay = 60;
      this.shield = Math.PI / 2;
      this.div.classList.add("player");
      this.canvas = document.createElement("canvas");
      this.canvas.width = radius * 2;
      this.canvas.height = radius * 2;
      this.ctx = this.canvas.getContext("2d");
      this.ctx.strokeStyle = "red";
      this.ctx.lineWidth = 3;
      document.body.appendChild(this.canvas);
    }

    moveX(length) {
      this.position.x += this.speed.x * this.speedMultiplier / length;
      this.div.style.left = (this.position.x - this.radius) + "px";
      this.canvas.style.left = (this.position.x - this.radius) + "px";
    }

    moveY(length) {
      this.position.y += (this.speed.y + 1) * this.speedMultiplier / length;
      this.div.style.top = (this.position.y - this.radius) + "px";
      this.canvas.style.top = (this.position.y - this.radius) + "px";
    }

    rotate() {
      this.angle = Math.atan2(game.mousePosition.y - this.position.y, game.mousePosition.x - this.position.x);
    }

    die() {
      game.paused = true;
      document.getElementById("restart-menu").style.display = "";
    }

    get life() {
      return this._life;
    }

    set life(value) {
      this._life = Math.min(this.maxLife, value);
      if (value <= 0) {
        document.getElementById("restart-menu").style.display = "";
        game.paused = true;
        this._life = 0;
      }
      document.getElementById("health").innerText = this.life;
    }
  }

  class Skill {
    constructor(player, onUpgrade, src, name, description) {
      player = player;
      this.level = 1;
      this.onUpgrade = onUpgrade;
      this.row = document.createElement("tr");
      var td = document.createElement("td");
      var img = document.createElement("img");
      img.src = src;
      td.appendChild(img);
      this.row.appendChild(td)
      var td = document.createElement("td");
      td.innerText = name;
      this.row.appendChild(td)
      var td = document.createElement("td");
      td.innerText = description;
      this.row.appendChild(td)
      this.button = document.createElement("td");
      this.button.innerText = "Upgrade for ";
      this.levelSpan = document.createElement("span");
      this.updateLevelSpan();
      var img = document.createElement("img");
      img.src = "img/skill-point.png";
      img.classList.add("mini-image");
      this.button.appendChild(this.levelSpan);
      this.button.appendChild(img);
      this.button.classList.add("button");
      this.button.addEventListener("click", function() {
        if (this.level != 10 && this.level <= skillPoints) {
          onUpgrade();
          skillPoints -= this.level;
          this.level++;
          document.getElementById("skill-points").innerText = skillPoints;
          this.updateLevelSpan();
          if (this.level === 10) this.button.remove();
        }
      }.bind(this));
      this.row.appendChild(this.button);
      document.getElementById("skills").appendChild(this.row);
    }

    updateLevelSpan() {
      this.levelSpan.innerText = this.level;
    }
  }

  class Proyectile extends RoundObject {
    constructor(shooter, angle, maxBounces, damage, speed) {
      super(new Vector(shooter.position.x, shooter.position.y), 5);
      this.lastBouncedWith = shooter;
      this.lastBouncedAt = 0;
      this.speed = new Vector(speed * Math.cos(angle), speed * Math.sin(angle));
      this.bounces = 0;
      this.maxBounces = maxBounces;
      this.damage = damage;
      this.div.classList.add("proyectile");
    }

    move() {
      var creatures = [...game.enemies, player];
      for (var creature of creatures) {
        if (distance(creature, this) < creature.radius + this.radius && !(creature === this.lastBouncedWith && this.bounces === this.lastBouncedAt)) {
          if (!(creature === player && game.rightPressed && (Math.abs(player.angle - Math.atan2(this.position.y - player.position.y, this.position.x - player.position.x)) + 2 * Math.PI) % (2 * Math.PI) < player.shield)) {
            creature.life -= this.damage;
            if (creature === player) game.damageStar = false;
          }
          if (creature.life <= 0) creature.die(true);
          this.bounceWith(creature);
        }
      }
      this.position.x += this.speed.x;
      this.position.y += this.speed.y;
      if (this.position.x < this.radius) {
        this.position.x = this.radius;
        this.speed.x *= -1;
        this.addBounce();
      } else if (innerWidth - this.radius < this.position.x) {
        this.position.x = innerWidth - this.radius;
        this.speed.x *= -1;
        this.addBounce();
      }
      if (this.position.y < this.radius) {
        this.delete();
      } else if (innerHeight - this.radius < this.position.y) {
        this.delete();
      }
      this.div.style.left = (this.position.x - this.radius) + "px";
      this.div.style.top = (this.position.y - this.radius) + "px";
    }

    bounceWith(creature) {
      var angle = Math.atan2(this.y - creature.y, this.x - creature.x);
      if (0.25 * Math.PI <= angle && angle < 0.75 * Math.PI || -0.75 * Math.PI <= angle && angle < -0.25 * Math.PI) this.speed.x *= -1;
      else this.speed.y *= -1;
      this.addBounce();
      this.lastBouncedAt = this.bounces;
      this.lastBouncedWith = creature;
    }

    addBounce() {
      this.bounces++;
      if (this.maxBounces <= this.bounces) {
        this.delete();
      }
    }

    delete() {
      this.div.remove();
      game.proyectiles.delete(this);
    }
  }

  class Enemy extends RoundObject {
    constructor(life, radius, speed, attackDelay, dropChance) {
      super(new Vector(radius + Math.random() * (innerWidth - 2 * radius), -radius), radius, new Vector(speed, speed));
      this.framesSinceAttack = attackDelay;
      this.attackDelay = attackDelay;
      this.life = life;
      this.div.classList.add("enemy");
      this.dropChance = dropChance;
    }

    die(drop) {
      this.div.remove();
      game.enemies.delete(this);
      if (drop && Math.random() < this.dropChance) {
        if (Math.random() < 0.5) game.drops.add(new Drop("heart", new Vector(this.position.x, this.position.y), () => {
          player.life++;
        }));
        else game.drops.add(new Drop("skill-point", new Vector(this.position.x, this.position.y), () => {
          skillPoints++;
          document.getElementById("skill-points").innerText++;
        }));
      }
    }

    move() {
      this.position.y += this.speed.y;
      this.div.style.left = (this.position.x - this.radius) + "px";
      this.div.style.top = (this.position.y - this.radius) + "px";
      if (innerHeight + this.radius < this.position.y) {
        this.die();
        game.bottomStar = false;
      }
    }

    tryToAttack() {
      if (this.attackDelay <= this.framesSinceAttack && 0 <= this.position.y) {
        this.attack();
        this.framesSinceAttack = 0;
      } else this.framesSinceAttack++;
    }

    attack() {

    }
  }

  class Bug extends Enemy {
    constructor() {
      super(1, 10, 2, 60, 0.15);
      this.div.classList.add("bug");
    }
  }

  class Shooter extends Enemy {
    constructor() {
      super(2, 10, 2, 30, 0.25);
      this.div.classList.add("shooter");
    }

    attack() {
      game.proyectiles.add(new Proyectile(this, Math.atan2(player.position.y - this.position.y, player.position.x - this.position.x), 2, 2, 6));
    }
  }

  class Sniper extends Enemy {
    constructor() {
      super(3, 10, 2, 90, 0.25);
      this.div.classList.add("sniper");
    }

    attack() {
      game.proyectiles.add(new Proyectile(this, Math.atan2(player.position.y - this.position.y, player.position.x - this.position.x), 1, 1, 12));
    }
  }

  class Kamikaze extends Enemy {
    constructor() {
      super(1, 10, 4, 45, 0.25);
      this.div.classList.add("kamikaze");
    }

    move() {
      var angle = Math.atan2(player.position.y - this.position.y, player.position.x - this.position.x);
      this.position.x += this.speed.x * Math.cos(angle);
      this.position.y += this.speed.y * Math.sin(angle);
      this.div.style.left = (this.position.x - this.radius) + "px";
      this.div.style.top = (this.position.y - this.radius) + "px";
      if (innerHeight + this.radius < this.position.y) {
        this.die();
        game.bottomStar = false;
      }
    }
  }

  class Drop {
    constructor(icon, position, onPick) {
      this.div = document.createElement("div");
      this.div.classList.add("drop");
      this.onPick = onPick;
      this.div.style.left = (position.x - 6) + "px";
      this.div.style.top = (position.y - 6) + "px";
      this.div.style.backgroundImage = "url(img/" + icon + ".png)";
      this.position = position;
      document.body.appendChild(this.div);
    }

    pickUp() {
      this.onPick();
      this.div.remove();
      game.drops.delete(this);
    }
  }

  function distance(a, b) {
    return Math.sqrt(Math.pow(a.position.x - b.position.x, 2) + Math.pow(a.position.y - b.position.y, 2));
  }

  function loop() {
    player.ctx.clearRect(0, 0, 32, 32);
    if (game.rightPressed) {
      player.ctx.beginPath();
      player.ctx.arc(16, 16, 16, player.angle - player.shield / 2, player.angle + player.shield / 2);
      player.ctx.stroke();
    }
    var pressedKeys = game.pressedKeys;
    game.backgroundPosition++;
    document.body.style.backgroundPosition = "0 " + game.backgroundPosition + "px";
    player.speed = new Vector(0, -1);
    if (pressedKeys[player.up]) player.speed.y -= 3;
    if (pressedKeys[player.down]) player.speed.y += 5;
    if (pressedKeys[player.left]) player.speed.x -= 4;
    if (pressedKeys[player.right]) player.speed.x += 4;
    var length = player.speed.length();
    player.moveY(length);
    player.moveX(length);
    if (player.speed.y <= 0) player.div.classList.add("back");
    else player.div.classList.remove("back");
    player.rotate();
    if (!(game.frame % 60)) game.currentLevel.spawnEnemy();
    for (var enemy of game.enemies) {
      enemy.move();
      enemy.tryToAttack();
      if (distance(player, enemy) < player.radius + enemy.radius) {
        player.life -= enemy.life;
        enemy.die();
      }
    }
    for (var proyectile of game.proyectiles) proyectile.move();
    if (!game.rightPressed && game.leftPressed && game.attDelay <= 0) {
      game.attDelay = player.attDelay;
      game.proyectiles.add(new Proyectile(player, player.angle, player.maxBounces, player.damage, 6));
    }
    for (var drop of game.drops) {
      if (distance(player, drop) < player.radius + 6) drop.pickUp();
    }
    game.attDelay--;
    game.frame++;
    if (!game.enemies.size && game.currentLevel.monsterClasses.length <= game.currentLevel.index && 0 <= player.life) {
      for (var drop of game.drops) drop.pickUp();
      player.life = player.maxLife;
      game.currentLevel.maxStartReached = 1 + game.damageStar + game.bottomStar;
      document.getElementsByClassName("level")[game.currentLevel.level].classList.remove("inactive");
      levelReached = Math.max(levelReached, game.currentLevel.level);
      game.paused = true;
      document.getElementById("level-selection").style.display = "";
    }
    if (!game.paused) requestAnimationFrame(loop);
  }

  var levels = [];
  var skillPoints = 65;
  var player = new Player(new Vector(innerWidth / 2, innerHeight / 2), 87, 65, 83, 68, 16);
  var skills = [
    new Skill(player, () => {
      player.maxLife += 10;
      player.life += 10;
      document.getElementById("max-health").innerText = player.maxLife;
    }, "", "Life", "Adds 10 to the player's max life."),
    new Skill(player, () => {
      player.maxBounces++;
    }, "", "Bounciness", "Your bullets bounce one more time."),
    new Skill(player, () => {
      player.damage++;
    }, "", "Damage", "Increases your bullets' damage by one."),
    new Skill(player, () => {
      player.attDelay -= 5;
    }, "", "Attack speed", "Increases your attack speed."),
    new Skill(player, () => {
      player.speedMultiplier *= 1.15;
    }, "", "Speed", "Increases your run speed by 15%."),
    new Skill(player, () => {
      player.shield *= 1.1;
    }, "", "Shield", "Increases your shield size by 10%.")
  ];
  var game = new Game();
  (function() {
    function pushLevel() {
      levels.push(new Level(level++, monsters));
      monsters = [];
    }
    var level = 1;
    var monsters = [];
    //test
    for (i = 0; i < 10; i++) {
      monsters.push(Bug);
    }
    for (i = 0; i < 10; i++) {
      monsters.push(Shooter);
    }
    for (i = 0; i < 10; i++) {
      monsters.push(Kamikaze);
      monsters.push(Sniper);
    }
    pushLevel();
    //end test
    for (i = 0; i < 30; i++) monsters.push(Bug);
    pushLevel();
    for (var i = 0; i < 16; i++) {
      monsters.push(Shooter);
      for (var j = 0; j < 3; j++) monsters.push(Bug);
    }
    pushLevel();
    var levelSelection = document.getElementById("level-selection");
    for (i = 0; i < 10; i++) {
      var div = document.createElement("div");
      levelSelection.appendChild(div);
      if (i) div.classList.add("inactive");
      div.classList.add("level");
      div.style.left = 300 + 105 * (i % 2) + "px"
      div.style.top = 450 - 50 * i + "px"
      div.addEventListener("click", function() {
        if (this <= levelReached) levels[this].start();
      }.bind(i));
    }
  })();
  var levelReached = 0;
  levels[0].start();
  addEventListener("mousemove", e => {
    game.mousePosition = new Vector(e.x, e.y);
  });
  addEventListener("mouseup", e => {
    switch (e.which) {
      case 1:
        game.leftPressed = false;
        break;
      case 3:
        game.rightPressed = false;
        break;
    }
  });
  addEventListener("mousedown", e => {
    switch (e.which) {
      case 1:
        game.leftPressed = true;
        break;
      case 3:
        game.rightPressed = true;
        break;
    }
  });
  addEventListener("contextmenu", e => {
    e.preventDefault();
  });
  addEventListener("keyup", e => {
    game.pressedKeys[e.keyCode] = false;
  });
  addEventListener("keydown", e => {
    game.pressedKeys[e.keyCode] = true;
    if (e.keyCode === 32) {
      var style = document.getElementById("pause-menu").style;
      if (player.life <= 0) {
        document.getElementById("restart-menu").style.display = "none";
        style.display = "none";
        game.currentLevel.start();
        game.restart();
      } else if (style.display === "none") {
        style.display = "";
        game.paused = true;
      } else {
        style.display = "none";
        game.paused = false;
        requestAnimationFrame(loop);
      }
    }
  });
});