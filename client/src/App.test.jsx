import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { expect, test } from 'vitest'
import App from './App.jsx'

test('provider sign-in identifies the fictional prototype and labels inputs', () => {
  const html = renderToStaticMarkup(<MemoryRouter><App /></MemoryRouter>)
  expect(html).toContain('fictional data only')
  expect(html).toContain('Demo username')
  expect(html).toContain('Demo password')
  expect(html).toContain('href="#main"')
})
