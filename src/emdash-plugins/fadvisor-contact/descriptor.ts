import { fileURLToPath } from "node:url";
import type { PluginDescriptor } from "emdash";

const pluginEntrypoint = fileURLToPath(new URL("./plugin.ts", import.meta.url));

export function fadvisorContactPlugin(): PluginDescriptor {
	return {
		id: "fadvisor-contact",
		version: "1.0.0",
		format: "native",
		entrypoint: pluginEntrypoint,
	};
}
