/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  siteName?: string
  token: string
}

export const ReauthenticationEmail = ({ siteName = 'AxonTur', token }: ReauthenticationEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu código de verificación</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>{siteName}</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Confirmá tu identidad</Heading>
          <Text style={text}>Usá el siguiente código para confirmar tu identidad:</Text>
          <Section style={codeWrap}>
            <Text style={codeStyle}>{token}</Text>
          </Section>
          <Text style={footer}>
            Este código expira en breve. Si no lo solicitaste, podés ignorar este mensaje.
          </Text>
        </Section>
        <Text style={legal}>© {siteName} · Plataforma de gestión para agencias de viaje</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Helvetica, Arial, sans-serif", margin: 0, padding: '40px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 20px' }
const header = { textAlign: 'center' as const, padding: '0 0 24px' }
const brand = { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '28px', fontWeight: 700, color: 'hsl(215, 50%, 23%)', letterSpacing: '0.5px', margin: 0, textTransform: 'capitalize' as const }
const card = { backgroundColor: 'hsl(40, 33%, 98%)', border: '1px solid hsl(40, 20%, 88%)', borderRadius: '12px', padding: '40px 32px' }
const h1 = { fontFamily: "'Playfair Display', Georgia, serif", fontSize: '24px', fontWeight: 600, color: 'hsl(215, 50%, 15%)', margin: '0 0 20px' }
const text = { fontSize: '15px', color: 'hsl(215, 20%, 35%)', lineHeight: '1.6', margin: '0 0 16px' }
const codeWrap = { textAlign: 'center' as const, margin: '24px 0' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '32px', fontWeight: 700, letterSpacing: '6px', color: 'hsl(215, 50%, 15%)', backgroundColor: '#ffffff', border: '1px solid hsl(40, 20%, 88%)', borderRadius: '12px', padding: '16px 24px', display: 'inline-block', margin: 0 }
const footer = { fontSize: '13px', color: 'hsl(215, 20%, 45%)', margin: '24px 0 0', paddingTop: '20px', borderTop: '1px solid hsl(40, 20%, 88%)' }
const legal = { fontSize: '12px', color: 'hsl(215, 20%, 55%)', textAlign: 'center' as const, margin: '24px 0 0' }
