// Battle.js - Handles battle mode between units on the grid
import { UPGRADE_TYPES } from '../config.js';

// Helper: choose a random element from an array (assuming length > 0)
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper: calculate critical strike damage
function calculateDamage(baseDamage, attacker, gameState) {
  let finalDamage = baseDamage;
  
  // Apply critical strikes for player units
  if (attacker.type === 'player' && attacker.owner && gameState?.players) {
    const player = gameState.players.find(p => p.name === attacker.owner);
    if (player?.upgrades?.CRITICAL_STRIKES) {
      const critLevel = player.upgrades.CRITICAL_STRIKES;
      const critChance = getUpgradeEffect(UPGRADE_TYPES.CRITICAL_STRIKES, critLevel, 'critChance', 0);
      
      if (Math.random() < critChance) {
        finalDamage *= 2; // Critical hit deals double damage
      }
    }
  }
  
  return finalDamage;
}

// Helper: get upgrade effect value
function getUpgradeEffect(upgradeType, level, effectKey, defaultValue) {
  if (level === 0) return defaultValue;
  const levelData = upgradeType.levels.find(l => l.level === level);
  return levelData?.effect[effectKey] ?? defaultValue;
}

// Assigns battles for units sharing a cell
function checkAndStartBattles(grid) {
  for (let col = 1; col < grid.columns - 1; col++) {
    for (let row = 0; row < grid.rows; row++) {
      const units = grid.getUnitsInCell(row, col);
      const enemies = units.filter(u => u.type === 'enemy' && u.isAlive());
      const players = units.filter(u => u.type === 'player' && u.isAlive());
      if (enemies.length && players.length) {
        // Assign each player and enemy a target from the other group
        for (const player of players) {
          if (!player.inBattle) {
            player.inBattle = true;
            player.targetId = randomElement(enemies).id;
          }
        }
        for (const enemy of enemies) {
          if (!enemy.inBattle) {
            enemy.inBattle = true;
            enemy.targetId = randomElement(players).id;
          }
        }
      }
    }
  }
}

// Processes battle logic: apply damage, switch targets, exit battle if no enemies remain
function processBattles(grid, gameState = null) {
  for (let col = 1; col < grid.columns - 1; col++) {
    for (let row = 0; row < grid.rows; row++) {
      const units = grid.getUnitsInCell(row, col);
      const enemies = units.filter(u => u.type === 'enemy' && u.isAlive());
      const players = units.filter(u => u.type === 'player' && u.isAlive());
      
      // First pass: collect regular attacks
      const playerAttacks = [];
      const playerAoeAttacks = [];
      const priestHeals = [];
      
      for (const player of players) {
        if (!player.inBattle) continue;
        
        // Handle special unit abilities
        if (player.unitType === 'Priest') {
          // Priest heals all friendly units in the cell
          priestHeals.push({
            healer: player,
            targets: players.filter(p => p.isAlive()) // Heal all alive players including self
          });
        } else if (player.attacksAll) {
          // Unit attacks all enemy units in the cell
          playerAoeAttacks.push({
            attacker: player,
            targets: enemies.filter(e => e.isAlive()) // Attack all alive enemies
          });
        } else {
          // Regular single-target attack
          const target = enemies.find(e => e.id === player.targetId && e.isAlive());
          if (target) {
            playerAttacks.push({ attacker: player, target });
          }
        }
      }
      
      const enemyAttacks = [];
      const enemyAoeAttacks = [];
      const berserkerHeals = [];
      
      for (const enemy of enemies) {
        if (!enemy.inBattle) continue;
        
        // Handle special enemy abilities
        if (enemy.attacksAll) {
          // Enemy attacks all player units in the cell
          enemyAoeAttacks.push({
            attacker: enemy,
            targets: players.filter(p => p.isAlive()) // Attack all alive players
          });
        } else {
          // Regular single-target attack
          const target = players.find(p => p.id === enemy.targetId && p.isAlive());
          if (target) {
            enemyAttacks.push({ attacker: enemy, target });
            
            // Track berserkers for self-healing after attack
            if (enemy.subtype === 'berserker' && enemy.selfHealPercent) {
              berserkerHeals.push({
                berserker: enemy,
                healAmount: Math.floor(enemy.damage * enemy.selfHealPercent)
              });
            }
          }
        }
      }
      
      // Second pass: apply all effects
      
      // Apply regular player attacks
      for (const { attacker, target } of playerAttacks) {
        const damage = calculateDamage(attacker.damage, attacker, gameState);
        target.takeDamage(damage);
      }
      
      // Apply player AoE attacks
      for (const { attacker, targets } of playerAoeAttacks) {
        const damage = calculateDamage(attacker.damage, attacker, gameState);
        for (const target of targets) {
          target.takeDamage(damage);
        }
      }
      
      // Apply Priest healing
      for (const { healer, targets } of priestHeals) {
        // Get heal amount from unit config (default to 8 if not found)
        const healAmount = healer.healAmount || 8;
        for (const target of targets) {
          // Heal but don't exceed max health
          target.health = Math.min(target.maxHealth, target.health + healAmount);
        }
      }
      
      // Apply enemy attacks
      for (const { attacker, target } of enemyAttacks) {
        target.takeDamage(attacker.damage);
      }
      
      // Apply enemy AoE attacks
      for (const { attacker, targets } of enemyAoeAttacks) {
        for (const target of targets) {
          target.takeDamage(attacker.damage);
        }
      }
      
      // Apply Berserker self-healing (after attacking)
      for (const { berserker, healAmount } of berserkerHeals) {
        // Heal but don't exceed max health
        berserker.health = Math.min(berserker.maxHealth, berserker.health + healAmount);
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
            player.targetId = randomElement(aliveEnemies).id;
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
            enemy.targetId = randomElement(alivePlayers).id;
          }
        }
      }
    }
  }
}

export { checkAndStartBattles, processBattles };

