/* eslint-disable no-undef */
const { EventEmitter } = require('events')
const { eventEmitter } = require('../lib/utils')

describe('Utils', () => {
  test('eventEmitter is instance of EventEmitter', () => {
    expect(eventEmitter).toBeInstanceOf(EventEmitter)
  })
})
