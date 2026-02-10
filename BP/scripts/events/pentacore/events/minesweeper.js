import { world, system, BlockPermutation, ItemStack } from "@minecraft/server";
import { LuckyEventType } from "../main.js";

const gamesSaveKey = "bao_30k_pentacore:minesweeper_games";
const playerSaveKey = "bao_30k_pentacore:minesweeper_players";
const debug = false;
const activeGames = new Map();
const savedPlayers = {};

class MinesweeperGame {
    constructor(ownerPlayerId, dimension, min, max, rows, cols, mines) {
        this.owner = ownerPlayerId;
        this.dimension = dimension;
        this.min = min;
        this.max = max;
        this.ROWS = rows;
        this.COLS = cols;
        this.minesTotal = mines;
        this.firstClick = true;
        this.gameOver = false;
        this.gameWon = false;
    }

    getBlock(row, col) {
        const dim = world.getDimension(this.dimension);
        const loc = {
            x: this.min.x + col,
            y: this.min.y,
            z: this.min.z + row
        };
        return dim.getBlock(loc);
    }

    isMine(row, col) {
        const block = this.getBlock(row, col);
        if (!block) return false;
        return !!block.permutation.getState("bao_30k_pentacore:is_mine");
    }

    isRevealed(row, col) {
        const block = this.getBlock(row, col);
        if (!block) return false;
        const adjacentMines = block.permutation.getState("bao_30k_pentacore:adjacent_mines");
        return adjacentMines >= 1 && adjacentMines <= 9;
    }

    isFlagged(row, col) {
        const block = this.getBlock(row, col);
        if (!block) return false;
        return block.permutation.getState("bao_30k_pentacore:is_flagged") === true;
    }

    getNeighbors(row, col) {
        const dirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        return dirs
            .map(([dr, dc]) => [row + dr, col + dc])
            .filter(([nr, nc]) => nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS);
    }

    placeMines(excludeR, excludeC) {
        const excludeArea = new Set();

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = excludeR + dr;
                const nc = excludeC + dc;
                if (nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS) {
                    excludeArea.add(`${nr},${nc}`);
                }
            }
        }

        let placed = 0;
        const rng = () => Math.floor(Math.random() * this.ROWS);
        while (placed < this.minesTotal) {
            const r = Math.floor(Math.random() * this.ROWS);
            const c = Math.floor(Math.random() * this.COLS);
            const key = `${r},${c}`;

            if (!this.isMine(r, c) && !excludeArea.has(key)) {
                const block = this.getBlock(r, c);
                if (block) {
                    let permutation = block.permutation;
                    permutation = permutation.withState("bao_30k_pentacore:is_mine", true);
                    block.setPermutation(permutation);
                    placed++;
                }
            }
        }
    }

    countAdjacentMines(row, col) {
        return this.getNeighbors(row, col)
            .filter(([nr, nc]) => this.isMine(nr, nc)).length;
    }

    findZeroCell(preferredR, preferredC) {
        const candidates = [];

        for (let radius = 0; radius < Math.max(this.ROWS, this.COLS); radius++) {
            for (let dr = -radius; dr <= radius; dr++) {
                for (let dc = -radius; dc <= radius; dc++) {
                    const r = preferredR + dr;
                    const c = preferredC + dc;

                    if (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS) {
                        if (!this.isMine(r, c) && this.countAdjacentMines(r, c) === 0) {
                            const distance = Math.abs(dr) + Math.abs(dc);
                            candidates.push({ r, c, distance });
                        }
                    }
                }
            }

            if (candidates.length > 0) {
                candidates.sort((a, b) => a.distance - b.distance);
                return candidates[0];
            }
        }

        return null;
    }

    reveal(row, col, delay = 0) {
        if (row < 0 || row >= this.ROWS || col < 0 || col >= this.COLS) return;
        if (this.isRevealed(row, col) || this.isFlagged(row, col)) return;

        const block = this.getBlock(row, col);
        if (!block) return;

        if (this.isMine(row, col)) {
            this.gameOver = true;
            system.runTimeout(() => { this.revealAllMines(); }, delay);
            return;
        }

        const adjacentMines = this.countAdjacentMines(row, col);
        let permutation = block.permutation;
        const revealState = adjacentMines === 0 ? 9 : adjacentMines;
        permutation = permutation.withState("bao_30k_pentacore:adjacent_mines", revealState);
        block.setPermutation(permutation);

        const dim = world.getDimension(this.dimension);
        if (adjacentMines === 0) {
            dim.playSound("dig.stone", block.location, { pitch: 1.2, volume: 0.3 });
        } else {
            dim.playSound("random.stone_click", block.location, { pitch: 1 + (adjacentMines * 0.1), volume: 0.4 });
        }

        if (adjacentMines === 0) {
            const neighbors = this.getNeighbors(row, col);
            for (const [nr, nc] of neighbors) {
                if (!this.isRevealed(nr, nc) && !this.isFlagged(nr, nc)) {
                    this.reveal(nr, nc, 0);
                }
            }
        }

        this.checkWin();
    }

    revealAllMines(delay = 0) {
        let mineIndex = 0;
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.isMine(r, c)) {
                    const block = this.getBlock(r, c);
                    if (block) {
                        system.runTimeout(() => {
                            let permutation = block.permutation;
                            permutation = permutation.withState("bao_30k_pentacore:adjacent_mines", 9);
                            permutation = permutation.withState("bao_30k_pentacore:is_flagged", false);

                            const dim = world.getDimension(this.dimension);
                            dim.playSound("random.fuse", block.location, { pitch: 0.8 + (Math.random() * 0.4), volume: 0.6 });

                            let state = false;
                            for (let i = 0; i < 8; i++) {
                                system.runTimeout(() => {
                                    permutation = permutation.withState("bao_30k_pentacore:exploded", state);
                                    block.setPermutation(permutation);
                                    state = !state;

                                    if (i === 7) {
                                        system.runTimeout(() => {
                                            block.setPermutation(permutation);
                                            dim.playSound("random.explode", block.location, { pitch: 0.8 + (Math.random() * 0.4), volume: 0.6 });
                                        }, 10);
                                    }
                                }, i * 5);
                            }

                        }, delay + mineIndex * 1);
                        mineIndex++;
                    }
                }
            }
        }
    }

    toggleFlag(row, col) {
        if (this.isRevealed(row, col)) return false;
        const block = this.getBlock(row, col);
        if (!block) return false;
        let permutation = block.permutation;
        const isFlagged = permutation.getState("bao_30k_pentacore:is_flagged");
        permutation = permutation.withState("bao_30k_pentacore:is_flagged", !isFlagged);
        block.setPermutation(permutation);
        return true;
    }

    chord(row, col) {
        if (!this.isRevealed(row, col)) return;
        const adjacentMines = this.countAdjacentMines(row, col);
        if (adjacentMines === 0) return;
        const neighbors = this.getNeighbors(row, col);
        const flaggedCount = neighbors.filter(([nr, nc]) => this.isFlagged(nr, nc)).length;
        if (flaggedCount === adjacentMines) {
            for (const [nr, nc] of neighbors) {
                if (!this.isRevealed(nr, nc) && !this.isFlagged(nr, nc)) {
                    this.reveal(nr, nc);
                }
            }
        }
    }

    checkWin() {
        let revealedCount = 0;
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.isRevealed(r, c)) {
                    revealedCount++;
                }
            }
        }
        const safeCells = this.ROWS * this.COLS - this.minesTotal;
        if (revealedCount >= safeCells) {
            this.gameWon = true;
        }
    }

    handleCellClick(row, col) {
        if (this.gameOver || this.gameWon) return false;

        if (this.firstClick) {
            this.placeMines(row, col);
            this.firstClick = false;

            const zeroCell = this.findZeroCell(row, col);
            if (zeroCell) {
                row = zeroCell.r;
                col = zeroCell.c;
            }

            this.reveal(row, col);
            this.chord(row, col);
            return true;
        }

        this.reveal(row, col);
        this.chord(row, col);
        return true;
    }
}

function gameIdFromLocation(dimension, loc) {
    return `${dimension}:${loc.x},${loc.y},${loc.z}`;
}

function isBlockInRegion(block, min, max) {
    const { x, y, z } = block.location;
    return (
        x >= min.x && x <= max.x &&
        y >= min.y && y <= max.y &&
        z >= min.z && z <= max.z
    );
}

function getGameFromBlock(block) {
    for (const [id, game] of activeGames.entries()) {
        if (game.dimension !== block.dimension.id) continue;
        if (isBlockInRegion(block, game.min, game.max)) return game;
    }
    return null;
}

function saveGames() {
    const data = [];
    for (const [id, game] of activeGames.entries()) {
        data.push([id, {
            owner: game.owner,
            dimension: game.dimension,
            min: game.min,
            max: game.max,
            rows: game.ROWS,
            cols: game.COLS,
            mines: game.minesTotal,
            firstClick: game.firstClick,
            gameOver: game.gameOver,
            gameWon: game.gameWon
        }]);
    }
    world.setDynamicProperty(gamesSaveKey, JSON.stringify(data));
    if (debug) console.log("Saved games:", data.length);
}

function loadGames() {
    const raw = world.getDynamicProperty(gamesSaveKey);
    if (!raw) return;
    const entries = JSON.parse(raw);
    activeGames.clear();
    for (const [id, data] of entries) {
        const game = new MinesweeperGame(
            data.owner,
            data.dimension,
            data.min,
            data.max,
            data.rows,
            data.cols,
            data.mines
        );
        game.firstClick = data.firstClick;
        game.gameOver = data.gameOver;
        game.gameWon = data.gameWon;
        activeGames.set(id, game);
    }
    if (debug) console.log("Loaded games:", activeGames.size);
}

function savePlayersToDynamic() {
    world.setDynamicProperty(playerSaveKey, JSON.stringify(savedPlayers));
}

function loadPlayersFromDynamic() {
    const raw = world.getDynamicProperty(playerSaveKey);
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.assign(savedPlayers, data);
    if (debug) console.log("Loaded saved players:", Object.keys(savedPlayers).length);
}

function detectBoard(controllerBlock) {
    const dim = controllerBlock.dimension;
    const origin = controllerBlock.location;

    let west = 0, east = 0, north = 0, south = 0;

    while (dim.getBlock(controllerBlock.west(west + 1))?.typeId === "bao_30k_pentacore:minesweeper") west++;
    while (dim.getBlock(controllerBlock.east(east + 1))?.typeId === "bao_30k_pentacore:minesweeper") east++;
    while (dim.getBlock(controllerBlock.north(north + 1))?.typeId === "bao_30k_pentacore:minesweeper") north++;
    while (dim.getBlock(controllerBlock.south(south + 1))?.typeId === "bao_30k_pentacore:minesweeper") south++;

    return {
        min: {
            x: origin.x - west,
            y: origin.y,
            z: origin.z - north,
        },
        max: {
            x: origin.x + east,
            y: origin.y,
            z: origin.z + south,
        },
    };
}

function createTwoChestsAtBottom(player) {
    const dim = player.dimension;
    const minY = dim.heightRange.min;
    const {x, z} = player.location;
    const y = minY + 1;

    const pos1 = { x, y, z };
    const pos2 = { x: x + 1, y, z };
    const block1 = dim.getBlock(pos1);
    const block2 = dim.getBlock(pos2);

    block1.setPermutation(BlockPermutation.resolve("minecraft:chest"));
    block2.setPermutation(BlockPermutation.resolve("minecraft:chest"));

    return pos1;
}

function putPlayerItemsIntoChests(player, chestPos) {
    if (!chestPos) return false;
    const dim = world.getDimension("minecraft:overworld");
    const chest1 = dim.getBlock(chestPos);
    const chest2 = dim.getBlock({ x: chestPos.x + 1, y: chestPos.y, z: chestPos.z });

    if (!chest1 || !chest2) return false;

    const chest1Comp = chest1.getComponent("minecraft:inventory");
    const chest2Comp = chest2.getComponent("minecraft:inventory");
    const pInvComp = player.getComponent("minecraft:inventory");
    
    if (!chest1Comp || !chest2Comp || !pInvComp) return false;
    
    const chest1Container = chest1Comp.container;
    const chest2Container = chest2Comp.container;
    const pInv = pInvComp.container;
    
    if (!chest1Container || !chest2Container || !pInv) return false;

    let slot = 0;
    for (let i = 0; i < pInv.size; i++) {
        const item = pInv.getItem(i);
        if (item) {
            if (slot < chest1Container.size) {
                chest1Container.setItem(slot, item);
            } else {
                const s2 = slot - chest1Container.size;
                if (s2 < chest2Container.size) chest2Container.setItem(s2, item);
            }
            slot++;
            pInv.setItem(i, undefined);
        }
    }

    const equipComp = player.getComponent("equippable");
    if (equipComp) {
        const equipmentSlots = ["Head", "Chest", "Legs", "Feet", "Offhand"];
        const equipBase = Math.max(0, chest2Container.size - equipmentSlots.length);
        for (let i = 0; i < equipmentSlots.length; i++) {
            const slotName = equipmentSlots[i];
            const item = equipComp.getEquipment(slotName);
            if (item) {
                chest2Container.setItem(equipBase + i, item);
                equipComp.setEquipment(slotName, undefined);
            }
        }
    }

    return true;
}

function restoreItemsFromChestsToPlayer(player, chestPos) {
    if (!chestPos) return false;
    const dim = world.getDimension("minecraft:overworld");
    const chest1 = dim.getBlock(chestPos);
    const chest2 = dim.getBlock({ x: chestPos.x + 1, y: chestPos.y, z: chestPos.z });

    if (!chest1 || !chest2) return false;

    const chest1Comp = chest1.getComponent("minecraft:inventory");
    const chest2Comp = chest2.getComponent("minecraft:inventory");
    const pInvComp = player.getComponent("minecraft:inventory");
    const equipComp = player.getComponent("equippable");

    if (!chest1Comp || !chest2Comp || !pInvComp || !equipComp) return false;
    
    const chest1Container = chest1Comp.container;
    const chest2Container = chest2Comp.container;
    const pInv = pInvComp.container;
    
    if (!chest1Container || !chest2Container || !pInv) return false;

    {
        const equipmentSlots = ["Head", "Chest", "Legs", "Feet", "Offhand"];
        const equipBase = Math.max(0, chest2Container.size - equipmentSlots.length);
        for (let i = 0; i < equipmentSlots.length; i++) {
            const slotName = equipmentSlots[i];
            const item = chest2Container.getItem(equipBase + i);
            if (item) {
                equipComp.setEquipment(slotName, item);
                chest2Container.setItem(equipBase + i, undefined);
            }
        }
    }

    let pSlot = 0;
    for (let i = 0; i < chest1Container.size; i++) {
        const item = chest1Container.getItem(i);
        if (item) {
            while (pSlot < pInv.size && pInv.getItem(pSlot)) pSlot++;
            if (pSlot < pInv.size) {
                pInv.setItem(pSlot++, item);
            }
            chest1Container.setItem(i, undefined);
        }
    }

    const equipmentSlots = ["Head", "Chest", "Legs", "Feet", "Offhand"];
    const equipBase = Math.max(0, chest2Container.size - equipmentSlots.length);
    for (let i = 0; i < chest2Container.size; i++) {
        if (i >= equipBase) continue;
        const item = chest2Container.getItem(i);
        if (item) {
            while (pSlot < pInv.size && pInv.getItem(pSlot)) pSlot++;
            if (pSlot < pInv.size) {
                pInv.setItem(pSlot++, item);
            }
            chest2Container.setItem(i, undefined);
        }
    }

    chest1.setPermutation(BlockPermutation.resolve("minecraft:air"));
    chest2.setPermutation(BlockPermutation.resolve("minecraft:air"));

    return true;
}

function savePlayerStateMeta(player, originalLocation) {
    const chestPos = createTwoChestsAtBottom(player);
    const saved = {
        dimension: originalLocation.dimension || player.dimension.id,
        location: { x: originalLocation.x, y: originalLocation.y, z: originalLocation.z },
        chestPos: chestPos,
        timestamp: Date.now(),
        gameId: null
    };

    putPlayerItemsIntoChests(player, chestPos);

    savedPlayers[player.id] = saved;
    savePlayersToDynamic();

    if (debug) console.log(`Saved player ${player.name} to chests at`, chestPos);
}

function restorePlayerStateMeta(playerId, won = false) {
    const meta = savedPlayers[playerId];
    if (!meta) return false;
    const player = [...world.getPlayers()].find(p => p.id === playerId);
    if (!player) {
        if (debug) console.log("Player not online during restore:", playerId);
        return false;
    }

    
    system.runTimeout(() => {
        restoreItemsFromChestsToPlayer(player, meta.chestPos);
        const dim = world.getDimension(meta.dimension);
        player.teleport(meta.location, { dimension: dim });
    }, 85);

    if (won) {
        rewardPlayer(player);
    }

    delete savedPlayers[playerId];
    savePlayersToDynamic();
    return true;
}

function rewardPlayer(player) {
    player.sendMessage("§6Minesweeper Master! You are rewarded.");
    const invComp = player.getComponent("minecraft:inventory");
    if (!invComp?.container) return;

    const container = invComp.container;
    const diamonds = new ItemStack("minecraft:diamond", 25);

    for (let i = 0; i < container.size; i++) {
        if (!container.getItem(i)) {
            container.setItem(i, diamonds);
            return;
        }
    }

    player.dimension.spawnItem(diamonds, {
        x: player.location.x,
        y: player.location.y + 1,
        z: player.location.z,
    });
}

world.afterEvents.worldLoad.subscribe(() => {
    loadGames();
    loadPlayersFromDynamic();
    if (debug) console.log("World loaded: games and player saves restored");
});

system.runTimeout(() => {
    if (!world.getDynamicProperty(gamesSaveKey)) world.setDynamicProperty(gamesSaveKey, undefined);
    if (!world.getDynamicProperty(playerSaveKey)) world.setDynamicProperty(playerSaveKey, undefined);
}, 1);

LuckyEventType.register({
    id: 'minesweeper',
    callback: (event) => {
        const { block, dimension, player } = event;
        if (!player) return;

        const heightRange = dimension.heightRange;
        const maxY = heightRange.max;

        const structureSpawnLocation = {
            x: block.x,
            y: maxY - 15,
            z: block.z
        };

        const playerSpawnLocation = {
            x: block.x + 12,
            y: maxY - 10,
            z: block.z + 12
        };

        const originalLocation = {
            x: player.location.x,
            y: player.location.y,
            z: player.location.z,
            dimension: player.dimension.id
        };

        savePlayerStateMeta(player, originalLocation);

        world.structureManager.place("bao_30k_pentacore:minesweeper", dimension, structureSpawnLocation);
        player.teleport(playerSpawnLocation);
        player.sendMessage("§6Minesweeper event started!");
        player.sendMessage("§aNote: Your items will be returned to you when you win or lose the game!");
    }
});

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { block, player } = event;
    if (debug) console.log(`Interact event: ${block.typeId}, firstEvent=${event.isFirstEvent}`);
    if (block.typeId !== "bao_30k_pentacore:minesweeper" || !event.isFirstEvent) return;

    system.run(() => {
        let game = getGameFromBlock(block);
        if (!game) {
            // Remove any old game in this region
            for (const [oldId, oldGame] of activeGames.entries()) {
                if (
                    oldGame.dimension === block.dimension.id &&
                    isBlockInRegion(block, oldGame.min, oldGame.max)
                ) {
                    activeGames.delete(oldId);
                }
            }

            const board = detectBoard(block);
            const rows = board.max.z - board.min.z + 1;
            const cols = board.max.x - board.min.x + 1;

            const actualRows = Math.max(rows, 3);
            const actualCols = Math.max(cols, 3);
            const mines = Math.max(1, Math.floor(actualRows * actualCols * 0.15));

            game = new MinesweeperGame(
                player.id,
                block.dimension.id,
                board.min,
                board.max,
                actualRows,
                actualCols,
                mines
            );

            for (let r = 0; r < actualRows; r++) {
                for (let c = 0; c < actualCols; c++) {
                    const blockCell = game.getBlock(r, c);
                    if (blockCell) {
                        let permutation = blockCell.permutation;
                        permutation = permutation.withState("bao_30k_pentacore:is_mine", false);
                        permutation = permutation.withState("bao_30k_pentacore:adjacent_mines", 0);
                        permutation = permutation.withState("bao_30k_pentacore:is_flagged", false);
                        permutation = permutation.withState("bao_30k_pentacore:exploded", false);
                        blockCell.setPermutation(permutation);
                    }
                }
            }

            // Use board.min for consistent game ID
            const id = gameIdFromLocation(block.dimension.id, board.min);
            activeGames.set(id, game);
            saveGames();

            if (debug) console.log(`Starting game at ${id} - ${rows}x${cols} with ${mines} mines`);
        }

        if (player.isSneaking) {
            const isFlagged = block.permutation.getState("bao_30k_pentacore:is_flagged");
            const isNotRevealed = block.permutation.getState("bao_30k_pentacore:adjacent_mines") === 0;
            if (isNotRevealed) {
                block.setPermutation(block.permutation.withState("bao_30k_pentacore:is_flagged", !isFlagged));
                player.dimension.playSound("dig.cloth", block.location, { pitch: isFlagged ? 0.5 : 1, volume: 1 });
            }
            if (debug) console.log(`Flagging cell: ${isFlagged}`);
            return;
        }

        const row = block.location.z - game.min.z;
        const col = block.location.x - game.min.x;
        if (debug) console.log(`Click at row: ${row}, col: ${col}`);

        if (row < 0 || row >= game.ROWS || col < 0 || col >= game.COLS) return;

        const handled = game.handleCellClick(row, col);
        player.dimension.playSound("random.stone_click", block.location, { pitch: 1, volume: 1 });
        if (debug) console.log(`Click handled: ${handled}, firstClick: ${game.firstClick}`);

        if (handled) {
            if (game.gameOver) {
                player.sendMessage("§cGame Over! You hit a mine!");
                if (game.owner) restorePlayerStateMeta(game.owner, false);

                const id = gameIdFromLocation(game.dimension, game.min);
                activeGames.delete(id);
                
                // Remove this game from saved data
                const rawGames = world.getDynamicProperty(gamesSaveKey);
                if (rawGames) {
                    const games = JSON.parse(rawGames);
                    const filteredGames = games.filter(([gameId]) => gameId !== id);
                    world.setDynamicProperty(gamesSaveKey, JSON.stringify(filteredGames));
                }
                
                // Remove this player's save data
                if (game.owner && savedPlayers[game.owner]) {
                    delete savedPlayers[game.owner];
                    world.setDynamicProperty(playerSaveKey, JSON.stringify(savedPlayers));
                }
                
                return;
            } else if (game.gameWon) {
                player.sendMessage("§a Victory! You won!");
                if (game.owner) restorePlayerStateMeta(game.owner, true);

                const id = gameIdFromLocation(game.dimension, game.min);
                activeGames.delete(id);
                
                // Remove this game from saved data
                const rawGames = world.getDynamicProperty(gamesSaveKey);
                if (rawGames) {
                    const games = JSON.parse(rawGames);
                    const filteredGames = games.filter(([gameId]) => gameId !== id);
                    world.setDynamicProperty(gamesSaveKey, JSON.stringify(filteredGames));
                }
                
                // Remove this player save data
                if (game.owner && savedPlayers[game.owner]) {
                    delete savedPlayers[game.owner];
                    world.setDynamicProperty(playerSaveKey, JSON.stringify(savedPlayers));
                }
                
                return;
            } else {
                saveGames();
            }
        }
    });
});
