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
  button,
  buttonWrap,
  container,
  h1,
  main,
  text,
  wrapper,
} from './_shared'

const SITE_NAME = 'Hunie'
const UPGRADE_URL = 'https://hunie.app/membership'

type Phase = 'trialing' | 'grace_period'

interface TrialEndingProps {
  name?: string
  phase?: Phase
  hoursLeft?: number
}

const headlineFor = (phase: Phase, name?: string) => {
  const who = name ? `${name}, ` : ''
  if (phase === 'grace_period')
    return `${who}o teu acesso está a fechar a porta 🚪`
  return `${who}amanhã o teu trial termina ⏳`
}

const bodyFor = (phase: Phase) => {
  if (phase === 'grace_period')
    return 'O trial acabou e estás no período de cortesia. Daqui a menos de 24h perdes o discovery, os likes e as conversas. Ativa a tua subscrição agora e continua onde ficaste — sem drama, sem pausa.'
  return 'Faltam menos de 24 horas do teu trial premium. Depois disso, o discovery, os super likes e as conversas ficam em pausa. Escolhe um plano e mantém tudo a andar — os matches não gostam de esperar.'
}

const ctaFor = (phase: Phase) =>
  phase === 'grace_period' ? 'Reativar agora' : 'Escolher o meu plano'

const previewFor = (phase: Phase) =>
  phase === 'grace_period'
    ? 'Estás no período de cortesia. Menos de 24h para reativar.'
    : 'O teu trial termina amanhã. Escolhe um plano e continua.'

const TrialEndingEmail = ({
  name,
  phase = 'trialing',
  hoursLeft,
}: TrialEndingProps) => {
  const hint =
    typeof hoursLeft === 'number'
      ? `Restam cerca de ${Math.max(1, Math.round(hoursLeft))} horas.`
      : null
  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>{previewFor(phase)}</Preview>
      <Body style={main}>
        <Section style={wrapper}>
          <Container style={container}>
            <Brand />
            <Heading style={h1}>{headlineFor(phase, name)}</Heading>
            <Text style={text}>{bodyFor(phase)}</Text>
            {hint ? <Text style={text}>{hint}</Text> : null}
            <Section style={buttonWrap}>
              <Button href={UPGRADE_URL} style={button}>
                {ctaFor(phase)}
              </Button>
            </Section>
            <Footer siteName={SITE_NAME} />
          </Container>
        </Section>
      </Body>
    </Html>
  )
}

export const template = {
  component: TrialEndingEmail,
  subject: (d: Record<string, any>) =>
    d?.phase === 'grace_period'
      ? 'O teu acesso ao Hunie acaba em menos de 24h ⏳'
      : 'O teu trial no Hunie termina amanhã ⏳',
  displayName: 'Trial a terminar',
  previewData: { name: 'Ana', phase: 'trialing', hoursLeft: 24 },
} satisfies TemplateEntry
