import { describe, it, expect, beforeEach } from 'vitest';
import { getToken, setAccessToken, getUser, setUser, clearSession } from '../../../src/services/tokenStore';
import type { AuthUser } from '../../../src/types';

const ALICE: AuthUser = {
  id: 'u1',
  username: 'alice',
  displayName: 'Alice Morgan',
  email: 'alice@example.com',
  role: 'USER',
};

beforeEach(() => {
  clearSession();
});

describe('tokenStore', () => {
  describe('access token (in-memory only)', () => {
    it('starts null', () => {
      expect(getToken()).toBeNull();
    });

    it('stores and retrieves a token', () => {
      setAccessToken('abc123');
      expect(getToken()).toBe('abc123');
    });

    it('is NOT stored in localStorage', () => {
      setAccessToken('secret');
      expect(localStorage.getItem('verita_token')).toBeNull();
    });

    it('clearSession resets the token to null', () => {
      setAccessToken('abc123');
      clearSession();
      expect(getToken()).toBeNull();
    });
  });

  describe('user (localStorage)', () => {
    it('starts null when localStorage is empty', () => {
      expect(getUser()).toBeNull();
    });

    it('stores and retrieves a user', () => {
      setUser(ALICE);
      expect(getUser()).toEqual(ALICE);
    });

    it('clearSession removes the user from localStorage', () => {
      setUser(ALICE);
      clearSession();
      expect(getUser()).toBeNull();
    });
  });
});
