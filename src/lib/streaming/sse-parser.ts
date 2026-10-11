export interface SSEEvent {
  event?: string;
  data: string;
  id?: string;
}

/**
 * Robust incremental SSE parser that handles:
 * - Chunks split across byte/character boundaries
 * - Multiple 'data: ...' events in a single chunk
 * - Trailing buffers
 * - Lines starting with 'data: '
 * - Empty lines as event boundaries
 * - '[DONE]' sentinel
 */
export class SSEParser {
  private buffer = '';

  /**
   * Feed a raw text chunk into the parser and receive any complete events.
   */
  public feed(chunk: string): SSEEvent[] {
    this.buffer += chunk;
    const events: SSEEvent[] = [];

    // Normalize \r\n to \n
    this.buffer = this.buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    let eventEndIndex = this.buffer.indexOf('\n\n');
    while (eventEndIndex !== -1) {
      const rawBlock = this.buffer.slice(0, eventEndIndex);
      this.buffer = this.buffer.slice(eventEndIndex + 2);

      const parsedEvent = this.parseBlock(rawBlock);
      if (parsedEvent) {
        events.push(parsedEvent);
      }

      eventEndIndex = this.buffer.indexOf('\n\n');
    }

    return events;
  }

  /**
   * Parse a single block between \n\n boundaries
   */
  private parseBlock(block: string): SSEEvent | null {
    const lines = block.split('\n');
    let dataBuffer = '';
    let eventName: string | undefined;
    let eventId: string | undefined;

    for (const line of lines) {
      if (!line || line.startsWith(':')) {
        // Comment or empty line, ignore
        continue;
      }

      if (line.startsWith('data:')) {
        const value = line.slice(5).trimStart();
        if (dataBuffer.length > 0) {
          dataBuffer += '\n' + value;
        } else {
          dataBuffer = value;
        }
      } else if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('id:')) {
        eventId = line.slice(3).trim();
      }
    }

    if (dataBuffer.length === 0 && !eventName) {
      return null;
    }

    return {
      event: eventName,
      data: dataBuffer,
      id: eventId,
    };
  }

  /**
   * Reset parser state
   */
  public reset(): void {
    this.buffer = '';
  }

  /**
   * Get any remaining unparsed buffer if needed
   */
  public getRemainingBuffer(): string {
    return this.buffer;
  }
}
