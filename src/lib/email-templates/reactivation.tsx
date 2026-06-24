import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import {
  Brand,
  Footer,
  buttonWrap,
  button,
  container,
  h1,
  main,
  text,
  wrapper,
} from './_shared'

const SITE_NAME = 'Hunie'
const APP_URL = 'https://hunie.app/discover'

interface ReactivationProps {
  name?: string
  daysInactive?: number
}

const headlineFor = (d: number, name?: string) => {
  const who = name ? `${name}, ` : ''
  if (d >= 30) return `${who}já cá não cantava o galo ☕`
  if (d >= 14) return `${who}andas a fazer falta por aqui 💔`
  return `${who}há novidades à tua espera 👀`
}

const bodyFor = (d: number) => {
  if (d >= 30) return 'Já passou um mês desde a tua última visita. Apareceu gente nova na tua zona e estás a perder o melhor da festa.'
  if (d >= 14) return 'Duas semanas sem vires por cá. Os melhores matches acontecem para quem dá ar de si.'
  return 'Há perfis novos e até é bem provável que alguém já te tenha dado like. Não fica bem deixares esperar.'
}

const ReactivationEmail = ({ name, daysInactive = 7 }: ReactivationProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>{bodyFor(daysInactive)}</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Brand />
          <Heading style={h1}>{headlineFor(daysInactive, name)}</Heading>
          <Text style={text}>{bodyFor(daysInactive)}</Text>
          <Section style={buttonWrap}>
            <Button href={APP_URL} style={button}>
              Voltar ao Hunie
            </Button>
          </Section>
          <Footer siteName={SITE_NAME} />
        </Container>
      </Section>
    </Body>
  </Html>
)

export const template = {
  component: ReactivationEmail,
  subject: (d: Record<string, any>) => {
    const days = d?.daysInactive ?? 7
    if (days >= 30) return 'Voltas ao Hunie? ☕'
    if (days >= 14) return 'Andas a fazer falta no Hunie 💔'
    return 'Tens novidades no Hunie 👀'
  },
  displayName: 'Reativação',
  previewData: { name: 'Ana', daysInactive: 7 },
} satisfies TemplateEntry
