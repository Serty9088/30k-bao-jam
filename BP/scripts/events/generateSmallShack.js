import { world } from "@minecraft/server";

export default function generateSmallShack({ block, dimension }) {
    return world.structureManager.place('bao_30k:small_shack', dimension, block.location);
}