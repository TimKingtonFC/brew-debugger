import * as vscode from "vscode";
import {
  CancellationToken,
  DebugConfiguration,
  ProviderResult,
  WorkspaceFolder,
} from "vscode";
import { MemoryViewProvider } from "./memoryViewProvider";

const MY_DEBUG_TYPE = "vm";

export function activateVMDebug(context: vscode.ExtensionContext) {
  const mySessions = new Set<string>();

  const updateDebugSessionActive = () => {
    vscode.commands.executeCommand(
      "setContext",
      "brew.debugSessionActive",
      mySessions.size > 0
    );
  };
  updateDebugSessionActive();

  context.subscriptions.push(
    vscode.debug.onDidStartDebugSession((s) => {
      if (s.type === MY_DEBUG_TYPE) {
        mySessions.add(s.id);
        updateDebugSessionActive();
      }
    }),
    vscode.debug.onDidTerminateDebugSession((s) => {
      if (s.type === MY_DEBUG_TYPE) {
        mySessions.delete(s.id);
        updateDebugSessionActive();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.brew-debugger.debugEditorContents",
      (resource: vscode.Uri) => {
        let targetResource = resource;
        if (!targetResource && vscode.window.activeTextEditor) {
          targetResource = vscode.window.activeTextEditor.document.uri;
        }
        if (targetResource) {
          vscode.debug.startDebugging(undefined, {
            type: "vm",
            name: "Debug File",
            request: "launch",
            projectName: targetResource.fsPath,
            stopOnEntry: true,
            debugServer: 8888,
          });
        }
      }
    )
  );

  const provider = new VMDebugConfigurationProvider();
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider("vm", provider)
  );

  const factory = new VMDebugAdapterServerDescriptorFactory();
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory("vm", factory)
  );
  context.subscriptions.push(factory);

  // context.subscriptions.push(
  //   vscode.languages.registerEvaluatableExpressionProvider("vmbrw", {
  //     provideEvaluatableExpression(
  //       document: vscode.TextDocument,
  //       position: vscode.Position
  //     ): vscode.ProviderResult<vscode.EvaluatableExpression> {
  //       const VARIABLE_REGEXP = /[a-z][a-z0-9]*/gi;
  //       const line = document.lineAt(position.line).text;

  //       let m: RegExpExecArray | null;
  //       while ((m = VARIABLE_REGEXP.exec(line))) {
  //         const varRange = new vscode.Range(
  //           position.line,
  //           m.index,
  //           position.line,
  //           m.index + m[0].length
  //         );

  //         if (varRange.contains(position)) {
  //           return new vscode.EvaluatableExpression(varRange);
  //         }
  //       }
  //       return undefined;
  //     },
  //   })
  // );

  const memoryViewProvider = new MemoryViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "memoryDumpView",
      memoryViewProvider
    )
  );

  vscode.debug.onDidTerminateDebugSession(() => {
    memoryViewProvider.terminatedDebugSession();
  });

  vscode.debug.onDidReceiveDebugSessionCustomEvent((e) => {
    if (e.event === "customStopped") {
      memoryViewProvider.refresh();
    }
  });

  //   // override VS Code's default implementation of the "inline values" feature"
  //   context.subscriptions.push(
  //     vscode.languages.registerInlineValuesProvider("vmlang", {
  //       provideInlineValues(
  //         document: vscode.TextDocument,
  //         viewport: vscode.Range,
  //         context: vscode.InlineValueContext
  //       ): vscode.ProviderResult<vscode.InlineValue[]> {
  //         const allValues: vscode.InlineValue[] = [];

  //         for (
  //           let l = viewport.start.line;
  //           l <= context.stoppedLocation.end.line;
  //           l++
  //         ) {
  //           const line = document.lineAt(l);
  //           var regExp = /([a-z][a-z0-9]*)/gi; // variables are words starting with '$'
  //           do {
  //             var m = regExp.exec(line.text);
  //             if (m) {
  //               const varName = m[1];
  //               const varRange = new vscode.Range(
  //                 l,
  //                 m.index,
  //                 l,
  //                 m.index + varName.length
  //               );

  //               // some literal text
  //               //allValues.push(new vscode.InlineValueText(varRange, `${varName}: ${viewport.start.line}`));

  //               // value found via variable lookup
  //               allValues.push(
  //                 new vscode.InlineValueVariableLookup(varRange, varName, false)
  //               );

  //               // value determined via expression evaluation
  //               //allValues.push(new vscode.InlineValueEvaluatableExpression(varRange, varName));
  //             }
  //           } while (m);
  //         }

  //         return allValues;
  //       },
  //     })
  //   );
}

class VMDebugConfigurationProvider
  implements vscode.DebugConfigurationProvider
{
  /**
   * Massage a debug configuration just before a debug session is being launched,
   * e.g. add all missing attributes to the debug configuration.
   */
  resolveDebugConfiguration(
    folder: WorkspaceFolder | undefined,
    config: DebugConfiguration,
    token?: CancellationToken
  ): ProviderResult<DebugConfiguration> {
    // if launch.json is missing or empty
    if (!config.type && !config.request && !config.name) {
      const editor = vscode.window.activeTextEditor;
      if (
        editor &&
        (editor.document.languageId === "vmlang" ||
          editor.document.languageId === "vmbrw" ||
          editor.document.languageId === "vmasm")
      ) {
        config.type = "vm";
        config.name = "Launch";
        config.request = "launch";
        config.projectName = "${file}";
        config.stopOnEntry = true;
        config.debugServer = 8888;
      }
    }

    // Always set cwd for the DebugAdapter.
    config.cwd = "${workspaceFolder}";

    return config;
  }
}

class VMDebugAdapterServerDescriptorFactory
  implements vscode.DebugAdapterDescriptorFactory
{
  createDebugAdapterDescriptor(
    session: vscode.DebugSession,
    executable: vscode.DebugAdapterExecutable | undefined
  ): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
    // make VS Code connect to debug server
    return new vscode.DebugAdapterServer(session.configuration.port);
  }

  dispose() {}
}
