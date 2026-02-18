import { should } from 'chai';

should();

describe('Hi there!', function () {
  it('1+1 == 2', () => {
    const res = 1 + 1;
    should().equal(res, 2);
  });
});
