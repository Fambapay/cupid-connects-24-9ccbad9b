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

interface NewLikeProps {
  name?: string
  likerName?: string
  isPremium?: boolean
  isSuper?: boolean
}

const NewLikeEmail = ({ name, likerName, isPremium, isSuper }: NewLikeProps) => {
  const reveal = isPremium && likerName ? likerName : 'Alguém'
  const headline = isSuper ? 'Super Like a caminho ⭐' : `${reveal} deu te like 👀`
  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>Like novinho no teu perfil</Preview>
      <Body style={main}>
        <Section style={wrapper}>
          <Container style={container}>
            <Brand />
            <Heading style={h1}>{headline}</Heading>
            {name && <Text style={text}>Olá {name},</Text>}
            <Text style={text}>
              {isPremium && likerName
                ? `${likerName} ficou caidinha(o) pelo teu perfil. A bola está do teu lado.`
                : 'Há alguém de olho no teu perfil. Quem? Bem, esse é o pequeno mistério que o Premium resolve.'}
            </Text>
            <Section style={buttonWrap}>
              <Button
                href={isPremium ? 'https://hunie.app/discover' : 'https://hunie.app/membership'}
                style={button}
              >
                {isPremium ? 'Ver no Hunie' : 'Descobrir quem foi'}
              </Button>
            </Section>
            <Footer siteName={SITE_NAME} />
          </Container>
        </Section>
      </Body>
    </Html>
  )
}

export const template = {
  component: NewLikeEmail,
  subject: (data: Record<string, any>) =>
    data.isSuper ? 'Super Like para ti ⭐' : 'Alguém deu te like no Hunie 👀',
  displayName: 'Novo like',
  previewData: { name: 'Ana', likerName: 'Diogo', isPremium: false, isSuper: false },
} satisfies TemplateEntry
