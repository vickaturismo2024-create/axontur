import * as React from 'npm:react@18.3.1'
import { Html, Body, Head } from 'npm:@react-email/components@0.0.22'

interface Props {
  html: string;
  subject: string;
}

export const RawHtmlEmail = ({ html }: Props) => {
  return (
    <Html>
      <Head />
      <Body dangerouslySetInnerHTML={{ __html: html }} />
    </Html>
  )
}

export const template = {
  component: RawHtmlEmail,
  subject: (data: Record<string, any>) => data.subject || 'Sin Asunto',
}
