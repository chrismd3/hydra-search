import * as vscode from 'vscode';
import * as path from 'path';

export class SearchResultItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly filePath: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        
        // Displays the full path when hovering over the item
        this.tooltip = this.filePath;
        
        // Displays the directory name faintly next to the file name
        this.description = path.dirname(this.filePath);
        
        // Automatically open the file in the editor when clicked
        this.command = {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [vscode.Uri.file(this.filePath)]
        };
    }
}

export class HydraSearchProvider implements vscode.TreeDataProvider<SearchResultItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SearchResultItem | undefined | void> = new vscode.EventEmitter<SearchResultItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<SearchResultItem | undefined | void> = this._onDidChangeTreeData.event;

    private searchResults: string[] = [];

    constructor() {}

    /**
     * Called by the SSH command pipeline to inject new translated local paths.
     */
    updateResults(newResults: string[]): void {
        this.searchResults = newResults;
        this.refresh();
    }

    /**
     * Clears the current search view.
     */
    clearResults(): void {
        this.searchResults = [];
        this.refresh();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SearchResultItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SearchResultItem): Thenable<SearchResultItem[]> {
        if (element) {
            // For a flat list of search results, we don't have nested children.
            return Promise.resolve([]);
        }

        if (this.searchResults.length === 0) {
            return Promise.resolve([]);
        }

        // Map the flat array of local file paths into clickable TreeItems
        const items = this.searchResults.map(filePath => {
            const fileName = path.basename(filePath);
            return new SearchResultItem(
                fileName, 
                filePath, 
                vscode.TreeItemCollapsibleState.None
            );
        });

        return Promise.resolve(items);
    }
}