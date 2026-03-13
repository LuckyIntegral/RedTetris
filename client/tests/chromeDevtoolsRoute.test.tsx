import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ChromeDevtoolsProbe, { loader } from '~/routes/chrome-devtools';

describe('chrome-devtools route', () => {
  it('returns 204 from loader', () => {
    const response = loader();

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(204);
  });

  it('renders null component', () => {
    const { container } = render(<ChromeDevtoolsProbe />);

    expect(container.firstChild).toBeNull();
  });
});
