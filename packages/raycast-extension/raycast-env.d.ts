/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Host URL - Local Bun Host URL (e.g., http://127.0.0.1:8787) */
  "hostUrl": string,
  /** API Key - Host API Key for authentication */
  "apiKey": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `run-last-skill` command */
  export type RunLastSkill = ExtensionPreferences & {}
  /** Preferences accessible in the `cycle-skill` command */
  export type CycleSkill = ExtensionPreferences & {}
  /** Preferences accessible in the `run-skill-picker` command */
  export type RunSkillPicker = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `run-last-skill` command */
  export type RunLastSkill = {}
  /** Arguments passed to the `cycle-skill` command */
  export type CycleSkill = {}
  /** Arguments passed to the `run-skill-picker` command */
  export type RunSkillPicker = {}
}

