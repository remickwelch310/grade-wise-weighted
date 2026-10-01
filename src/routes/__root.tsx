import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { IdentityProvider } from '@/lib/identity'
import { TrackerProvider } from '@/lib/store'

import '../styles.css'

const siteName = 'Weighted — Grade & GPA Tracker'
const siteDescription =
  'Track class grades, year and cumulative GPA, simulate what-if scores, and find out what you need on your next test.'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: siteName,
      },
      {
        name: 'description',
        content: siteDescription,
      },
      {
        property: 'og:title',
        content: siteName,
      },
      {
        property: 'og:description',
        content: siteDescription,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap',
      },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <IdentityProvider>
          <TrackerProvider>
            <AppShell>{children}</AppShell>
          </TrackerProvider>
        </IdentityProvider>
        <Scripts />
      </body>
    </html>
  )
}
