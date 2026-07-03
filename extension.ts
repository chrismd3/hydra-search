import * as vscode from 'vscode';
import { exec } from 'child_process';
import { HydraSearchProvider } from './hydrasearchprovider';

export function activate(context: vscode.ExtensionContext) {
    // 1. Initialize the Data Provider
    const hydraProvider = new HydraSearchProvider();

    // 2. Bind the provider to the View ID defined in package.json
    vscode.window.registerTreeDataProvider('hydraRemoteSearch', hydraProvider);

    // 3. Command: The Cache Warmer
    const warmCacheCommand = vscode.commands.registerCommand('hydra-search.warmCache', () => {
        const config = vscode.workspace.getConfiguration('hydra-search');
        const showStatus = config.get<boolean>('showWarmingStatus', true);
        const sshUser = config.get<string>('sshUser');
        const sshHost = config.get<string>('sshHost');
        const remotePath = config.get<string>('remoteRootPath');

        // Background SSH sweep to force Linux to load files into the Page Cache
        const sshCommand = `ssh ${sshUser}@${sshHost} "rg . ${remotePath} > /dev/null 2>&1"`;       

        // Decide whether to show the UI
        if (showStatus) {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Window,
                cancellable: false,
                title: 'Hydra: Warming Remote RAM Cache...'
            }, async (progress) => {
                return new Promise<void>((resolve) => {
                    exec(sshCommand, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                        // We ignore error code 1 here because ripgrep returns this if it finds nothing, 
                        // but the disk read still happens, warming the cache.
                        if (error) {
                            if (error.code === 1) {
                                vscode.window.showInformationMessage('Hydra: Remote RAM Cache Warmed.');
                            } else {
                                vscode.window.showErrorMessage(`Hydra: Cache warm failed: ${error.message}`);
                                console.error(`Hydra: Cache warm failed: ${error.message}`);
                            }
                        } else {
                            vscode.window.showInformationMessage('Hydra: Remote RAM Cache Warmed.');                    
                        }
                        resolve();
                    });
                });
            });
        } else {
            // Run the command silently in the background
            exec(sshCommand, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                if (error && error.code !== 1) {
                    console.error(`Hydra: Cache warm failed: ${error.message}`);
                }
            });
        }
    });

    // 4. Command: The Search Execution
    const triggerSearchCommand = vscode.commands.registerCommand('hydra-search.triggerSearch', async () => {
        const searchTerm = await vscode.window.showInputBox({
            prompt: 'Enter search term for remote RAM sweep',
            placeHolder: 'e.g., function init()'
        });

        if (!searchTerm) { return; }

        // Get the local path of the first open workspace folder
        const config = vscode.workspace.getConfiguration('hydra-search');
        const sshUser = config.get<string>('sshUser');
        const sshHost = config.get<string>('sshHost');
        const remotePath = config.get<string>('remoteRootPath');
        const localPrefix = config.get<string>('localMountPrefix', '');
        const displayMode = config.get<string>('resultsDisplayMode', 'QuickPick');
        const overridePath = config.get<string>('overrideSearchPath', '');

        let targetRemotePath = '';

        // Check for the manual override first
        if (overridePath.trim() !== '') {
            targetRemotePath = overridePath;
        } 
        // If no override, dynamically calculate from the open workspace
        else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const localWorkspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;

            // Create a case-insensitive regex to match the local prefix at the start of the string
            const prefixRegex = new RegExp('^' + localPrefix!, 'i');

            targetRemotePath = localWorkspacePath
                .replace(prefixRegex, remotePath!)
                .replace(/\\/g, '/'); 
        } 
        // Failsafe if neither exist
        else {
            vscode.window.showErrorMessage('Hydra: No workspace folder open and no override path configured.');
            return;
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: 'Hydra: Sweeping RAM...'
        }, async () => {
            return new Promise<void>((resolve) => {
                // Execute the remote ripgrep search, outputting just the file paths containing the match
                const cmd = `ssh ${sshUser}@${sshHost} "rg -l '${searchTerm}' ${targetRemotePath}"`;
                
                exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
                    
                    if (error) {
                        if (error.code === 1) {
                            vscode.window.showInformationMessage('Hydra: No results found.');
                        } else {
                            // Catch actual SSH/Network failures
                            vscode.window.showErrorMessage(`Hydra Search Failed: ${error.message}`);
                            console.error(`Hydra Error: ${stderr || error.message}`);
                        }
                        resolve();
                        return;
                    }

                    // Process the output: split into lines, remove empty, and translate paths
                    const remoteFiles = stdout.split('\n').filter(line => line.trim() !== '');
                    const translatedPaths = remoteFiles.map(file => {
                        // Dynamically replace the remote root path with your local Samba mount letter
                        return file.replace(remotePath!, localPrefix).replace(/\//g, '\\');
                    });

                    // Route the results based on user configuration
                    if (displayMode === 'QuickPick') {
                        const selection = await vscode.window.showQuickPick(translatedPaths, {
                            placeHolder: `Hydra: ${translatedPaths.length} results found. Select to open...`
                        });
                        
                        if (selection) {
                            vscode.commands.executeCommand('vscode.open', vscode.Uri.file(selection));
                        }
                    } else {
                        // Update the TreeView and force focus on the sidebar
                        hydraProvider.updateResults(translatedPaths);
                        vscode.commands.executeCommand('hydraRemoteSearch.focus');
                    }
                    resolve();
                });
            });
        });
    });
    
    // 5. Automation: Startup Sweep
    // Run a silent sweep once when the extension first activates (workspace opens)
    vscode.commands.executeCommand('hydra-search.warmCache');

    // 6. Automation: Window Focus Sweep
    // Run a sweep whenever the VS Code window regains focus to catch external terminal changes
    const focusListener = vscode.window.onDidChangeWindowState((windowState) => {
        if (windowState.focused) {
            vscode.commands.executeCommand('hydra-search.warmCache');
        }
    });

    // 7. Register Subscriptions
    context.subscriptions.push(warmCacheCommand, triggerSearchCommand, focusListener);
}
export function deactivate() {}