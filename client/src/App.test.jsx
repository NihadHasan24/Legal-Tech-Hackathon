import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { expect, test } from 'vitest'
import App from './App.jsx'

test('provider sign-in offers role shortcuts and labels inputs without setup copy', () => {
  const html = renderToStaticMarkup(<MemoryRouter><App /></MemoryRouter>)
  expect(html).not.toContain('Sign in with a fictional provider account')
  expect(html).not.toContain('server/.demo-credentials.json')
  expect(html).not.toContain('Prototype · fictional data')
  expect(html).toContain('Demo username')
  expect(html).toContain('Demo password')
  expect(html).toContain('DLAO Officer')
  expect(html).toContain('UDC Operator')
  expect(html).toContain('href="#main"')
})
