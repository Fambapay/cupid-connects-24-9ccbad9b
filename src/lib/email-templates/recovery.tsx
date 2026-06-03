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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Repõe a tua password no {siteName}</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Brand />
          <Heading style={h1}>Repor a tua password</Heading>
          <Text style={text}>
            Recebemos um pedido para repor a password da tua conta no{' '}
            {siteName}. Carrega no botão abaixo para escolher uma nova.
          </Text>
          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>
              Repor password
            </Button>
          </Section>
          <Text style={{ ...text, fontSize: '13px', color: '#6b5566' }}>
            Se não foste tu a pedir isto, podes ignorar este email — a tua
            password vai continuar igual.
          </Text>
          <Footer siteName={siteName} />
        </Container>
      </Section>
    </Body>
  </Html>
)

export default RecoveryEmail
