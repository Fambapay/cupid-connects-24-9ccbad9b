import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
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
  link,
  main,
  text,
  wrapper,
} from './_shared'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Alguém abriu te a porta do {siteName} 💌</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Brand />
          <Heading style={h1}>Convite em mão 💌</Heading>
          <Text style={text}>
            Foste convidada(o) para entrar no{' '}
            <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>. Cria a tua conta, espreita os perfis e vê se há alguém ali a fazer o teu género.
          </Text>
          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>
              Aceitar convite
            </Button>
          </Section>
          <Text style={{ ...text, fontSize: '13px', color: '#6b5566' }}>
            Não estavas à espera deste convite? Tudo bem, ignora à vontade.
          </Text>
          <Footer siteName={siteName} />
        </Container>
      </Section>
    </Body>
  </Html>
)

export default InviteEmail
