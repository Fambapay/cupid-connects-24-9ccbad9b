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

interface NewMessageProps {
  name?: string
  senderName?: string
  preview?: string
  matchId?: string
}

const NewMessageEmail = ({ name, senderName, preview, matchId }: NewMessageProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>{senderName ? `${senderName} enviou-te uma mensagem` : 'Tens uma nova mensagem'}</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Brand />
          <Heading style={h1}>
            {senderName ? `${senderName} mandou-te uma mensagem` : 'Nova mensagem 💬'}
          </Heading>
          {name && <Text style={text}>Olá {name},</Text>}
          {preview && (
            <Text style={{ ...text, fontStyle: 'italic', borderLeft: '3px solid #ec4899', paddingLeft: 12 }}>
              "{preview}"
            </Text>
          )}
          <Section style={buttonWrap}>
            <Button href={`https://hunie.app/chat/${matchId || ''}`} style={button}>
              Responder
            </Button>
          </Section>
          <Footer siteName={SITE_NAME} />
        </Container>
      </Section>
    </Body>
  </Html>
)

export const template = {
  component: NewMessageEmail,
  subject: (data: Record<string, any>) =>
    data.senderName ? `${data.senderName} mandou-te uma mensagem 💬` : 'Tens uma nova mensagem 💬',
  displayName: 'Nova mensagem',
  previewData: { name: 'Ana', senderName: 'Diogo', preview: 'Olá! Como estás?', matchId: 'abc' },
} satisfies TemplateEntry
