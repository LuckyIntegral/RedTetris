export namespace Route {
  export type LinkDescriptor = {
    rel?: string;
    href: string;
    crossOrigin?: string | boolean;
    media?: string;
    as?: string;
  };

  export type LinksFunction = () => LinkDescriptor[];

  export type ErrorBoundaryProps = { error: unknown };

  export type MetaArgs = Record<string, any>;
}

export {};
