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
    <Preview>Vamos arranjar te uma password nova no {siteName}</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Brand />
          <Heading style={h1}>Acontece aos melhores 🙈</Heading>
          <Text style={text}>
            Recebemos um pedido para repor a password da tua conta no {siteName}. Carrega no botão e escolhe uma nova. Recomendamos uma que consigas mesmo decorar.
          </Text>
          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>
              Criar nova password
            </Button>
          </Section>
          <Text style={{ ...text, fontSize: '13px', color: '#6b5566' }}>
            Não foste tu? Respira fundo. Ignora este email e a tua password atual continua igualzinha.
          </Text>
          <Footer siteName={siteName} />
        </Container>
      </Section>
    </Body>
  </Html>
)

export default RecoveryEmail
