import { BlockPermutation, BlockVolume, StructureAnimationMode, StructureSaveMode, system, world } from "@minecraft/server";
import * as f from "../functions.js";
import { LuckyEventType } from "../main.js";

LuckyEventType.register({
    id: 'reversedWorld',
    callback: (async event => {
        const size = f.Random.int(15, 25);
        const offset = { x: size, z: size };
        const structures = [];

        const lightBlockPermutations = Array.from({ length: 15 }, ((_, i) => BlockPermutation.resolve('light_block_' + (i+1))));

        for (let i = -size+0; i <= size; i++) {
            const name = 'pentacore:reversed_world_' + i;
            world.structureManager.delete(name);

            const volume = new BlockVolume(
                f.Vector.sum(f.Vector.subtract(event.blockLocation, offset), { y: i }),
                f.Vector.sum(event.blockLocation, { ...offset, y: i })
            );

            const volumeMin = volume.getMin();
            const structure = world.structureManager.createFromWorld(
                name, event.dimension, volumeMin, volume.getMax(),
                {
                    includeEntities: false,
                    saveMode: StructureSaveMode.Memory
                }
            );

            const radius = Math.floor(Math.sqrt(size*size - i*i));
            for (const location of volume.getBlockLocationIterator()) {
                if (f.Geo.distance(location, event.blockLocation) > radius) {
                    structure.setBlockPermutation(f.Vector.subtract(location, volumeMin), undefined);
                } else {
                    try {
                        const block = event.dimension.getBlock(location);

                        const lightLevel = block.getLightLevel();
                        if (block.typeId == 'minecraft:air' && lightLevel > 0) structure.setBlockPermutation(
                            f.Vector.subtract(location, volumeMin),
                            lightBlockPermutations[lightLevel-1]
                        );

                        block.setType('air');
                    } catch {};
                }
            }

            structures.push(structure);
            await system.waitTicks(1);
        }

        await system.waitTicks(1);

        const placeLocation = f.Vector.subtract(event.blockLocation, offset);
        for (let i = -size+0; i <= size; i++) {
            const structure = structures[-i+size];
            world.structureManager.place(structure, event.dimension, f.Vector.sum(placeLocation, { y: i+size }));
            await system.waitTicks(1);
        }

        event.player.sendMessage('§2Welcome to the upside down world')
    })
});