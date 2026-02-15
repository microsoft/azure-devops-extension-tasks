/**
 * JSON output stream parser for tfx CLI output
 * Parses mixed output from tfx --json --debug-log-stream stderr
 */

import { Writable } from 'stream';

/**
 * Stream that separates tfx JSON output from debug messages
 * The tfx CLI with --json flag outputs JSON to stdout but also emits
 * debug messages and command echoes. This stream separates them.
 */
export class JsonOutputStream extends Writable {
  /** Accumulated JSON string */
  public jsonString = '';

  /** Non-JSON messages (debug output, warnings, etc.) */
  public messages: string[] = [];

  /**
   * @param lineWriter Function to write non-JSON lines (for logging)
   */
  constructor(private lineWriter: (message: string) => void) {
    super();
  }

  /**
   * Process a chunk of data from the stream
   */
  _write(
    chunk: Buffer | string,
    _encoding: string,
    callback: (error?: Error | null) => void
  ): void {
    const chunkStr = chunk.toString();
    const trimmed = chunkStr.trimStart();

    // Azure Pipelines task-lib command output
    if (chunkStr.startsWith('[command]')) {
      this.writeOutput(chunkStr, this.lineWriter);
    }
    // If we haven't started collecting JSON yet and this doesn't look like JSON
    else if (!this.jsonString && !this.looksLikeJsonStart(trimmed)) {
      this.messages.push(chunkStr);
      this.writeOutput(chunkStr, this.lineWriter);
    }
    // Accumulate JSON
    else {
      this.jsonString += chunkStr;
      // Don't write JSON to output (will be parsed and processed separately)
    }

    callback();
  }

  /**
   * Detect whether a chunk can be the start of a valid JSON value.
   */
  private looksLikeJsonStart(input: string): boolean {
    if (!input) {
      return false;
    }

    return /^(\{|\[|"|-?\d|true\b|false\b|null\b)/.test(input);
  }

  /**
   * Write output line by line (splits on newlines)
   */
  private writeOutput(messages: string, writer: (m: string) => void): void {
    if (!messages) {
      return;
    }
    // Split messages to invoke writer for each line
    // This ensures proper line prefixing in logging systems
    messages.split('\n').forEach((line) => {
      if (line) {
        writer(line);
      }
    });
  }

  /**
   * Parse the accumulated JSON string
   * @returns Parsed JSON object or undefined if parsing fails
   */
  public parseJson<T = unknown>(): T | undefined {
    if (!this.jsonString) {
      return undefined;
    }

    try {
      return JSON.parse(this.jsonString) as T;
    } catch (error) {
      // If JSON parsing fails, log the error and return undefined
      this.lineWriter(`Failed to parse JSON output: ${error}`);
      return undefined;
    }
  }
}
