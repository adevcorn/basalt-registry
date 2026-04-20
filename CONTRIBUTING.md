# Contributing to the Basalt Plugin Registry

Thank you for contributing a plugin! Follow the steps below to get your plugin listed.

## Requirements

- Your plugin must be a valid WASM binary that exports `basalt_plugin_metadata`.
- The binary must be hosted as a **GitHub Release asset** (or any stable, publicly accessible URL).
- The plugin entry must pass JSON schema validation (`schema.json`).

## Steps

1. **Fork** this repository.

2. **Build your `.wasm` plugin** targeting `wasm32-unknown-unknown` (or `wasm32-wasi`).
   Your binary must export `basalt_plugin_metadata` — a 44-byte C struct that Basalt reads on load.

3. **Create a GitHub Release** in your plugin's repository and attach the `.wasm` binary as a release asset.
   Copy the direct asset download URL.

4. **Add an entry** to `index.json` following this shape:
   ```json
   {
     "name": "my-plugin",
     "version": "1.0.0",
     "description": "What your plugin does (max 280 chars).",
     "author": "your-github-username",
     "homepage": "https://github.com/you/my-plugin",
     "tags": ["tag1", "tag2"],
     "capabilities": ["AGENT_LAUNCHER"],
     "hook_flags": 1024,
     "file_globs": ["**/*.rs"],
     "download_url": "https://github.com/you/my-plugin/releases/download/v1.0.0/my-plugin.wasm"
   }
   ```

   Valid `capabilities` values: `DIAGNOSTICS`, `PROJECT_MODEL`, `HOVER`, `AGENT_LAUNCHER`.

5. **Open a Pull Request** targeting `main`. CI will automatically:
   - Validate the JSON schema
   - `curl --head` each `download_url` to verify reachability
   - Run `wasm-tools dump` to confirm the `basalt_plugin_metadata` export exists

6. A maintainer will review and merge once CI passes.

## Name uniqueness

Plugin `name` values must be globally unique in the registry. If your name conflicts with an existing entry, choose a scoped name like `username-pluginname`.

## Versioning

When releasing a new version of an existing plugin, update the `version` field and the `download_url` to point to the new release asset. Old versions are not retained in the index.
