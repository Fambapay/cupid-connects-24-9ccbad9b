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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>O teu atalho para entrar no {siteName}</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Brand />
          <Heading style={h1}>Entra sem decorar passwords ✨</Heading>
          <Text style={text}>
            Aqui está o teu atalho para o {siteName}. Carrega no botão e estás dentro. Avisamos já que dura pouco, por isso é melhor não deixar arrefecer.
          </Text>
          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>
              Entrar agora
            </Button>
          </Section>
          <Text style={{ ...text, fontSize: '13px', color: '#6b5566' }}>
            Não foste tu a pedir? Ignora à vontade, ninguém entra sem este link.
          </Text>
          <Footer siteName={siteName} />
        </Container>
      </Section>
    </Body>
  </Html>
)

export default MagicLinkEmail
