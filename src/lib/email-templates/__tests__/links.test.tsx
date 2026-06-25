import * as React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@react-email/components'

import { TEMPLATES } from '../registry'
import { SignupEmail } from '../signup'
import { InviteEmail } from '../invite'
import { MagicLinkEmail } from '../magic-link'
import { RecoveryEmail } from '../recovery'
import { EmailChangeEmail } from '../email-change'
import { ReauthenticationEmail } from '../reauthentication'

/**
 * Sample auth payload mirroring the props the auth webhook injects
 * (see src/routes/lovable/email/auth/webhook.ts → templateProps).
 */
const AUTH_PROPS = {
  siteName: 'Hunie',
  siteUrl: 'https://hunie.app',
  recipient: 'jane@example.com',
  confirmationUrl: 'https://hunie.app/auth/callback?token=abc123',
  token: '123456',
  email: 'jane@example.com',
  oldEmail: 'jane@example.com',
  newEmail: 'jane.new@example.com',
}

const AUTH_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  'email-change': EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

/**
 * Extracts every href attribute from a rendered HTML string.
 * Matches both `href="..."` and `href='...'`.
 */
function extractHrefs(html: string): string[] {
  const out: string[] = []
  const re = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) out.push(m[1] ?? m[2] ?? '')
  return out
}

/**
 * A link is valid for an email if it's:
 *  - an absolute https URL (preferred), OR
 *  - a mailto: link, OR
 *  - the unsubscribe placeholder that the dispatcher rewrites server-side.
 *
 * Relative paths, "#", empty strings, and undefined/null interpolation
 * artifacts ("undefined", "null", "[object Object]") are all rejected —
 * mail clients won't resolve them.
 */
function assertValidLink(href: string, ctx: string) {
  expect(href, `${ctx}: empty href`).not.toBe('')
  expect(href, `${ctx}: placeholder hash`).not.toBe('#')
  expect(href, `${ctx}: leaked undefined`).not.toMatch(/\b(undefined|null|\[object Object\])\b/)
  // Allow the unsubscribe placeholder appended by the queue dispatcher.
  if (href.startsWith('{{')) return
  if (href.startsWith('mailto:')) {
    expect(href, `${ctx}: mailto without address`).toMatch(/^mailto:[^@\s]+@[^@\s]+$/)
    return
  }
  expect(href, `${ctx}: not absolute`).toMatch(/^https?:\/\//)
  // Reject obvious dev/localhost leakage in production templates.
  expect(href, `${ctx}: localhost leak`).not.toMatch(/localhost|127\.0\.0\.1/)
  // URL constructor catches malformed URLs (spaces, missing host, etc.).
  expect(() => new URL(href), `${ctx}: malformed URL`).not.toThrow()
}

describe('app email templates (registry)', () => {
  for (const [name, entry] of Object.entries(TEMPLATES)) {
    it(`${name}: renders and every link is valid`, async () => {
      const props = entry.previewData ?? {}
      const html = await render(React.createElement(entry.component, props))
      expect(html.length, `${name}: empty render`).toBeGreaterThan(100)
      const hrefs = extractHrefs(html)
      expect(hrefs.length, `${name}: expected at least one link/CTA`).toBeGreaterThan(0)
      for (const href of hrefs) assertValidLink(href, `${name} → ${href}`)
    })

    it(`${name}: subject resolves to non-empty string`, () => {
      const subject =
        typeof entry.subject === 'function'
          ? entry.subject(entry.previewData ?? {})
          : entry.subject
      expect(subject, `${name}: missing subject`).toBeTruthy()
      expect(subject.length, `${name}: empty subject`).toBeGreaterThan(0)
    })
  }
})

describe('auth email templates (webhook)', () => {
  for (const [name, Component] of Object.entries(AUTH_TEMPLATES)) {
    it(`${name}: renders and every link is valid`, async () => {
      const html = await render(React.createElement(Component, AUTH_PROPS))
      expect(html.length, `${name}: empty render`).toBeGreaterThan(100)
      const hrefs = extractHrefs(html)
      // Reauthentication is a code-only email — link is optional.
      if (name !== 'reauthentication') {
        expect(hrefs.length, `${name}: expected at least one link`).toBeGreaterThan(0)
      }
      for (const href of hrefs) assertValidLink(href, `${name} → ${href}`)
    })

    it(`${name}: confirmation URL appears in body when applicable`, async () => {
      if (name === 'reauthentication') return // code-based, no URL
      const html = await render(React.createElement(Component, AUTH_PROPS))
      expect(html, `${name}: confirmation URL missing`).toContain(AUTH_PROPS.confirmationUrl)
    })
  }
})
