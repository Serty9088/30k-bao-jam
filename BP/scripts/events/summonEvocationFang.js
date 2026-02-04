import { world } from "@minecraft/server";

export default function summonEvocationFang({ dimension }) {
    return dimension.runCommand('function bao_30k/summon_evocation_fang');
}