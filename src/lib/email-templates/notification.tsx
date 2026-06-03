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
  button,
  buttonWrap,
  container,
  h1,
  main,
  text,
  wrapper,
} from './_shared'

const SITE_NAME = 'Hunie'

interface NotificationProps {
  name?: string
  title?: string
  message?: string
  ctaLabel?: string
  ctaUrl?: string
}

const NotificationEmail = ({
  name,
  title = 'Tens uma novidade no Hunie',
  message = 'Abre a app para veres o que aconteceu.',
  ctaLabel,
  ctaUrl,
}: NotificationProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>{title}</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Brand />
          <Heading style={h1}>{name ? `${name}, ${title.toLowerCase()}` : title}</Heading>
          <Text style={text}>{message}</Text>
          {ctaUrl && ctaLabel ? (
            <Section style={buttonWrap}>
              <Button href={ctaUrl} style={button}>
                {ctaLabel}
              </Button>
            </Section>
          ) : null}
          <Footer siteName={SITE_NAME} />
        </Container>
      </Section>
    </Body>
  </Html>
)

export const template = {
  component: NotificationEmail,
  subject: (data) => (data?.title as string) || 'Tens uma novidade no Hunie',
  displayName: 'Notificação',
  previewData: {
    name: 'Ana',
    title: 'Alguém viu o teu perfil 👀',
    message: 'Abre a app para descobrires quem mostrou interesse.',
    ctaLabel: 'Abrir Hunie',
    ctaUrl: 'https://hunie.app',
  },
} satisfies TemplateEntry
