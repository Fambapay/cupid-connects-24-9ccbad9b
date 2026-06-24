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
const APP_URL = 'https://hunie.app'

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Bem vinda(o) ao Hunie. Hora de ir conhecer gente ✨</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Brand />
          <Heading style={h1}>
            {name ? `Boas, ${name}! 💕` : 'Boas, é bom ter te aqui 💕'}
          </Heading>
          <Text style={text}>
            O teu lugar no Hunie está pronto. A partir de agora é entre tu, o ecrã e a coragem de dizer olá.
          </Text>
          <Text style={text}>
            Dica em jeito de conselho de amiga: perfis com fotos boas e prompts honestos recebem muito mais matches que perfis vazios a cheirar a mistério.
          </Text>
          <Section style={buttonWrap}>
            <Button href={APP_URL} style={button}>
              Completar o meu perfil
            </Button>
          </Section>
          <Footer siteName={SITE_NAME} />
        </Container>
      </Section>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Bem vinda(o) ao Hunie 💕',
  displayName: 'Boas vindas',
  previewData: { name: 'Ana' },
} satisfies TemplateEntry
