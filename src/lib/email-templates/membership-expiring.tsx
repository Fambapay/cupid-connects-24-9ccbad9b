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
const RENEW_URL = 'https://hunie.app/membership'

interface MembershipExpiringProps {
  name?: string
  tier?: string
  daysLeft?: number
  expiresOn?: string
}

const tierLabel = (t?: string) =>
  t === 'elite' ? 'Elite' : t === 'plus' ? 'Plus' : t === 'select' ? 'Select' : 'Membership'

const MembershipExpiringEmail = ({
  name,
  tier,
  daysLeft = 3,
  expiresOn,
}: MembershipExpiringProps) => {
  const label = tierLabel(tier)
  const days = daysLeft === 1 ? '1 dia' : `${daysLeft} dias`
  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>O teu Hunie {label} expira em {days}</Preview>
      <Body style={main}>
        <Section style={wrapper}>
          <Container style={container}>
            <Brand />
            <Heading style={h1}>
              {name ? `${name}, ` : ''}o teu {label} expira em {days}
            </Heading>
            <Text style={text}>
              {expiresOn
                ? `A tua subscrição termina a ${expiresOn}. `
                : ''}
              Renova agora para não perderes likes ilimitados, super likes diários, boost e ver quem te deu like.
            </Text>
            <Section style={buttonWrap}>
              <Button href={RENEW_URL} style={button}>
                Renovar {label}
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
  component: MembershipExpiringEmail,
  subject: (d: Record<string, any>) => {
    const days = d?.daysLeft === 1 ? '1 dia' : `${d?.daysLeft ?? 3} dias`
    return `O teu Hunie expira em ${days} — renova já`
  },
  displayName: 'Membership a expirar',
  previewData: { name: 'Ana', tier: 'plus', daysLeft: 3, expiresOn: '12 jun' },
} satisfies TemplateEntry
