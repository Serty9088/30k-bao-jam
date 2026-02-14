import { system, world } from "@minecraft/server";
import * as f from "../functions.js";
import { LuckyEventType } from "../main.js";

LuckyEventType.register({
    id: 'quantumJellyfish',
    callback: (event => {
        const amount = f.Random.int(2, 10);

        for (let i = 0; i < amount; i++) {
            const entity = event.dimension.spawnEntity('bao_30k_pentacore:quantum_jellyfish', event.block.center());

            const vector = f.Random.vector({ y: [0, 1] });
            const rotation = f.Vector.toAngles(vector); entity.setProperty('bao_30k_pentacore:rotation_x', rotation.x); entity.setProperty('bao_30k_pentacore:rotation_y', rotation.y);
            entity.applyImpulse(vector); entity.triggerEvent('bao_30k_pentacore:quantum_jellyfish_move');
        }
    })
});

world.afterEvents.dataDrivenEntityTrigger.subscribe(async data => {
    const entity = data.entity;
    if (!entity.isValid) return;

    
    if (data.eventId == 'bao_30k_pentacore:quantum_jellyfish_move') {
        const groundBlock = entity.dimension.getBlockFromRay(entity.location, { x: 0, y: -1, z: 0 }, { maxDistance: 256, includeLiquidBlocks: true })?.block;
        const distanceToGround = Math.min(f.Geo.distance(entity.location, groundBlock || { ...entity.location, y: 9999 }), 256);

        for (let i = 0; i < 20; i++) {
            await system.waitTicks(1);
            if (!entity.isValid) return;

            const vector = f.Random.vector();
            if (distanceToGround > 15) vector.y = -distanceToGround/256;
            else if (distanceToGround < 5) vector.y = (5-distanceToGround)/5;

            const raycast = entity.dimension.getBlockFromRay(entity.location, vector, { maxDistance: 7, includeLiquidBlocks: true });
            if (raycast != undefined && i < 19) continue;

            const rotation = f.Vector.toAngles(vector); entity.setProperty('bao_30k_pentacore:rotation_x', rotation.x); entity.setProperty('bao_30k_pentacore:rotation_y', rotation.y);
            entity.playAnimation('animation.quantum_jellyfish.move');
            await system.waitTicks(32);

            if (!entity.isValid) return;
            entity.applyImpulse(f.Vector.multiply(f.Vector.normalize(vector), f.Random.float(0.8, 1.3)));

            break;
        }
    }
});