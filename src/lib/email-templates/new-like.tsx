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
  const headline = isSuper ? 'Recebeste um Super Like ⭐' : `${reveal} deu-te like 👀`
  return (
    <Html lang="pt" dir="ltr">
      <Head />
      <Preview>Tens um novo like no Hunie</Preview>
      <Body style={main}>
        <Section style={wrapper}>
          <Container style={container}>
            <Brand />
            <Heading style={h1}>{headline}</Heading>
            {name && <Text style={text}>Olá {name},</Text>}
            <Text style={text}>
              {isPremium && likerName
                ? `${likerName} mostrou interesse no teu perfil. Vai ver e dá o próximo passo.`
                : 'Alguém especial mostrou interesse no teu perfil. Faz upgrade para Hunie Premium e descobre quem é.'}
            </Text>
            <Section style={buttonWrap}>
              <Button
                href={isPremium ? 'https://hunie.app/discover' : 'https://hunie.app/membership'}
                style={button}
              >
                {isPremium ? 'Ver no Hunie' : 'Ver quem foi'}
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
    data.isSuper ? 'Recebeste um Super Like ⭐' : 'Alguém te deu like no Hunie 👀',
  displayName: 'Novo like',
  previewData: { name: 'Ana', likerName: 'Diogo', isPremium: false, isSuper: false },
} satisfies TemplateEntry
