import * as vscode from "vscode";

function toHex(num: number, len: number) {
  return "0x" + num.toString(16).padStart(len, "0");
}

export class MemoryViewProvider implements vscode.WebviewViewProvider {
  view?: vscode.Webview;
  addr = 0x1000;
  data: number[] = [];
  changedDwords: Set<number> = new Set<number>();

  constructor(private context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.view = webviewView.webview;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "scrollOffTop":
          this.loadPreviousMemoryBlock();
          break;
        case "scrollOffBottom":
          this.loadNextMemoryBlock();
          break;
      }
    });

    webviewView.webview.html = this.getHtml();
    this.loadData(0x1000);
  }

  loadData(startAddr: number, refreshing: boolean = false) {
    let bytesToFetch: number;
    if (refreshing && this.data.length > 0) {
      bytesToFetch = this.data.length;
    } else if (startAddr < this.addr) {
      bytesToFetch = this.addr - startAddr;
    } else {
      bytesToFetch = 512;
    }

    this.fetchMemory(toHex(startAddr, 4), bytesToFetch).then((bytes) => {
      const offset = startAddr - this.addr;

      if (refreshing) {
        this.changedDwords.clear();

        for (var i = 0; i < bytes.length && i < this.data.length; i++) {
          if (bytes[i] !== this.data[i]) {
            this.changedDwords.add(this.addr + (i - (i % 4)));
          }
        }

        this.data = [];
      }

      if (startAddr < this.addr) {
        this.addr = startAddr;
        this.data = bytes.concat(this.data);
      } else {
        this.data = this.data
          .slice(0, offset)
          .concat(bytes, this.data.slice(offset + bytesToFetch));
      }

      if (this.view) {
        this.view.postMessage({
          type: "updateMemory",
          data: {
            addr: this.addr,
            bytes: this.data,
            changedDwords: Array.from(this.changedDwords),
          },
        });
      }
    });
  }

  refresh() {
    this.loadData(this.addr, true);
  }

  loadPreviousMemoryBlock() {
    if (this.addr > 0) {
      this.loadData(this.addr - 128);
    }
  }

  loadNextMemoryBlock() {
    this.loadData(this.addr + this.data.length);
  }

  async fetchMemory(ref: string, count: number): Promise<number[]> {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
      return [];
    }

    const result = await session.customRequest("readMemory", {
      memoryReference: ref,
      offset: 0,
      count: count,
    });

    const buffer = Buffer.from(result.data, "base64");
    return [...buffer];
  }

  terminatedDebugSession() {
    this.addr = 0x1000;
    this.data = [];
    this.changedDwords.clear();

    if (this.view) {
      this.view.postMessage({
        type: "updateMemory",
        data: {},
      });
    }
  }

  getHtml(): string {
    let scriptUri: vscode.Uri | null = null;
    let cssUri: vscode.Uri | null = null;
    if (this.view) {
      scriptUri = this.view.asWebviewUri(
        vscode.Uri.joinPath(this.context.extensionUri, "media", "memoryView.js")
      );
      cssUri = this.view.asWebviewUri(
        vscode.Uri.joinPath(
          this.context.extensionUri,
          "media",
          "memoryView.css"
        )
      );
    }

    return `
      <head>
        <link rel="stylesheet" href="${cssUri}">
        <script src="${scriptUri}"></script>
      </head>

      <body>
        <div id="memory-view" class="hex-dump">No data to display</div>
      </body>
      `;
  }
}
