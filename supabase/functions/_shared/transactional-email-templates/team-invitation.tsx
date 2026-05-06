/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
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
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'AxonTur'

interface TeamInvitationProps {
  agencyName?: string
  inviterEmail?: string
  roleLabel?: string
  acceptUrl?: string
  expiresInDays?: number
}

const TeamInvitationEmail = ({
  agencyName = 'tu agencia',
  inviterEmail = 'un administrador',
  roleLabel = 'Vendedor',
  acceptUrl = 'https://axontur.lovable.app',
  expiresInDays = 7,
}: TeamInvitationProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Te invitaron a unirte a {agencyName} en {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>{SITE_NAME}</Text>
          <Text style={tagline}>ERP para agencias de viaje</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Te invitaron a {agencyName}</Heading>
          <Text style={text}>
            <strong>{inviterEmail}</strong> te invitó a colaborar en{' '}
            <strong>{agencyName}</strong> dentro de {SITE_NAME} con el rol de{' '}
            <strong>{roleLabel}</strong>.
          </Text>
          <Text style={text}>
            Hacé click en el botón para aceptar la invitación y comenzar a usar el sistema.
            El link expira en {expiresInDays} {expiresInDays === 1 ? 'día' : 'días'}.
          </Text>
          <Section style={btnWrap}>
            <Button style={button} href={acceptUrl}>
              Aceptar invitación
            </Button>
          </Section>
          <Text style={smallText}>
            Si el botón no funciona, copiá y pegá este link en tu navegador:
          </Text>
          <Text style={linkBox}>{acceptUrl}</Text>
          <Text style={footer}>
            Si no esperabas esta invitación, podés ignorar este mensaje.
            Necesitás iniciar sesión con la dirección de email a la que llegó este mail para aceptar la invitación.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TeamInvitationEmail,
  subject: (data: Record<string, any>) =>
    `Te invitaron a ${data?.agencyName || 'una agencia'} en ${SITE_NAME}`,
  displayName: 'Invitación de equipo',
  previewData: {
    agencyName: 'Vicka Turismo',
    inviterEmail: 'admin@vickaturismo.tur.ar',
    roleLabel: 'Vendedor',
    acceptUrl: 'https://axontur.lovable.app/accept-invitation?token=preview',
    expiresInDays: 7,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif", margin: 0, padding: '40px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 20px' }
const header = { textAlign: 'center' as const, padding: '0 0 24px' }
const brand = { fontSize: '26px', fontWeight: 700, color: '#1d324d', letterSpacing: '0.5px', margin: 0 }
const tagline = { fontSize: '13px', color: '#64748b', margin: '4px 0 0' }
const card = { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '40px 32px' }
const h1 = { fontSize: '22px', fontWeight: 600, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const btnWrap = { textAlign: 'center' as const, margin: '32px 0' }
const button = { backgroundColor: '#1d324d', color: '#ffffff', fontSize: '15px', fontWeight: 600, borderRadius: '8px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const smallText = { fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '16px 0 8px' }
const linkBox = { fontSize: '12px', color: '#475569', wordBreak: 'break-all' as const, backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '6px', margin: 0 }
const footer = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '24px 0 0', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }
