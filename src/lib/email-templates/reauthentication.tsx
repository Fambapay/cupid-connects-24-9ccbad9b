import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import {
  Brand,
  Footer,
  codeStyle,
  container,
  h1,
  main,
  text,
  wrapper,
} from './_shared'

interface ReauthenticationEmailProps {
  siteName?: string
  token: string
}

export const ReauthenticationEmail = ({
  siteName = 'hunie',
  token,
}: ReauthenticationEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>O teu código secreto do {siteName}</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Brand />
          <Heading style={h1}>Prova que és tu 🕵️</Heading>
          <Text style={text}>
            Usa o código abaixo para confirmar que do outro lado do ecrã está mesmo a pessoa certa.
          </Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={{ ...text, fontSize: '13px', color: '#6b5566' }}>
            O código tem validade curta. Se não foste tu, ignora e finge que nunca viste.
          </Text>
          <Footer siteName={siteName} />
        </Container>
      </Section>
    </Body>
  </Html>
)

export default ReauthenticationEmail
