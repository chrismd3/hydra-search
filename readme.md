# Hydra Search 🐉

A lightning-fast, zero-latency remote search engine for VS Code that leverages ripgrep and OS page caching on massive Samba workspaces.

Hydra Search bypasses your local file system to leverage your remote hypervisor's OS Page Cache and `ripgrep`. By executing searches directly in the remote machine's RAM and dynamically translating the paths back to your local Samba mount, it delivers massive speed boosts for large workspaces.

## Features

* **Zero-Latency Searching:** Uses a background cache-warming pipeline to force the remote Linux kernel to hold your workspace in RAM. When you search, results are functionally instantaneous.
* **Seamless Path Translation:** Automatically intercepts remote file paths (e.g., `/opt/src/main.ts`) and maps them to your local network drive (e.g., `Z:\src\main.ts`) so files open natively in your editor.
* **Smart Automation:** Silently warms the remote cache when you open your workspace or when the VS Code window regains focus, ensuring your RAM is primed after running external terminal commands.
* **Flexible UI:** Choose your workflow. Display your search results in a blazing-fast native QuickPick dropdown, or persist them in a dedicated Sidebar TreeView.

## Requirements

To use Hydra Search, your development environment must meet the following criteria:

1. **Ripgrep (`rg`):** Must be installed on your remote processing node.
2. **SSH Access:** You must have SSH access to the remote machine (key-based authentication without password prompts is highly recommended so background tasks run silently).
3. **Network Share:** Your remote workspace must be accessible locally via a mapped network drive or Samba share.

## Extension Settings

This extension contributes the following settings. You must configure these to match your environment before running your first search:

* `hydraSearch.sshUser`: Target username for SSH authentication on the remote node.
* `hydraSearch.sshHost`: IP address or hostname of the remote processing node.
* `hydraSearch.remoteRootPath`: Absolute path to the target development workspace root on the remote server (e.g., `/opt`).
* `hydraSearch.localMountPrefix`: The local mapped network drive letter representing your Samba mount (e.g., `Z:`).
* `hydraSearch.resultsDisplayMode`: Choose how results are displayed. Set to `QuickPick` for a fast, keyboard-centric dropdown, or `TreeView` for a persistent sidebar list.
* `hydraSearch.overrideSearchPath`: *(Optional)* Hardcode a remote path to search, overriding the dynamic active workspace detection.
* `hydraSearch.showWarmingStatus`: *(Optional)* Toggle the background status bar notification spinner when silently sweeping files into the remote RAM cache. Default is `true`.

## Usage & Commands

Hydra Search operates through two primary commands:

* **Hydra: Execute Remote RAM Sweep** (`hydra-search.triggerSearch`)
  * **Shortcut:** `Ctrl+Shift+F` (Mac: `Cmd+Shift+F`)
  * Triggers the `ripgrep` sweep across your remote RAM and returns the translated paths to your editor.
  
* **Hydra: Warm Remote Cache** (`hydra-search.warmCache`)
  * Runs a silent background process to pull your workspace from the remote disk into the Linux OS Page Cache. This runs automatically on startup and window focus, but can be triggered manually via the Command Palette.

## Release Notes

### 1.0.5
* Added `overrideSearchPath` setting for manual search targeting outside the active workspace.
* Added `showWarmingStatus` toggle to allow completely silent background cache warming.
* Fixed a case-sensitivity bug with Windows drive letter path translations.
* Updated Marketplace icon for a cleaner, transparent look.

### 1.0.0
* Initial release of Hydra Search.
* Introduced SSH page-cache warming pipeline.
* Added dynamic local/remote path translation.
* Configurable QuickPick and TreeView results displays.