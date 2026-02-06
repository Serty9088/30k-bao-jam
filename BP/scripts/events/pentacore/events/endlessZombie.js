import { world } from "@minecraft/server";
import * as f from "../functions.js";
import { LuckyEventType } from "../main.js";

LuckyEventType.register({
    id: 'endlessZombie',
    callback: (event => {
        spawnZombie(event.dimension, event.block.bottomCenter(), f.Random.int(5, 10));
    })
});

/** @param {import('@minecraft/server').Dimension} dimension @param {import('@minecraft/server').Vector3} location */
function spawnZombie(dimension, location, subZombiesCount = 0) {
    const entity = dimension.spawnEntity('zombie', location);
    entity.addEffect('fire_resistance', 9999999, { showParticles: false });
    entity.setDynamicProperty('pentacore:subZombiesCount', subZombiesCount);
    return entity;
}

world.afterEvents.entityHitEntity.subscribe(data => {
    if (data.hitEntity.typeId != 'minecraft:zombie' || !data.hitEntity.isValid) return;
    
    const count = data.hitEntity.getDynamicProperty('pentacore:subZombiesCount') || 0;
    if (!count) return;

    data.hitEntity.setDynamicProperty('pentacore:subZombiesCount', count-1);
    const entity = spawnZombie(data.hitEntity.dimension, data.hitEntity.location, Math.floor(count/2));
    entity.applyImpulse(data.hitEntity.getVelocity());
});