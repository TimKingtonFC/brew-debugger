const vscode = acquireVsCodeApi();

window.addEventListener('load', () => {
  const container = document.getElementById('memory-view');

  container.addEventListener('wheel', (e) => {
    const { scrollTop, scrollHeight, clientHeight } = container;

    if (scrollTop + clientHeight >= scrollHeight - 5) {
      vscode.postMessage({command: 'scrollOffBottom'});
    } else if (scrollTop === 0 && e.deltaY < 0) {
      vscode.postMessage({command: 'scrollOffTop'});
    }
  });
});

function markChanged(str, changed) {
  if (!changed) {
    return str;
  }
  return "<span class='changed'>" + str + "</span>";
}

BYTES_PER_ROW = 16;
window.addEventListener('message', event => {
  const { type, data } = event.data;
  if (type === 'updateMemory') {
    const memoryDiv = document.getElementById('memory-view');

    const { addr, bytes } = data;
    if (!bytes || !bytes.length) {
        memoryDiv.innerHTML = "No data to display";
        return;
    }

    const changedDwords = new Set(data.changedDwords);

    let rows = [];
    for (let lineOffset = 0; lineOffset < bytes.length; lineOffset += BYTES_PER_ROW) {
      const lineChunk = bytes.slice(lineOffset, lineOffset + BYTES_PER_ROW);

      let hex = [];
      let ascii = [];
      for (let dwordOffset = 0; dwordOffset < lineChunk.length; dwordOffset += 4) {
        const dwordChunk = lineChunk.slice(dwordOffset, dwordOffset + 4);
        const hasChanged = changedDwords.has(addr + lineOffset + dwordOffset);

        const hexDwordChunk = dwordChunk.map((b) => b.toString(16).padStart(2, "0")).join(" ");
        hex.push(markChanged(hexDwordChunk, hasChanged));

        const asciiDwordChunk = dwordChunk
            .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
            .join("");
        ascii.push(markChanged(asciiDwordChunk, hasChanged));
      }

      for (let j = lineChunk.length; j < BYTES_PER_ROW; j++) {
        hex.push("  ");
      }

      const label = (addr + lineOffset).toString(16).padStart(4, "0");
      rows.push(`0x${label}: ${hex.slice(0, 2).join(" ")}  ${hex.slice(2, 4).join(" ")} ${ascii.join("")}`);
    }

    memoryDiv.innerHTML = rows.join('\n');
  }
});
