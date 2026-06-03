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

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Confirma a alteração do teu email no {siteName}</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Brand />
          <Heading style={h1}>Confirmar mudança de email</Heading>
          <Text style={text}>
            Pediste para alterar o email da tua conta {siteName} de{' '}
            <Link href={`mailto:${oldEmail}`} style={link}>
              {oldEmail}
            </Link>{' '}
            para{' '}
            <Link href={`mailto:${newEmail}`} style={link}>
              {newEmail}
            </Link>
            .
          </Text>
          <Text style={text}>
            Carrega no botão abaixo para confirmares a mudança:
          </Text>
          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>
              Confirmar mudança
            </Button>
          </Section>
          <Text style={{ ...text, fontSize: '13px', color: '#6b5566' }}>
            Se não foste tu a pedir esta alteração, protege a tua conta o mais
            rápido possível.
          </Text>
          <Footer siteName={siteName} />
        </Container>
      </Section>
    </Body>
  </Html>
)

export default EmailChangeEmail
