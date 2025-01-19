"use strict";

import * as vscode from "vscode";
import {
  CancellationToken,
  DebugConfiguration,
  ProviderResult,
  WorkspaceFolder,
} from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.vm-debug.debugEditorContents",
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
    ),
    vscode.commands.registerCommand(
      "extension.vm-debug.toggleFormatting",
      (variable) => {
        const ds = vscode.debug.activeDebugSession;
        if (ds) {
          ds.customRequest("toggleFormatting");
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.vm-debug.getProgramName",
      (config) => {
        return vscode.window.showInputBox({
          placeHolder: "Choose a VM file to debug",
          value: "main.vm",
        });
      }
    )
  );

  const provider = new VMDebugConfigurationProvider();
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider("vm", provider)
  );

  // register a dynamic configuration provider for 'vm' debug type
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider(
      "vm",
      {
        provideDebugConfigurations(
          folder: WorkspaceFolder | undefined
        ): ProviderResult<DebugConfiguration[]> {
          return [
            {
              name: "Dynamic Launch",
              request: "launch",
              type: "vm",
              program: "${file}",
            },
            {
              name: "Another Dynamic Launch",
              request: "launch",
              type: "vm",
              program: "${file}",
            },
            {
              name: "VM Launch",
              request: "launch",
              type: "vm",
              program: "${file}",
            },
          ];
        },
      },
      vscode.DebugConfigurationProviderTriggerKind.Dynamic
    )
  );

  // override VS Code's default implementation of the debug hover
  // here we match only Mock "variables", that are words starting with an '$'
  context.subscriptions.push(
    vscode.languages.registerEvaluatableExpressionProvider("markdown", {
      provideEvaluatableExpression(
        document: vscode.TextDocument,
        position: vscode.Position
      ): vscode.ProviderResult<vscode.EvaluatableExpression> {
        const VARIABLE_REGEXP = /\$[a-z][a-z0-9]*/gi;
        const line = document.lineAt(position.line).text;

        let m: RegExpExecArray | null;
        while ((m = VARIABLE_REGEXP.exec(line))) {
          const varRange = new vscode.Range(
            position.line,
            m.index,
            position.line,
            m.index + m[0].length
          );

          if (varRange.contains(position)) {
            return new vscode.EvaluatableExpression(varRange);
          }
        }
        return undefined;
      },
    })
  );

  // override VS Code's default implementation of the "inline values" feature"
  context.subscriptions.push(
    vscode.languages.registerInlineValuesProvider("markdown", {
      provideInlineValues(
        document: vscode.TextDocument,
        viewport: vscode.Range,
        context: vscode.InlineValueContext
      ): vscode.ProviderResult<vscode.InlineValue[]> {
        const allValues: vscode.InlineValue[] = [];

        for (
          let l = viewport.start.line;
          l <= context.stoppedLocation.end.line;
          l++
        ) {
          const line = document.lineAt(l);
          var regExp = /\$([a-z][a-z0-9]*)/gi; // variables are words starting with '$'
          do {
            var m = regExp.exec(line.text);
            if (m) {
              const varName = m[1];
              const varRange = new vscode.Range(
                l,
                m.index,
                l,
                m.index + varName.length
              );

              // some literal text
              //allValues.push(new vscode.InlineValueText(varRange, `${varName}: ${viewport.start.line}`));

              // value found via variable lookup
              allValues.push(
                new vscode.InlineValueVariableLookup(varRange, varName, false)
              );

              // value determined via expression evaluation
              //allValues.push(new vscode.InlineValueEvaluatableExpression(varRange, varName));
            }
          } while (m);
        }

        return allValues;
      },
    })
  );
}

export function deactivate() {
  // nothing to do
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
      if (editor && editor.document.languageId === "timkvm") {
        config.type = "vm";
        config.name = "Launch";
        config.request = "launch";
        config.projectName = "${file}";
        config.stopOnEntry = true;
        config.debugServer = 8888;
      }
    }

    return config;
  }
}
