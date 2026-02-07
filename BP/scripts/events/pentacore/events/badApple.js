//@ts-check
import * as f from "../functions.js";
import { world, system, GameMode, InputPermissionCategory, InputButton, ButtonState, HudVisibility, WeatherType, TicksPerSecond } from "@minecraft/server";
import { LuckyEventType } from "../main.js";

const FRAMES = 1621;
const FPS = 5;
const VIDEO_DURATION = (FRAMES / FPS) * 1000;

LuckyEventType.register({
    id: "BadApple",
    callback: async (event) => {
        // callback is the name of the property that describes the function
        const player = event.player;
        if (!player) return;

        const dim = player.dimension;
        world.sendMessage(`${player.name} has §6turned rotten!`);

        player.setDynamicProperty("bao_30k_pentacore:bad_apple;player_pos", JSON.stringify({ ...player.location, dimension: player.dimension.id }));
        player.setDynamicProperty("bao_30k_pentacore:bad_apple;player_game_mode", player.getGameMode());
        player.setGameMode(GameMode.Spectator);
        player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, false);
        player.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, false);
        player.onScreenDisplay.setHudVisibility(HudVisibility.Hide);
        dim.setWeather(WeatherType.Clear, ((VIDEO_DURATION / 1000) + 10) * TicksPerSecond);

        // Randomize height range to reduce the chance of multiple players viewing the video in the same position.
        const viewingAreaPos = { ...player.location, y: Math.floor(Math.random() * 1500) + dim.heightRange.max + 500 };

        const blackBoxEntity = dim.spawnEntity(
            "bao_30k_pentacore:black_box",
            { ...viewingAreaPos, y: dim.heightRange.max - 1 },
            {
                spawnEvent: "bao_30k_pentacore:add_transitent",
            },
        );
        const screenEntity = dim.spawnEntity(
            "bao_30k_pentacore:bad_apple",
            { ...viewingAreaPos, y: dim.heightRange.max - 1 },
            {
                spawnEvent: "bao_30k_pentacore:add_transitent",
            },
        );
        // Teleport after spawning because you can't spawn entities above the height limit.
        blackBoxEntity.teleport(viewingAreaPos);
        screenEntity.teleport(f.Vector.sum(viewingAreaPos, { x: 0, y: -2.8125, z: 4 }));
        blackBoxEntity.setProperty("bao_30k_pentacore:size", 9);

        player.camera.setCamera("minecraft:free", {
            location: f.Vector.sum(viewingAreaPos, { x: 0, y: 0 /* 2.8125 */, z: -1 }),
            rotation: { x: 0, y: 0 },
        });

        // Give the player a chance to load in after the camera is set.
        await system.waitTicks(5);

        const startTime = Date.now();

        screenEntity.playAnimation("play_video", { players: [player] });

        let exited = false;

        function exit() {
            if (exited) return;
            if (blackBoxEntity.isValid) blackBoxEntity.remove();
            if (screenEntity.isValid) screenEntity.remove();
            if (typeof playerButtonInputSubscription !== "undefined") world.afterEvents.playerButtonInput.unsubscribe(playerButtonInputSubscription);
            if (player?.isValid) {
                /**
                 * @type {import("@minecraft/server").Vector3 & { dimension: string }}
                 */
                const originalLocation = JSON.parse(String(player.getDynamicProperty("bao_30k_pentacore:bad_apple;player_pos")));
                /**
                 * @type {GameMode}
                 */
                // @ts-expect-error
                const originalGameMode = player.getDynamicProperty("bao_30k_pentacore:bad_apple;player_game_mode");
                player.teleport(originalLocation, {
                    dimension: world.getDimension(originalLocation.dimension),
                });
                player.setGameMode(originalGameMode);
                player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
                player.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, true);
                player.camera.clear();
                player.onScreenDisplay.setHudVisibility(HudVisibility.Reset);
                player.runCommand("stopsound @s pentacore.bad_apple.adjusted_volume");
                player.setDynamicProperty("bao_30k_pentacore:bad_apple;player_pos");
                player.setDynamicProperty("bao_30k_pentacore:bad_apple;player_game_mode");
            }
            exited = true;
        }

        const playerButtonInputSubscription = world.afterEvents.playerButtonInput.subscribe((event) => {
            if (event.player !== player) return;
            if (event.button !== InputButton.Jump) return;
            if (event.newButtonState !== ButtonState.Pressed) return;
            if (startTime + 5000 < Date.now()) exit();
        });

        // Add an extra 1 second to account for possible lag between the server and the client, so that the video has a chance to finish.
        // Do a loop of 1 tick to be more precise, use a loop instead of a timeout to prevent low server TPS from interfering.
        while (!exited && startTime + VIDEO_DURATION + 1000 > Date.now()) await system.waitTicks(1);
        exit();
    },
});

// Reset if they relog or die.
world.afterEvents.playerSpawn.subscribe((event) => {
    if (event.player.getDynamicProperty("bao_30k_pentacore:bad_apple;player_pos")) {
        /**
         * @type {import("@minecraft/server").Vector3 & { dimension: string }}
         */
        const originalLocation = JSON.parse(String(event.player.getDynamicProperty("bao_30k_pentacore:bad_apple;player_pos")));
        /**
         * @type {GameMode}
         */
        // @ts-expect-error
        const originalGameMode = event.player.getDynamicProperty("bao_30k_pentacore:bad_apple;player_game_mode");
        event.player.teleport(originalLocation, {
            dimension: world.getDimension(originalLocation.dimension),
        });
        event.player.setGameMode(originalGameMode);
        event.player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
        event.player.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, true);
        event.player.camera.clear();
        event.player.onScreenDisplay.setHudVisibility(HudVisibility.Reset);
        event.player.runCommand("stopsound @s pentacore.bad_apple.adjusted_volume");
        event.player.setDynamicProperty("bao_30k_pentacore:bad_apple;player_pos");
        event.player.setDynamicProperty("bao_30k_pentacore:bad_apple;player_game_mode");
    }
});

world.afterEvents.worldLoad.subscribe(() => {
    for (const player of world.getAllPlayers()) {
        if (player.getDynamicProperty("bao_30k_pentacore:bad_apple;player_pos")) {
            /**
             * @type {import("@minecraft/server").Vector3 & { dimension: string }}
             */
            const originalLocation = JSON.parse(String(player.getDynamicProperty("bao_30k_pentacore:bad_apple;player_pos")));
            /**
             * @type {GameMode}
             */
            // @ts-expect-error
            const originalGameMode = player.getDynamicProperty("bao_30k_pentacore:bad_apple;player_game_mode");
            player.teleport(originalLocation, {
                dimension: world.getDimension(originalLocation.dimension),
            });
            player.setGameMode(originalGameMode);
            player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
            player.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, true);
            player.camera.clear();
            player.onScreenDisplay.setHudVisibility(HudVisibility.Reset);
            player.runCommand("stopsound @s pentacore.bad_apple.adjusted_volume");
            player.setDynamicProperty("bao_30k_pentacore:bad_apple;player_pos");
            player.setDynamicProperty("bao_30k_pentacore:bad_apple;player_game_mode");
        }
    }
});
