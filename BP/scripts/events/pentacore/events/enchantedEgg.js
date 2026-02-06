import { GameMode, ItemStack, system, world } from "@minecraft/server";
import * as f from "../functions.js";
import { LuckyEventType } from "../main.js";

LuckyEventType.register({
    id: 'enchantedEgg',
    callback: (event => {
        event.dimension.spawnItem(new ItemStack('bao_30k_pentacore:enchanted_egg', f.Random.int(1, 16)), event.block.center());
    })
});

/** @type {WeakSet<import('@minecraft/server').Entity>} */
const EnchantedEggs = new WeakSet();

world.beforeEvents.itemUse.subscribe(data => {
    if (data.itemStack.typeId != 'bao_30k_pentacore:enchanted_egg') return;
    system.run(() => {
        const player = data.source;
        if (!player.isValid) return;
        
        const item = f.getSelected(player);
        if (item.typeId != 'bao_30k_pentacore:enchanted_egg') return;

        if (player.getGameMode() != GameMode.Creative) f.setSelected(player, f.decrementItem(item));

        const entity = player.dimension.spawnEntity('egg', f.Vector.sum(player.getHeadLocation(), player.getViewDirection()));
        EnchantedEggs.add(entity);

        const projectile = entity.getComponent('projectile');
        projectile.shoot(f.Vector.multiply(player.getViewDirection(), f.Random.float(1.3, 1.6)), { uncertainty: 5 });
    });
});

/** @param {import('@minecraft/server').ProjectileHitEntityAfterEvent | import('@minecraft/server').ProjectileHitBlockAfterEvent} event */
function hitFunction(event) {
    if (!EnchantedEggs.has(event.projectile)) return;

    const dimension = event.dimension;
    const location = event.location;
    const amount = f.Random.int(5, 25);
    
    for (let i = 0; i < amount; i++) {
        const entity = dimension.spawnEntity('chicken', location);
        entity.applyImpulse(f.Vector.multiply(f.Vector.sum({ y: 4 }, f.Random.vector({ x: 0.3, y: 0, z: 0.3 })), f.Random.float(0.3, 0.6)));
    }
}

world.afterEvents.projectileHitBlock.subscribe(hitFunction);
world.afterEvents.projectileHitEntity.subscribe(hitFunction);