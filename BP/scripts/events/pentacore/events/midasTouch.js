import * as f from "../functions.js";
import { world, system } from "@minecraft/server";
import { LuckyEventType } from "../main.js";

LuckyEventType.register({
    id: 'MidasTouch',
    callback: (event => { // callback is the name of the property that describes the function
        const player = event.player;

        const dim = player.dimension
        player.midasTouch = system.currentTick; world.sendMessage(`${player.name} has the §gMidas Touch!`)

        function particleAndSound(loc) {
            dim.spawnParticle('minecraft:ice_evaporation_emitter', loc); dim.playSound('dig.stone', loc, { pitch: 1.20 })
        }

        const midasTick = system.runInterval(() => {
            for (const player of world.getAllPlayers()) {

                if (player.midasTouch !== undefined) {
                    const timeLeft = system.currentTick - player.midasTouch
                    const block = player.getBlockStandingOn()
                    if (block) {
                        if (block.typeId !== 'minecraft:gold_block') {
                            block.setType('minecraft:gold_block')
                            particleAndSound(block?.center())
                        }
                    }
                    if (timeLeft >= 20 * 20) {
                        player.midasTouch = undefined
                        system.clearRun(midasTick);
                        world.afterEvents.entityHitEntity.unsubscribe(hitEntity)
                        world.afterEvents.entityHitBlock.unsubscribe(hitBlock)
                        world.sendMessage(`${player.name} no longer has the §gMidas Touch!`)
                    }

                }
            }
        }, 5)

        const hitEntity = world.afterEvents.entityHitEntity.subscribe(({ hitEntity: target, damagingEntity: attacker }) => {
            if (!target.isValid || !attacker.isValid) return;

            if (attacker.midasTouch !== undefined && target.typeId !== 'minecraft:player') {
                particleAndSound(target.location)
                attacker.dimension.getBlock(target.location).setType('minecraft:gold_block')
                target.remove();
            }

        }, { entityTypes: ['minecraft:player'] })

        const hitBlock = world.afterEvents.entityHitBlock.subscribe(({ hitBlock: block, damagingEntity: entity }) => {

            if (entity.midasTouch !== undefined && block.typeId !== 'minecraft:player') {
                if (block.typeId !== 'minecraft:gold_block') {
                    particleAndSound(block.center())
                    block.setType('minecraft:gold_block')
                }
            }

        }, { entityTypes: ['minecraft:player'] })

    })
});
