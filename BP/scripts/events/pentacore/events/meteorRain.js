import { system } from "@minecraft/server";
import * as f from "../functions.js";
import { LuckyEventType } from "../main.js";

/** @type {WeakMap<import('@minecraft/server').Player, Number>} */
const meteorRainTimeMap = new WeakMap();
const rainTime = 20*15;

LuckyEventType.register({
    id: 'meteorRain',
    callback: (async event => {
        const player = event.player;

        player.sendMessage('§6Current forecast: Heavy rainfall with a high probability of meteors.');

        const rainEndTime = meteorRainTimeMap.get(player);
        meteorRainTimeMap.set(player, Math.max(rainEndTime || 0, system.currentTick)+rainTime);
        if (rainEndTime >= system.currentTick) return;

        const runId = system.runInterval(() => {
            try {
                if (!player.isValid || meteorRainTimeMap.get(player) < system.currentTick) return system.clearRun(runId);

                const location = f.Random.location({ x: 20, z: 20 }, player.location);
                const topMost = player.dimension.getTopmostBlock(location);
                location.y = Math.min(player.dimension.heightRange.max, Math.max(topMost.y, player.location.y)+50);

                const entity = player.dimension.spawnEntity('bao_30k_pentacore:meteor', location);
                const projectile = entity.getComponent('projectile');
                projectile.shoot(f.Vector.multiply(f.Geo.getDirection3D(entity.location, player.location), f.Random.float(0.8, 1.5)), {
                    uncertainty: 45
                });
            } catch(e) {
                console.error(e);
                system.clearRun(runId);
            }
        }, 5);
    })
});