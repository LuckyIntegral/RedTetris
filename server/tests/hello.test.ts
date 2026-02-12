import chai from 'chai';

chai.should();

describe('Hello World!', function () {
  it('1+1 == 2', () => {
    const res = 1 + 1;
    chai.should().equal(res, 2);
  });
});
