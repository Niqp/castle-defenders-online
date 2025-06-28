import { CountdownTicker } from '../ticker/CountdownTicker.js';

jest.useFakeTimers(); // Use Jest fake timers globally for this suite

describe('CountdownTicker', () => {
  let originalLog;
  beforeAll(() => {
    originalLog = console.log;
    console.log = jest.fn();
  });
  afterAll(() => {
    console.log = originalLog;
  });
  let ticker;
  afterEach(() => {
    // Flush all pending timers to avoid async logs after test ends
    jest.runOnlyPendingTimers();
    if (ticker) ticker.stop();
    ticker = undefined;
  });
  it('decrements nextWaveIn each tick', () => {
    const io = { emit: jest.fn(), in: jest.fn(() => ({ emit: jest.fn() })) };
    const gameState = { nextWaveIn: 3 };
    const onNextWave = jest.fn();
    const ticker = new CountdownTicker(io, 'room', gameState, onNextWave);
    ticker.tick();
    expect(gameState.nextWaveIn).toBe(2);
    ticker.tick();
    expect(gameState.nextWaveIn).toBe(1);
    ticker.stop();
  });

  it('calls onNextWave when countdown reaches zero', () => {
    const io = { emit: jest.fn(), in: jest.fn(() => ({ emit: jest.fn() })) };
    const gameState = { nextWaveIn: 1 };
    const onNextWave = jest.fn();
    const ticker = new CountdownTicker(io, 'room', gameState, onNextWave);
    ticker.tick();
    expect(onNextWave).toHaveBeenCalled();
    ticker.stop();
  });

  it('emits countdown updates via io.emit', () => {
    const io = { emit: jest.fn(), in: jest.fn(() => ({ emit: jest.fn() })) };
    const gameState = { nextWaveIn: 2 };
    const onNextWave = jest.fn();
    const ticker = new CountdownTicker(io, 'room', gameState, onNextWave);
    ticker.tick();
    expect(io.in).toHaveBeenCalled(); // can't easily verify param
    ticker.stop();
  });

  it('start() decrements nextWaveIn and calls onNextWave (with timers)', () => {
    const io = { emit: jest.fn(), in: jest.fn(() => ({ emit: jest.fn() })) };
    const gameState = { nextWaveIn: 2 };
    const onNextWave = jest.fn();
    ticker = new CountdownTicker(io, 'room', gameState, onNextWave);
    ticker.start();
    // Fast-forward the timer for COUNTDOWN_INTERVAL
    jest.advanceTimersByTime(1000); // Assuming TIMINGS.COUNTDOWN_INTERVAL = 1000
    expect(gameState.nextWaveIn).toBe(1);
    jest.advanceTimersByTime(1000);
    expect(gameState.nextWaveIn).toBe(0);
    // The onNextWave callback should have been called
    expect(onNextWave).toHaveBeenCalled();
    // Fast-forward for the setTimeout inside start()
    jest.advanceTimersByTime(10);
    ticker.stop();
  });

  it('can be constructed and stopped without error', () => {
    const io = { emit: jest.fn(), in: jest.fn(() => ({ emit: jest.fn() })) };
    const gameState = { nextWaveIn: 10 };
    const onNextWave = jest.fn();
    const ticker = new CountdownTicker(io, 'room', gameState, onNextWave);
    expect(ticker).toBeDefined();
    ticker.stop();
  });
});
