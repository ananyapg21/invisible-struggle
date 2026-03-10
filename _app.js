import '../styles/globals.css'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>The Invisible Struggle — You Are Not Alone</title>
        <meta name="description" content="An anonymous constellation of shared struggles. Every star is a real voice. You are not alone." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        {/* Open Graph for link previews when sharing on social */}
        <meta property="og:title" content="The Invisible Struggle" />
        <meta property="og:description" content="An anonymous constellation of shared struggles. You are not alone." />
        <meta property="og:type" content="website" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✦</text></svg>" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@200;300;400&display=swap" rel="stylesheet" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
