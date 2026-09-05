import '@testing-library/jest-dom';

// jsdom não implementa IntersectionObserver (usado pelo useActiveSection)
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
  root = null;
  rootMargin = '';
  thresholds = [];
}

globalThis.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
