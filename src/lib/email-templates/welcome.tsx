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
    <Preview>Bem-vindo(a) ao Hunie — vamos encontrar o teu match ✨</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Brand />
          <Heading style={h1}>
            {name ? `Olá, ${name}! 💕` : 'Bem-vindo(a) ao Hunie! 💕'}
          </Heading>
          <Text style={text}>
            Estamos super felizes por te ter aqui. O Hunie foi criado para te ajudar a
            conhecer pessoas reais e encontrar conexões que importam.
          </Text>
          <Text style={text}>
            Para começar, completa o teu perfil com fotos e prompts — perfis completos
            recebem até 5x mais matches.
          </Text>
          <Section style={buttonWrap}>
            <Button href={APP_URL} style={button}>
              Começar agora
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
  subject: 'Bem-vindo(a) ao Hunie 💕',
  displayName: 'Boas-vindas',
  previewData: { name: 'Ana' },
} satisfies TemplateEntry
