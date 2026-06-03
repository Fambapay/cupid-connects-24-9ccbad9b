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
    <Preview>Tens um novo match no Hunie 💘</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Brand />
          <Heading style={h1}>
            {name ? `${name}, é um match! 💘` : 'É um match! 💘'}
          </Heading>
          <Text style={text}>
            {matchName
              ? `Tu e ${matchName} deram like um no outro.`
              : 'Acabaste de fazer um novo match.'}{' '}
            Manda uma mensagem antes que esfrie!
          </Text>
          <Section style={buttonWrap}>
            <Button href={APP_URL} style={button}>
              Enviar mensagem
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
  subject: 'Tens um novo match no Hunie 💘',
  displayName: 'Novo match',
  previewData: { name: 'Ana', matchName: 'Diogo' },
} satisfies TemplateEntry
