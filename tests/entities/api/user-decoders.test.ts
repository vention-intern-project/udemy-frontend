import { describe, expect, it } from 'vitest';

import {
  decodeLoginResponseDto,
  decodeRegisterResponseDto,
  decodeUserProfileDto,
} from '../../../src/entities/user';

const validProfile = {
  email: 'learner@example.test',
  name: 'Ada',
  surname: 'Lovelace',
  role: 'student',
  birthday: null,
  phone_number: '+10000000000',
  created_at: '2026-07-23T00:00:00Z',
} as const;

const validRegister = {
  user: { id: 7, email: 'learner@example.test' },
  access_token: 'access-token',
  token_type: 'bearer',
} as const;

describe('user response decoders', () => {
  it('accepts a complete profile, nullable values, every role, and extra keys', () => {
    expect(decodeUserProfileDto({ ...validProfile, extra: 'ignored' })).toEqual(validProfile);
    expect(decodeUserProfileDto({
      ...validProfile,
      role: 'instructor',
      birthday: '1815-12-10',
      phone_number: null,
    })).toMatchObject({ role: 'instructor', birthday: '1815-12-10', phone_number: null });
    expect(decodeUserProfileDto({ ...validProfile, role: 'admin' }).role).toBe('admin');
  });

  it.each([
    null,
    [],
    'profile',
    7,
  ])('rejects a non-record profile root: %j', (value) => {
    expect(() => decodeUserProfileDto(value)).toThrow(TypeError);
  });

  it.each([
    'email',
    'name',
    'surname',
    'role',
    'birthday',
    'phone_number',
    'created_at',
  ] as const)('rejects a profile missing %s', (field) => {
    const value: Record<string, unknown> = { ...validProfile };
    delete value[field];
    expect(() => decodeUserProfileDto(value)).toThrow(TypeError);
  });

  it.each([
    ['email', 1],
    ['name', false],
    ['surname', {}],
    ['role', 'owner'],
    ['birthday', 1815],
    ['phone_number', false],
    ['created_at', null],
  ] as const)('rejects an invalid %s field', (field, invalidValue) => {
    expect(() => decodeUserProfileDto({
      ...validProfile,
      [field]: invalidValue,
    })).toThrow(TypeError);
  });

  it('rejects a partial profile even when its role is valid', () => {
    expect(() => decodeUserProfileDto({ role: 'student' })).toThrow(TypeError);
  });

  it.each([null, [], 'login', 7])('rejects a non-record login root: %j', (value) => {
    expect(() => decodeLoginResponseDto(value)).toThrow(TypeError);
  });

  it.each([undefined, null, 1, '', '   '])('rejects an invalid login access token: %j', (accessToken) => {
    expect(() => decodeLoginResponseDto({ access_token: accessToken })).toThrow(TypeError);
  });

  it('accepts a login response with extra keys', () => {
    expect(decodeLoginResponseDto({ access_token: 'access-token', extra: true }))
      .toEqual({ access_token: 'access-token' });
  });

  it.each([null, [], 'register', 7])('rejects a non-record register root: %j', (value) => {
    expect(() => decodeRegisterResponseDto(value)).toThrow(TypeError);
  });

  it.each([undefined, null, [], 'user', 7])('rejects an invalid register user object: %j', (user) => {
    expect(() => decodeRegisterResponseDto({ ...validRegister, user })).toThrow(TypeError);
  });

  it.each([-1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects an impossible register user ID: %j', (id) => {
    expect(() => decodeRegisterResponseDto({ ...validRegister, user: { ...validRegister.user, id } })).toThrow(TypeError);
  });

  it.each([
    ['user email', { ...validRegister, user: { ...validRegister.user, email: null } }],
    ['access token', { ...validRegister, access_token: '' }],
    ['token type', { ...validRegister, token_type: null }],
  ] as const)('rejects an invalid register %s field', (_field, value) => {
    expect(() => decodeRegisterResponseDto(value)).toThrow(TypeError);
  });

  it('accepts a register response with allowed extra keys', () => {
    expect(decodeRegisterResponseDto({
      ...validRegister,
      user: { ...validRegister.user, extra: 'ignored' },
      extra: 'ignored',
    })).toEqual(validRegister);
  });
});
