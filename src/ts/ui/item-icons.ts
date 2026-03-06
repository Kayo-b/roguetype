import type { CommandId, PatchId, ScriptId } from "../game/roguelike-state";

const SCRIPT_ICONS: Record<ScriptId, string> = {
  keylogger: "⌨",
  packet_sniffer: "◎",
  idle_daemon: "◴",
  throttle_hook: "⚡",
  null_handler: "⌫",
  fork_bomb: "✶",
  brute_force: "⏩",
  parity_check: "⇄",
  stack_overflow: "▦",
  watchdog_timer: "◷",
  cascade_exploit: "↺",
  fragile_payload: "⚠",
  zero_fault: "✓",
  overclock_bin: "⏱",
  deep_scan: "⌕",
  singularity_0day: "⬢",
  echo_chamber: "◌",
};

const COMMAND_ICONS: Record<CommandId, string> = {
  flush_amp: "◍",
  payload_burst: "✹",
  spoof_script: "◈",
  extend_timeout: "⧖",
  recompile: "⟳",
  inject: "➤",
};

const PATCH_ICONS: Record<PatchId, string> = {
  patch_clean: "◇",
  patch_burst: "✦",
  patch_finish: "▣",
  patch_deep: "⬒",
  patch_recover: "⟲",
};

export function getScriptIcon(id: ScriptId): string {
  return SCRIPT_ICONS[id] ?? "□";
}

export function getCommandIcon(id: CommandId): string {
  return COMMAND_ICONS[id] ?? "□";
}

export function getPatchIcon(id: PatchId): string {
  return PATCH_ICONS[id] ?? "□";
}
