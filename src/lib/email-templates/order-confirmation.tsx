import * as React from 'react'
import {
  Body,
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
  container,
  h1,
  main,
  text,
  wrapper,
  BRAND_BG,
  BRAND_PINK_DARK,
  TEXT_DARK,
} from './_shared'

const SITE_NAME = 'Hunie'

interface OrderProps {
  name?: string
  itemName?: string
  quantity?: number | string
  amount?: string
  currency?: string
  orderId?: string
}

const row = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px 0',
  fontSize: '15px',
  color: TEXT_DARK,
}

const summaryBox = {
  backgroundColor: BRAND_BG,
  borderRadius: '12px',
  padding: '20px 24px',
  margin: '20px 0 24px',
}

const totalText = {
  fontSize: '17px',
  fontWeight: 700 as const,
  color: BRAND_PINK_DARK,
}

const OrderConfirmationEmail = ({
  name,
  itemName = 'Pacote Hunie',
  quantity = 1,
  amount = '0',
  currency = 'MZN',
  orderId,
}: OrderProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Compra confirmada no Hunie ✨</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Brand />
          <Heading style={h1}>
            {name ? `Obrigado, ${name}! 💖` : 'Compra confirmada 💖'}
          </Heading>
          <Text style={text}>
            Recebemos a tua compra direitinha. Já podes voltar para a app e gastar isso com bom gosto.
          </Text>

          <Section style={summaryBox}>
            <div style={row}>
              <span>Item</span>
              <strong>{itemName}</strong>
            </div>
            <div style={row}>
              <span>Quantidade</span>
              <strong>{quantity}</strong>
            </div>
            <div style={row}>
              <span>Total</span>
              <span style={totalText}>
                {amount} {currency}
              </span>
            </div>
            {orderId ? (
              <div style={row}>
                <span>Referência</span>
                <strong>{orderId}</strong>
              </div>
            ) : null}
          </Section>

          <Text style={text}>
            Alguma coisa estranha? Responde a este email que damos uma mão.
          </Text>
          <Footer siteName={SITE_NAME} />
        </Container>
      </Section>
    </Body>
  </Html>
)

export const template = {
  component: OrderConfirmationEmail,
  subject: 'Compra confirmada no Hunie ✨',
  displayName: 'Confirmação de compra',
  previewData: {
    name: 'Ana',
    itemName: 'Super Likes, pacote de 10',
    quantity: 1,
    amount: '250',
    currency: 'MZN',
    orderId: 'HU-00123',
  },
} satisfies TemplateEntry
