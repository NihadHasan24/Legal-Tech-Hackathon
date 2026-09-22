import { expect } from '@playwright/test'

export const testDatabase = /^dlas_e2e_[a-f0-9]{12}$/
export const roleNames = {
  DLAO_OFFICER: 'DLAO officer', CASE_SUPPORT: 'Case support', HELPLINE_AGENT: 'Helpline agent',
  UDC_OPERATOR: 'UDC operator', PANEL_LAWYER: 'Panel lawyer', MEDIATOR: 'Mediator',
  RECEIVING_DLAO: 'Receiving DLAO', CLAO: 'CLAO',
}

export async function signIn(page, role) {
  const actor = JSON.parse(process.env.E2E_ACTORS)[role]
  await page.goto('/')
  await page.getByLabel('Demo username').fill(actor.username)
  await page.getByLabel('Demo password').fill(actor.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: `${roleNames[role]} workspace` })).toBeVisible()
}
