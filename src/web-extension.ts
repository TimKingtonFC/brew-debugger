import * as vscode from "vscode";
import { activateVMDebug } from "./activateVMDebug";

export function activate(context: vscode.ExtensionContext) {
  activateVMDebug(context);
}

export function deactivate() {
  // nothing to do
}
