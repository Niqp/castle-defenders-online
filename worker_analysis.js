// Worker Economics Analysis for Castle Defenders
// This script analyzes the price-to-value ratio of workers and runs gameplay simulations

const WORKER_TYPES = {
  // Gold generation
  Miner:    { costs: { gold: 40 },   outputs: { gold: 1.5 },  sprite: 'miner.png' },
  Digger:   { costs: { gold: 120 },  outputs: { gold: 3 },    sprite: 'digger.png' },
  Excavator:{ costs: { gold: 400 },  outputs: { gold: 8 },    sprite: 'excavator.png' },
  
  // Food generation
  Farmer:   { costs: { gold: 35 },   outputs: { food: 1.5 },  sprite: 'farmer.png' },
  Hunter:   { costs: { gold: 100 },  outputs: { food: 3 },    sprite: 'hunter.png' },
  Rancher:  { costs: { gold: 350 },  outputs: { food: 8 },    sprite: 'rancher.png' },
};

const UNIT_TYPES = {
  Swordsman: { costs: { gold: 25, food: 8 }, hp: 50, dmg: 6 },
  Archer: { costs: { gold: 40, food: 15 }, hp: 35, dmg: 8 },
  Knight: { costs: { gold: 100, food: 35 }, hp: 140, dmg: 18 },
};

const STARTING_RESOURCES = { gold: 10, food: 5 };
const WORKER_INTERVAL = 1000; // 1 second
const WAVE_INTERVAL = 45000; // 45 seconds
const MANUAL_MINE_BASE = 1; // Base manual mining per click

class WorkerAnalysis {
  constructor() {
    this.results = {};
  }

  // Calculate basic efficiency metrics
  calculateBasicEfficiency() {
    console.log("=== BASIC WORKER EFFICIENCY ANALYSIS ===\n");
    
    const efficiencyData = [];
    
    for (const [workerType, config] of Object.entries(WORKER_TYPES)) {
      const cost = config.costs.gold;
      const resourceType = Object.keys(config.outputs)[0];
      const output = config.outputs[resourceType];
      
      const costPerOutput = cost / output;
      const paybackTime = cost / output; // seconds to break even
      const efficiencyRatio = output / cost;
      
      const data = {
        worker: workerType,
        cost,
        output: `${output} ${resourceType}/s`,
        costPerOutput: costPerOutput.toFixed(2),
        paybackTime: `${paybackTime.toFixed(1)}s`,
        efficiencyRatio: efficiencyRatio.toFixed(4),
        resourceType
      };
      
      efficiencyData.push(data);
      
      console.log(`${workerType}:`);
      console.log(`  Cost: ${cost} gold`);
      console.log(`  Output: ${output} ${resourceType}/s`);
      console.log(`  Cost per output: ${costPerOutput.toFixed(2)} gold per ${resourceType}/s`);
      console.log(`  Payback time: ${paybackTime.toFixed(1)} seconds`);
      console.log(`  Efficiency ratio: ${efficiencyRatio.toFixed(4)} ${resourceType}/s per gold`);
      console.log();
    }
    
    // Sort by efficiency ratio
    const goldWorkers = efficiencyData.filter(w => w.resourceType === 'gold').sort((a, b) => b.efficiencyRatio - a.efficiencyRatio);
    const foodWorkers = efficiencyData.filter(w => w.resourceType === 'food').sort((a, b) => b.efficiencyRatio - a.efficiencyRatio);
    
    console.log("GOLD WORKERS (by efficiency):");
    goldWorkers.forEach((w, i) => console.log(`  ${i+1}. ${w.worker}: ${w.efficiencyRatio} gold/s per gold spent`));
    
    console.log("\nFOOD WORKERS (by efficiency):");
    foodWorkers.forEach((w, i) => console.log(`  ${i+1}. ${w.worker}: ${w.efficiencyRatio} food/s per gold spent`));
    
    return { goldWorkers, foodWorkers };
  }

  // Calculate efficiency with upgrades
  calculateUpgradeEfficiency() {
    console.log("\n=== WORKER EFFICIENCY WITH UPGRADES ===\n");
    
    const scenarios = [
      { name: "No Upgrades", productivity: 1.0, costReduction: 1.0, coopBonus: 1.0 },
      { name: "Productivity Lv1", productivity: 1.2, costReduction: 1.0, coopBonus: 1.0 },
      { name: "Productivity Lv3", productivity: 1.6, costReduction: 1.0, coopBonus: 1.0 },
      { name: "Productivity Lv5", productivity: 2.0, costReduction: 1.0, coopBonus: 1.0 },
      { name: "Cost Reduction Lv3", productivity: 1.0, costReduction: 0.55, coopBonus: 1.0 },
      { name: "Prod Lv3 + Cost Lv3", productivity: 1.6, costReduction: 0.55, coopBonus: 1.0 },
      { name: "4-Player Coop", productivity: 1.0, costReduction: 1.0, coopBonus: 1.3 },
      { name: "Max Upgrades + 4P", productivity: 2.0, costReduction: 0.55, coopBonus: 1.3 },
    ];
    
    for (const scenario of scenarios) {
      console.log(`${scenario.name}:`);
      
      for (const [workerType, config] of Object.entries(WORKER_TYPES)) {
        const baseCost = config.costs.gold;
        const baseOutput = Object.values(config.outputs)[0];
        const resourceType = Object.keys(config.outputs)[0];
        
        // Apply cost reduction only to relevant workers
        const isGoldWorker = resourceType === 'gold';
        const isFoodWorker = resourceType === 'food';
        const costReduction = (isGoldWorker || isFoodWorker) ? scenario.costReduction : 1.0;
        
        const actualCost = Math.ceil(baseCost * costReduction);
        const actualOutput = baseOutput * scenario.productivity * scenario.coopBonus;
        const efficiencyRatio = actualOutput / actualCost;
        const paybackTime = actualCost / actualOutput;
        
        console.log(`  ${workerType}: ${actualCost}g → ${actualOutput.toFixed(2)} ${resourceType}/s (ratio: ${efficiencyRatio.toFixed(4)}, payback: ${paybackTime.toFixed(1)}s)`);
      }
      console.log();
    }
  }

  // Simulate resource accumulation over time
  simulateResourceGrowth() {
    console.log("\n=== RESOURCE GROWTH SIMULATION ===\n");
    
    const scenarios = [
      { name: "Pure Manual Mining (1 click/sec)", workers: {}, manualRate: 1 },
      { name: "1 Miner", workers: { Miner: 1 }, manualRate: 0 },
      { name: "2 Miners", workers: { Miner: 2 }, manualRate: 0 },
      { name: "1 Digger", workers: { Digger: 1 }, manualRate: 0 },
      { name: "1 Excavator", workers: { Excavator: 1 }, manualRate: 0 },
      { name: "Mixed Economy", workers: { Miner: 2, Farmer: 1 }, manualRate: 0 },
      { name: "Late Game", workers: { Excavator: 2, Rancher: 1 }, manualRate: 0 },
    ];
    
    for (const scenario of scenarios) {
      console.log(`${scenario.name}:`);
      
      const result = this.runResourceSimulation(scenario.workers, scenario.manualRate, 300); // 5 minutes
      
      console.log(`  Time to first Swordsman (25g, 8f): ${result.timeToFirstSwordsman}s`);
      console.log(`  Time to first Archer (40g, 15f): ${result.timeToFirstArcher}s`);
      console.log(`  Time to first Knight (100g, 35f): ${result.timeToFirstKnight}s`);
      console.log(`  Resources after 60s: ${result.resourcesAt60.gold.toFixed(1)}g, ${result.resourcesAt60.food.toFixed(1)}f`);
      console.log(`  Resources after 180s: ${result.resourcesAt180.gold.toFixed(1)}g, ${result.resourcesAt180.food.toFixed(1)}f`);
      console.log(`  Units affordable after 180s: ${result.unitsAffordableAt180}`);
      console.log();
    }
  }

  runResourceSimulation(workers, manualRate, duration) {
    let gold = STARTING_RESOURCES.gold;
    let food = STARTING_RESOURCES.food;
    
    // Calculate initial worker costs
    let totalWorkerCost = 0;
    for (const [workerType, count] of Object.entries(workers)) {
      totalWorkerCost += WORKER_TYPES[workerType].costs.gold * count;
    }
    
    // Check if we can afford the workers
    if (totalWorkerCost > gold) {
      return {
        timeToFirstSwordsman: "Never (can't afford workers)",
        timeToFirstArcher: "Never (can't afford workers)",
        timeToFirstKnight: "Never (can't afford workers)",
        resourcesAt60: { gold: 0, food: 0 },
        resourcesAt180: { gold: 0, food: 0 },
        unitsAffordableAt180: 0
      };
    }
    
    // Deduct worker costs
    gold -= totalWorkerCost;
    
    let timeToFirstSwordsman = null;
    let timeToFirstArcher = null;
    let timeToFirstKnight = null;
    let resourcesAt60 = null;
    let resourcesAt180 = null;
    
    // Simulate second by second
    for (let t = 0; t <= duration; t++) {
      // Worker income
      for (const [workerType, count] of Object.entries(workers)) {
        const config = WORKER_TYPES[workerType];
        for (const [resource, amount] of Object.entries(config.outputs)) {
          if (resource === 'gold') gold += amount * count;
          if (resource === 'food') food += amount * count;
        }
      }
      
      // Manual mining
      gold += manualRate * MANUAL_MINE_BASE;
      
      // Check unit affordability
      if (!timeToFirstSwordsman && gold >= 25 && food >= 8) {
        timeToFirstSwordsman = t;
      }
      if (!timeToFirstArcher && gold >= 40 && food >= 15) {
        timeToFirstArcher = t;
      }
      if (!timeToFirstKnight && gold >= 100 && food >= 35) {
        timeToFirstKnight = t;
      }
      
      // Record snapshots
      if (t === 60) resourcesAt60 = { gold, food };
      if (t === 180) resourcesAt180 = { gold, food };
    }
    
    // Calculate units affordable at 180s
    const unitsAffordableAt180 = this.calculateAffordableUnits(resourcesAt180.gold, resourcesAt180.food);
    
    return {
      timeToFirstSwordsman: timeToFirstSwordsman || "Never",
      timeToFirstArcher: timeToFirstArcher || "Never", 
      timeToFirstKnight: timeToFirstKnight || "Never",
      resourcesAt60: resourcesAt60,
      resourcesAt180: resourcesAt180,
      unitsAffordableAt180
    };
  }

  calculateAffordableUnits(gold, food) {
    let totalValue = 0;
    
    // Calculate how many of each unit we could afford
    const swordsmenAffordable = Math.min(Math.floor(gold / 25), Math.floor(food / 8));
    const archersAffordable = Math.min(Math.floor(gold / 40), Math.floor(food / 15));
    const knightsAffordable = Math.min(Math.floor(gold / 100), Math.floor(food / 35));
    
    // Use a simple value calculation (damage * hp as rough unit power)
    const swordsmanValue = 6 * 50; // dmg * hp
    const archerValue = 8 * 35;
    const knightValue = 18 * 140;
    
    return Math.max(
      swordsmenAffordable * swordsmanValue,
      archersAffordable * archerValue,
      knightsAffordable * knightValue
    );
  }

  // Analyze optimal worker progression
  analyzeOptimalProgression() {
    console.log("\n=== OPTIMAL WORKER PROGRESSION ANALYSIS ===\n");
    
    // Start with basic resources and see optimal next purchase
    let gold = STARTING_RESOURCES.gold;
    let food = STARTING_RESOURCES.food;
    let workers = {};
    
    console.log("Starting resources:", gold, "gold,", food, "food");
    console.log("\nOptimal progression (first 5 minutes):");
    
    for (let minute = 0; minute < 5; minute++) {
      console.log(`\nMinute ${minute}:`);
      console.log(`  Current: ${gold.toFixed(1)}g, ${food.toFixed(1)}f`);
      
      // Find best worker to buy next
      const bestWorker = this.findBestWorkerToBuy(gold, food, workers);
      
      if (bestWorker) {
        console.log(`  Best purchase: ${bestWorker.type} (cost: ${bestWorker.cost}g, adds: ${bestWorker.output}/s)`);
        gold -= bestWorker.cost;
        workers[bestWorker.type] = (workers[bestWorker.type] || 0) + 1;
      } else {
        console.log(`  No affordable workers`);
      }
      
      // Simulate 60 seconds of income
      for (let s = 0; s < 60; s++) {
        for (const [workerType, count] of Object.entries(workers)) {
          const config = WORKER_TYPES[workerType];
          for (const [resource, amount] of Object.entries(config.outputs)) {
            if (resource === 'gold') gold += amount * count;
            if (resource === 'food') food += amount * count;
          }
        }
      }
      
      console.log(`  After 60s: ${gold.toFixed(1)}g, ${food.toFixed(1)}f`);
      console.log(`  Workers: ${JSON.stringify(workers)}`);
    }
  }

  findBestWorkerToBuy(gold, food, currentWorkers) {
    let bestOption = null;
    let bestScore = 0;
    
    for (const [workerType, config] of Object.entries(WORKER_TYPES)) {
      const cost = config.costs.gold;
      if (cost > gold) continue; // Can't afford
      
      const resourceType = Object.keys(config.outputs)[0];
      const output = config.outputs[resourceType];
      
      // Score based on efficiency ratio and current needs
      let score = output / cost;
      
      // Boost score if we need this resource type
      if (resourceType === 'food' && food < 20) score *= 2; // Need food for units
      if (resourceType === 'gold' && gold > food * 3) score *= 0.5; // Too much gold relative to food
      
      if (score > bestScore) {
        bestScore = score;
        bestOption = { type: workerType, cost, output: `${output} ${resourceType}`, score };
      }
    }
    
    return bestOption;
  }

  // Analyze competitive scenarios
  analyzeCompetitiveBalance() {
    console.log("\n=== COMPETITIVE BALANCE ANALYSIS ===\n");
    
    console.log("Manual mining vs worker strategies (180 seconds):");
    
    const strategies = [
      { name: "Pure Manual (aggressive)", manual: true, clicksPerSecond: 2 },
      { name: "Pure Manual (moderate)", manual: true, clicksPerSecond: 1 },
      { name: "1 Miner + Manual", workers: { Miner: 1 }, clicksPerSecond: 0.5 },
      { name: "2 Miners", workers: { Miner: 2 }, clicksPerSecond: 0 },
      { name: "1 Digger", workers: { Digger: 1 }, clicksPerSecond: 0 },
      { name: "Balanced Economy", workers: { Miner: 1, Farmer: 1 }, clicksPerSecond: 0 },
    ];
    
    const results = [];
    
    for (const strategy of strategies) {
      const result = strategy.manual 
        ? this.simulateManualMining(strategy.clicksPerSecond, 180)
        : this.runResourceSimulation(strategy.workers, strategy.clicksPerSecond, 180);
      
      results.push({
        name: strategy.name,
        gold180: result.resourcesAt180.gold,
        food180: result.resourcesAt180.food,
        totalValue: result.unitsAffordableAt180,
        timeToSwordsman: result.timeToFirstSwordsman
      });
    }
    
    // Sort by total value
    results.sort((a, b) => b.totalValue - a.totalValue);
    
    console.log("\nStrategy rankings by unit value potential:");
    results.forEach((r, i) => {
      console.log(`${i+1}. ${r.name}`);
      console.log(`   Resources: ${r.gold180.toFixed(1)}g, ${r.food180.toFixed(1)}f`);
      console.log(`   Unit value: ${r.totalValue.toFixed(0)}`);
      console.log(`   Time to Swordsman: ${r.timeToSwordsman}s`);
      console.log();
    });
  }

  simulateManualMining(clicksPerSecond, duration) {
    let gold = STARTING_RESOURCES.gold;
    let food = STARTING_RESOURCES.food;
    
    let timeToFirstSwordsman = null;
    let resourcesAt60 = null;
    let resourcesAt180 = null;
    
    for (let t = 0; t <= duration; t++) {
      gold += clicksPerSecond * MANUAL_MINE_BASE;
      
      if (!timeToFirstSwordsman && gold >= 25 && food >= 8) {
        timeToFirstSwordsman = t;
      }
      
      if (t === 60) resourcesAt60 = { gold, food };
      if (t === 180) resourcesAt180 = { gold, food };
    }
    
    const unitsAffordableAt180 = this.calculateAffordableUnits(resourcesAt180.gold, resourcesAt180.food);
    
    return {
      timeToFirstSwordsman: timeToFirstSwordsman || "Never",
      resourcesAt60,
      resourcesAt180,
      unitsAffordableAt180
    };
  }

  // Run all analyses
  runFullAnalysis() {
    console.log("CASTLE DEFENDERS - WORKER ECONOMICS ANALYSIS");
    console.log("=".repeat(50));
    
    this.calculateBasicEfficiency();
    this.calculateUpgradeEfficiency();
    this.simulateResourceGrowth();
    this.analyzeOptimalProgression();
    this.analyzeCompetitiveBalance();
    
    console.log("\n=== RECOMMENDATIONS ===\n");
    this.generateRecommendations();
  }

  generateRecommendations() {
    console.log("Based on the analysis:");
    console.log();
    console.log("BALANCE ISSUES IDENTIFIED:");
    console.log("1. Miner (0.0375 efficiency) vs Farmer (0.0429 efficiency) - Farmer is better value");
    console.log("2. Digger (0.025 efficiency) vs Hunter (0.03 efficiency) - Hunter is better value");  
    console.log("3. Large efficiency jumps between tiers may create stagnant mid-game");
    console.log("4. Manual mining becomes uncompetitive very quickly");
    console.log();
    console.log("SUGGESTED BALANCE CHANGES:");
    console.log("1. Reduce Farmer cost to 30g (makes food workers slightly less efficient than gold)");
    console.log("2. Increase Miner output to 1.7/s (improves early game gold generation)");
    console.log("3. Add intermediate worker tiers or reduce cost gaps");
    console.log("4. Consider manual mining upgrades to keep it relevant longer");
    console.log("5. Balance progression rewards vs immediate efficiency");
  }
}

// Run the analysis
const analysis = new WorkerAnalysis();
analysis.runFullAnalysis(); 