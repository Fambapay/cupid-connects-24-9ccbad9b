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
    <Preview>O teu código de verificação {siteName}</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Brand />
          <Heading style={h1}>Confirma a tua identidade</Heading>
          <Text style={text}>
            Usa o código abaixo para confirmares que és mesmo tu:
          </Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={{ ...text, fontSize: '13px', color: '#6b5566' }}>
            Este código expira em breve. Se não foste tu a pedir, podes
            ignorar este email em segurança.
          </Text>
          <Footer siteName={siteName} />
        </Container>
      </Section>
    </Body>
  </Html>
)

export default ReauthenticationEmail
