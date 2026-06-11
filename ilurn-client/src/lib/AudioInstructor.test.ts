import { afterEach, describe, expect, it, vi } from 'vitest';

import { AudioInstructor } from './AudioInstructor';

const textOf = (url: string) => decodeURIComponent(new URLSearchParams(url.split('?')[1]).get('text') ?? '');

function installFakeAudio() {
  const requested: string[] = [];
  class FakeAudio {
    src: string;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(src: string) {
      this.src = src;
      requested.push(src);
    }
    play() {
      // Simulate the clip finishing so the queue advances.
      setTimeout(() => this.onended?.(), 0);
      return Promise.resolve();
    }
    pause() {}
  }
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('speechSynthesis', undefined);
  return requested;
}

describe('AudioInstructor (no audio support)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns false when neither audio playback nor speech synthesis is available', () => {
    vi.stubGlobal('Audio', undefined);
    vi.stubGlobal('speechSynthesis', undefined);
    const instructor = AudioInstructor.getInstance();

    expect(instructor.play('Read this instruction')).toBe(false);
    expect(instructor.enqueue(['word', 'sentence', 'word'])).toBe(false);
  });

  it('returns false from replay when nothing has been spoken and nothing is available', () => {
    vi.stubGlobal('Audio', undefined);
    vi.stubGlobal('speechSynthesis', undefined);
    const instructor = AudioInstructor.getInstance();

    expect(instructor.replay()).toBe(false);
  });
});

describe('AudioInstructor (audio playback)', () => {
  afterEach(() => {
    AudioInstructor.getInstance().stop();
    vi.unstubAllGlobals();
  });

  it('plays a single phrase through the /tts endpoint', async () => {
    const requested = installFakeAudio();
    const instructor = AudioInstructor.getInstance();

    expect(instructor.play('Read this word aloud: cat')).toBe(true);
    await vi.waitFor(() => expect(requested.map(textOf)).toEqual(['Read this word aloud: cat']));
    expect(requested[0]).toContain('/tts?lang=en&text=');
  });

  it('plays a queued sequence in order (word, sentence, word)', async () => {
    const requested = installFakeAudio();
    const instructor = AudioInstructor.getInstance();

    expect(instructor.enqueue(['cat', 'The cat is sleeping.', 'cat'])).toBe(true);
    await vi.waitFor(() => expect(requested.map(textOf)).toEqual(['cat', 'The cat is sleeping.', 'cat']));
  });

  it('replays the most recent sequence', async () => {
    const requested = installFakeAudio();
    const instructor = AudioInstructor.getInstance();

    instructor.play('apple');
    await vi.waitFor(() => expect(requested.map(textOf)).toEqual(['apple']));

    expect(instructor.replay()).toBe(true);
    await vi.waitFor(() => expect(requested.map(textOf)).toEqual(['apple', 'apple']));
  });
});
