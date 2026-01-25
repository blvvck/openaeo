import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

const storage = new Map<string, string>();
const localStorageMock = {
    getItem: (key: string) => storage.get(String(key)) ?? null,
    setItem: (key: string, value: string) => storage.set(String(key), String(value)),
    removeItem: (key: string) => storage.delete(String(key)),
    clear: () => storage.clear(),
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    get length() { return storage.size; },
};

Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorageMock });
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorageMock });
}

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
    cleanup();
});
