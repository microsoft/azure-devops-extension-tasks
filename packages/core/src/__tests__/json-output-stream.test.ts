import { describe, expect, it, jest } from '@jest/globals';
import { JsonOutputStream } from '../json-output-stream.js';

describe('JsonOutputStream', () => {
  it('should parse simple JSON object', () => {
    const lineWriter = jest.fn();
    const stream = new JsonOutputStream(lineWriter);

    stream.write('{"success": true, "message": "Done"}');
    stream.end();

    expect(stream.jsonString).toBe('{"success": true, "message": "Done"}');
    expect(stream.parseJson()).toEqual({ success: true, message: 'Done' });
    expect(lineWriter).not.toHaveBeenCalled();
  });

  it('should separate JSON from debug messages', () => {
    const lineWriter = jest.fn();
    const stream = new JsonOutputStream(lineWriter);

    stream.write('Starting operation...\n');
    stream.write('Debug: Processing file\n');
    stream.write('{"result": "success"}');

    expect(stream.messages).toEqual(['Starting operation...\n', 'Debug: Processing file\n']);
    expect(stream.jsonString).toBe('{"result": "success"}');
    // Each message with \n gets split and called for each non-empty line
    expect(lineWriter).toHaveBeenCalledTimes(2); // One call per message (empty lines filtered)
  });

  it('should handle command echoes from task-lib', () => {
    const lineWriter = jest.fn();
    const stream = new JsonOutputStream(lineWriter);

    stream.write('[command]tfx extension publish\n');
    stream.write('{"published": true}');

    expect(stream.messages).toHaveLength(0);
    expect(stream.jsonString).toBe('{"published": true}');
    expect(lineWriter).toHaveBeenCalledWith('[command]tfx extension publish');
  });

  it('should accumulate JSON across multiple writes', () => {
    const lineWriter = jest.fn();
    const stream = new JsonOutputStream(lineWriter);

    stream.write('{"name": "my-extension",');
    stream.write(' "version": "1.0.0",');
    stream.write(' "publisher": "my-publisher"}');

    expect(stream.jsonString).toBe(
      '{"name": "my-extension", "version": "1.0.0", "publisher": "my-publisher"}'
    );
    expect(stream.parseJson()).toEqual({
      name: 'my-extension',
      version: '1.0.0',
      publisher: 'my-publisher',
    });
  });

  it('should handle JSON array', () => {
    const lineWriter = jest.fn();
    const stream = new JsonOutputStream(lineWriter);

    stream.write('[{"id": 1}, {"id": 2}]');

    expect(stream.parseJson()).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('should handle JSON null literal', () => {
    const lineWriter = jest.fn();
    const stream = new JsonOutputStream(lineWriter);

    stream.write('null');

    expect(stream.parseJson()).toBeNull();
    expect(lineWriter).not.toHaveBeenCalled();
  });

  it('should handle whitespace-prefixed JSON null literal', () => {
    const lineWriter = jest.fn();
    const stream = new JsonOutputStream(lineWriter);

    stream.write('   null');

    expect(stream.parseJson()).toBeNull();
    expect(lineWriter).not.toHaveBeenCalled();
  });

  it('should handle JSON boolean literals', () => {
    const lineWriter = jest.fn();
    const streamTrue = new JsonOutputStream(lineWriter);
    const streamFalse = new JsonOutputStream(lineWriter);

    streamTrue.write('true');
    streamFalse.write('false');

    expect(streamTrue.parseJson()).toBe(true);
    expect(streamFalse.parseJson()).toBe(false);
    expect(lineWriter).not.toHaveBeenCalled();
  });

  it('should handle JSON number literals', () => {
    const lineWriter = jest.fn();
    const stream = new JsonOutputStream(lineWriter);

    stream.write('-42.5');

    expect(stream.parseJson()).toBe(-42.5);
    expect(lineWriter).not.toHaveBeenCalled();
  });

  it('should handle JSON string literal', () => {
    const lineWriter = jest.fn();
    const stream = new JsonOutputStream(lineWriter);

    stream.write('"hello"');

    expect(stream.parseJson()).toBe('hello');
    expect(lineWriter).not.toHaveBeenCalled();
  });

  it('should handle mixed output correctly', () => {
    const lineWriter = jest.fn();
    const stream = new JsonOutputStream(lineWriter);

    stream.write('Debug message\n');
    stream.write('[command]executing command\n');
    stream.write('Another debug\n');
    stream.write('{"status": "complete"}');

    expect(stream.messages).toEqual(['Debug message\n', 'Another debug\n']);
    expect(stream.jsonString).toBe('{"status": "complete"}');
    expect(stream.parseJson()).toEqual({ status: 'complete' });
  });

  it('should return undefined for invalid JSON', () => {
    const lineWriter = jest.fn();
    const stream = new JsonOutputStream(lineWriter);

    stream.write('{invalid json}');

    expect(stream.parseJson()).toBeUndefined();
    expect(lineWriter).toHaveBeenCalledWith(expect.stringContaining('Failed to parse JSON'));
  });

  it('should return undefined when no JSON collected', () => {
    const lineWriter = jest.fn();
    const stream = new JsonOutputStream(lineWriter);

    stream.write('Only debug messages\n');
    stream.write('No JSON here\n');

    expect(stream.parseJson()).toBeUndefined();
  });

  it('should handle empty writes', () => {
    const lineWriter = jest.fn();
    const stream = new JsonOutputStream(lineWriter);

    stream.write('');
    stream.write('{"data": "test"}');

    expect(stream.jsonString).toBe('{"data": "test"}');
    expect(stream.parseJson()).toEqual({ data: 'test' });
  });
});
