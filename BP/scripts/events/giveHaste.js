export default function giveHaste({ player }) {
    return player.addEffect('haste', 1200, { amplifier: 0, showParticles: true });
}