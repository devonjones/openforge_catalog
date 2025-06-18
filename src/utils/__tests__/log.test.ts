import { devLog } from '../log';

describe('devLog', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalLog = console.log;

  beforeEach(() => {
    jest.resetModules();
    (console.log as any) = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    (console.log as any) = originalLog;
  });

  it('logs when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';
    devLog('hello', 123);
    expect(console.log).toHaveBeenCalledWith('hello', 123);
  });

  it('does not log when NODE_ENV is not development', () => {
    process.env.NODE_ENV = 'production';
    devLog('should not log');
    expect(console.log).not.toHaveBeenCalled();
  });
}); 