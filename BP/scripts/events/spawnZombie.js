export default function spawnZombie({ block, dimension }) {
    try {
        dimension.spawnEntity('minecraft:zombie', block.center());
    }
    catch (err) {
        dimension.spawnEntity('minecraft:chicken', block.center());
    }
}