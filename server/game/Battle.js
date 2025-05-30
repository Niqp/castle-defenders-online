// Battle.js - Handles battle mode between units on the grid

// Assigns battles for units sharing a cell
function checkAndStartBattles(grid) {
  for (let row = 1; row < grid.rows - 1; row++) {
    for (let col = 0; col < grid.columns; col++) {
      const units = grid.getUnitsInCell(row, col);
      const enemies = units.filter(u => u.type === 'enemy' && u.isAlive());
      const players = units.filter(u => u.type === 'player' && u.isAlive());
      if (enemies.length && players.length) {
        // Assign each player and enemy a target from the other group
        for (const player of players) {
          if (!player.inBattle) {
            player.inBattle = true;
            player.targetId = enemies[0].id;
          }
        }
        for (const enemy of enemies) {
          if (!enemy.inBattle) {
            enemy.inBattle = true;
            enemy.targetId = players[0].id;
          }
        }
      }
    }
  }
}

// Processes battle logic: apply damage, switch targets, exit battle if no enemies remain
function processBattles(grid) {
  for (let row = 1; row < grid.rows - 1; row++) {
    for (let col = 0; col < grid.columns; col++) {
      const units = grid.getUnitsInCell(row, col);
      const enemies = units.filter(u => u.type === 'enemy' && u.isAlive());
      const players = units.filter(u => u.type === 'player' && u.isAlive());
      // First pass: collect attacks
      const playerAttacks = [];
      for (const player of players) {
        if (!player.inBattle) continue;
        const target = enemies.find(e => e.id === player.targetId && e.isAlive());
        if (target) {
          playerAttacks.push({ attacker: player, target });
        }
      }
      const enemyAttacks = [];
      for (const enemy of enemies) {
        if (!enemy.inBattle) continue;
        const target = players.find(p => p.id === enemy.targetId && p.isAlive());
        if (target) {
          enemyAttacks.push({ attacker: enemy, target });
        }
      }
      // Second pass: apply damage
      for (const { attacker, target } of playerAttacks) {
        target.takeDamage(attacker.damage);
      }
      for (const { attacker, target } of enemyAttacks) {
        target.takeDamage(attacker.damage);
      }
      // Third pass: update battle states and switch targets if needed
      for (const player of players) {
        const aliveEnemies = enemies.filter(e => e.isAlive());
        if (aliveEnemies.length === 0) {
          player.inBattle = false;
          player.targetId = null;
        } else {
          if (!player.inBattle || !aliveEnemies.find(e => e.id === player.targetId)) {
            player.inBattle = true;
            player.targetId = aliveEnemies[0].id;
          }
        }
      }
      for (const enemy of enemies) {
        const alivePlayers = players.filter(p => p.isAlive());
        if (alivePlayers.length === 0) {
          enemy.inBattle = false;
          enemy.targetId = null;
        } else {
          if (!enemy.inBattle || !alivePlayers.find(p => p.id === enemy.targetId)) {
            enemy.inBattle = true;
            enemy.targetId = alivePlayers[0].id;
          }
        }
      }
    }
  }
}



export { checkAndStartBattles, processBattles };

