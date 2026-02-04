import { ItemStack } from "@minecraft/server";

export default function spawnDiamond({ block, dimension }) {
    return dimension.spawnItem(new ItemStack('minecraft:diamond', 1), block.center());
}