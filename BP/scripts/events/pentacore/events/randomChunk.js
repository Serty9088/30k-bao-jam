import { DimensionTypes, StructureAnimationMode, StructureSaveMode, system, world } from "@minecraft/server";
import * as f from "../functions.js";
import { LuckyEventType } from "../main.js";

LuckyEventType.register({
    id: 'randomChunk',
    callback: (async event => {
        const dimension = world.getDimension(f.Random.element(DimensionTypes.getAll().filter(t => t.typeId != event.block.dimension.id)).typeId);
        const player = event.player; const block = event.block;

        const chunkFrom = { x: Math.floor(block.x/16)*16, y: 0, z: Math.floor(block.z/16)*16 };
        const chunkTo = f.Vector.sum(chunkFrom, { x: 15, y: Math.min(256, dimension.heightRange.max, block.dimension.heightRange.max)-1, z: 15 });
        
        dimension.runCommand('tickingarea remove pentacore:random_chunk_temp');
        dimension.runCommand('tickingarea add ' + Object.values(chunkFrom).join(' ') + ' ' + Object.values(chunkTo).join(' ') + ' pentacore:random_chunk_temp true');
        
        for (let i = 0; i <= 100; i++) {
            await system.waitTicks(10);
            if (dimension.getBlock(chunkFrom) != undefined) break;
        }

        world.structureManager.delete('pentacore:random_chunk_temp');
        const structure = world.structureManager.createFromWorld('pentacore:random_chunk_temp', dimension, chunkFrom, chunkTo, { saveMode: StructureSaveMode.Memory, includeEntities: false });

        world.structureManager.place(structure, block.dimension, chunkFrom, { animationMode: StructureAnimationMode.Layers, animationSeconds: 3 });
        dimension.runCommand('tickingarea remove pentacore:random_chunk_temp');

        player.sendMessage({ rawtext: [{ text: 'A super chunk frooomm... ' },{ translate: dimension.localizationKey },{ text: '!!!' }] });
    })
});