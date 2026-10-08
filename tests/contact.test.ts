import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  contactAction,
  contactValidationError,
  normalizeContactValue,
} from '../src/utils/contact.ts';

test('Messenger links are validated and normalized', () => {
  assert.equal(contactValidationError('messenger', 'm.me/nikkorod03'), null);
  assert.equal(normalizeContactValue('messenger', 'm.me/nikkorod03'), 'https://m.me/nikkorod03');
  assert.equal(contactAction('messenger', 'https://m.me/nikkorod03')?.url, 'https://m.me/nikkorod03');
});

test('Facebook links reject lookalike domains', () => {
  assert.equal(contactValidationError('facebook', 'facebook.com/nicanor'), null);
  assert.equal(contactValidationError('facebook', 'fac3book.com/nikkorod03'), 'Use a Facebook link like facebook.com/username.');
  assert.equal(normalizeContactValue('facebook', 'fb.com/nikkorod03'), 'https://facebook.com/nikkorod03');
});

test('phone contacts require an 11-digit 09 mobile number', () => {
  assert.equal(contactValidationError('phone', '09458492263'), null);
  assert.equal(normalizeContactValue('phone', '0945 849 2263'), '09458492263');
  assert.equal(contactValidationError('phone', '9458492263'), 'Enter an 11-digit mobile number starting with 09.');
  assert.equal(contactAction('phone', '09458492263')?.url, 'tel:09458492263');
});

test('email contacts produce a mail action', () => {
  assert.equal(contactValidationError('email', 'NIKKO@example.com'), null);
  assert.equal(normalizeContactValue('email', 'NIKKO@example.com'), 'nikko@example.com');
  assert.equal(contactAction('email', 'nikko@example.com')?.url, 'mailto:nikko@example.com');
});
