import { Dimension, world, ItemStack, BlockPermutation } from "@minecraft/server";
import { LuckyEventType } from "../main.js";
import { StructureDetector } from "../utils/structureDetector.js";

const detector = new StructureDetector(
    {
        "*": undefined,
        "a": "minecraft:air",
        "s": "minecraft:gold_block",
        "p": "minecraft:piglin_head"
    },
    [
        ["asa"],
        ["sss"],
        ["ppp"]
    ],
    (dimension, location, rotation, actualLocation) => {
        dimension.spawnEntity("bao_30k_pentacore:lord_placeholder", actualLocation, { initialRotation: rotation.y + 180 });
    }
);

LuckyEventType.register({
    id: "lord_placeholder",
    callback: (event => {
        const { dimension, block, player } = event;

        const headItemStack = new ItemStack("minecraft:piglin_head");

        const { x, y, z } = block.location;
        const playerLoc = player.location;

        const dx = playerLoc.x - (x + 0.5);
        const dz = playerLoc.z - (z + 0.5);

        let degrees = Math.atan2(dz, dx) * 180 / Math.PI;
        degrees = (degrees + 450) % 360;

        let xDir = 0;
        let zDir = 0;

        if (degrees >= 45 && degrees < 135) {
            zDir = 1;      // South
        } else if (degrees >= 135 && degrees < 225) {
            xDir = -1;     // West
        } else if (degrees >= 225 && degrees < 315) {
            zDir = -1;     // North
        } else {
            xDir = 1;      // East
        }

        dimension.setBlockType({ x, y, z }, "minecraft:gold_block");
        dimension.setBlockType({ x, y: y + 1, z }, "minecraft:gold_block");

        dimension.setBlockType({ x: x + xDir, y: y + 1, z: z + zDir }, "minecraft:gold_block");
        dimension.setBlockType({ x: x - xDir, y: y + 1, z: z - zDir }, "minecraft:gold_block");

        const head1 = dimension.getBlock({ x: x + xDir, y: y + 2, z: z + zDir });
        const head2 = dimension.getBlock({ x: x - xDir, y: y + 2, z: z - zDir });

        head1.setPermutation(
            BlockPermutation.resolve("minecraft:piglin_head", {
                "facing_direction": 1
            })
        );

        head2.setPermutation(
            BlockPermutation.resolve("minecraft:piglin_head", {
                "facing_direction": 1
            })
        );

        const item = dimension.spawnItem(headItemStack, { x: x + 0.5, y: y + 2.5, z: z + 0.5 });
        item.clearVelocity();
    })
});

world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { dimension, block, player } = event;
    if (block.typeId !== "minecraft:piglin_head") return;

    const rotation = player.getRotation();
    const {x, y, z} = block.location;
    detector.detectStructure(dimension, block, rotation, {x: x + 0.5, y: y - 2, z: z + 0.5});
});
