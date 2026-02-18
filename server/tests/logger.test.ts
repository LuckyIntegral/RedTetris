import { expect } from 'chai';
import sinon from 'sinon';
import { logger, logDbError } from '../utils/logger';

describe('logger utilities', () => {
  let stub: sinon.SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('logger.info logs prefix and arguments', () => {
    logger.info('hello');
    expect(stub.called).to.equal(true);
    const args = stub.getCall(0).args;
    expect(args[0]).to.match(/\[.*info.*\]/);
    expect(args[1]).to.equal('hello');
  });

  it('logger.error logs prefix and arguments', () => {
    logger.error('error occurred');
    expect(stub.called).to.equal(true);
    const args = stub.getCall(0).args;
    expect(args[0]).to.match(/\[.*error.*\]/);
    expect(args[1]).to.equal('error occurred');
  });

  it('logger.warn logs prefix and arguments', () => {
    logger.warn('this is a warning');
    expect(stub.called).to.equal(true);
    const args = stub.getCall(0).args;
    expect(args[0]).to.match(/\[.*warn.*\]/);
    expect(args[1]).to.equal('this is a warning');
  });

  it('logger.debug logs prefix and arguments', () => {
    logger.debug('debugging info');
    expect(stub.called).to.equal(true);
    const args = stub.getCall(0).args;
    expect(args[0]).to.match(/\[.*debug.*\]/);
    expect(args[1]).to.equal('debugging info');
  });

  it('logDbError logs error with context', () => {
    const error = new Error('Database connection failed');
    logDbError('Connecting to DB', error);
    expect(stub.called).to.equal(true);
    const args = stub.getCall(0).args;
    expect(args[0]).to.match(/\[.*error.*\]/);
    expect(args[1]).to.equal('Database error');
    expect(args[2]).to.deep.equal({
      context: 'Connecting to DB',
      error: { name: 'Error', message: 'Database connection failed' },
    });
  });
});
