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
  if (d >= 30) return `${who}voltas para um café? ☕`
  if (d >= 14) return `${who}sentimos a tua falta 💔`
  return `${who}tens novidades à tua espera 👀`
}

const bodyFor = (d: number) => {
  if (d >= 30) return 'Já passou um mês desde a tua última visita. Há novos perfis na tua zona — vê quem está à tua espera.'
  if (d >= 14) return 'Já há duas semanas que não passas por cá. Os melhores matches acontecem para quem está presente.'
  return 'Há novos perfis e provavelmente alguém já te deu like. Dá uma olhadela.'
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
    if (days >= 30) return 'Voltas para o Hunie? ☕'
    if (days >= 14) return 'Sentimos a tua falta no Hunie 💔'
    return 'Tens novidades à tua espera no Hunie 👀'
  },
  displayName: 'Reativação',
  previewData: { name: 'Ana', daysInactive: 7 },
} satisfies TemplateEntry
