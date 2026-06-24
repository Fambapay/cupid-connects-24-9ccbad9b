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
const APP_URL = 'https://hunie.app/matches'

interface NewMatchProps {
  name?: string
  matchName?: string
}

const NewMatchEmail = ({ name, matchName }: NewMatchProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Match novo no Hunie 💘</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Brand />
          <Heading style={h1}>
            {name ? `${name}, é match! 💘` : 'É match! 💘'}
          </Heading>
          <Text style={text}>
            {matchName
              ? `Tu e ${matchName} deram like um ao outro.`
              : 'Acabaste de fazer um match novo.'}{' '}
            Agora começa a parte difícil: dizer olá sem soar a robô. Acreditamos em ti.
          </Text>
          <Section style={buttonWrap}>
            <Button href={APP_URL} style={button}>
              Mandar mensagem
            </Button>
          </Section>
          <Footer siteName={SITE_NAME} />
        </Container>
      </Section>
    </Body>
  </Html>
)

export const template = {
  component: NewMatchEmail,
  subject: 'Match novo no Hunie 💘',
  displayName: 'Novo match',
  previewData: { name: 'Ana', matchName: 'Diogo' },
} satisfies TemplateEntry
