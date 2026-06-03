import * as React from 'react'
import { Container, Hr, Section, Text } from '@react-email/components'

export const BRAND_PINK = '#FF4FA3'
export const BRAND_PINK_DARK = '#E935A0'
export const BRAND_BG = '#FFF5F9'
export const TEXT_DARK = '#1a0b16'
export const TEXT_MUTED = '#6b5566'

export const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
}

export const wrapper = {
  backgroundColor: BRAND_BG,
  padding: '32px 16px',
}

export const container = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '40px 32px',
  maxWidth: '560px',
  margin: '0 auto',
  boxShadow: '0 4px 24px rgba(233, 53, 160, 0.08)',
}

export const logoWrap = {
  textAlign: 'center' as const,
  margin: '0 0 28px',
}

export const logoText = {
  fontSize: '28px',
  fontWeight: 800 as const,
  letterSpacing: '-0.02em',
  color: BRAND_PINK,
  margin: 0,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

export const h1 = {
  fontSize: '24px',
  fontWeight: 700 as const,
  color: TEXT_DARK,
  margin: '0 0 16px',
  lineHeight: '1.3',
}

export const text = {
  fontSize: '15px',
  color: TEXT_DARK,
  lineHeight: '1.6',
  margin: '0 0 20px',
}

export const button = {
  backgroundColor: BRAND_PINK,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '999px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const buttonWrap = {
  textAlign: 'center' as const,
  margin: '28px 0',
}

export const link = { color: BRAND_PINK_DARK, textDecoration: 'underline' }

export const codeStyle = {
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSize: '28px',
  fontWeight: 700 as const,
  letterSpacing: '0.3em',
  color: BRAND_PINK_DARK,
  backgroundColor: BRAND_BG,
  borderRadius: '12px',
  padding: '18px 24px',
  textAlign: 'center' as const,
  margin: '8px 0 24px',
}

export const hr = {
  borderColor: '#f3e3ec',
  margin: '32px 0 20px',
}

export const footer = {
  fontSize: '12px',
  color: TEXT_MUTED,
  lineHeight: '1.6',
  textAlign: 'center' as const,
  margin: '0',
}

export const Brand = () => (
  <Section style={logoWrap}>
    <Text style={logoText}>hunie</Text>
  </Section>
)

export const Footer = ({ siteName }: { siteName: string }) => (
  <>
    <Hr style={hr} />
    <Text style={footer}>
      Enviado por <strong style={{ color: BRAND_PINK_DARK }}>{siteName}</strong>
      <br />
      Encontra alguém especial. ✨
    </Text>
  </>
)
