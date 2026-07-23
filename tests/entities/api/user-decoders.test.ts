import { describe, expect, it } from 'vitest';

import { decodeUserProfileDto } from '../../../src/entities/user';

const validProfile = {
  email: 'learner@example.test',
  name: 'Ada',
  surname: 'Lovelace',
  role: 'student',
  birthday: null,
  phone_number: '+10000000000',
  created_at: '2026-07-23T00:00:00Z',
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
});
