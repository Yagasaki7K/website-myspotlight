import Document, {
    DocumentContext,
    Head,
    Html,
    Main,
    NextScript,
} from "next/document";
import { ServerStyleSheet } from "styled-components";

export default class MyDocument extends Document {
    static async getInitialProps(ctx: DocumentContext) {
        const sheet = new ServerStyleSheet();
        const originalRenderPage = ctx.renderPage;

        try {
            ctx.renderPage = () =>
                originalRenderPage({
                    enhanceApp: (App) => (props) =>
                        sheet.collectStyles(<App {...props} />),
                });

            const initialProps = await Document.getInitialProps(ctx);

            return {
                ...initialProps,
                styles: (
                    <>
                        {initialProps.styles}
                        {sheet.getStyleElement()}
                    </>
                ),
            };
        } finally {
            sheet.seal();
        }
    }

    render() {
        return (
            <Html lang="pt-br" data-scroll-behavior="smooth">
                <Head>
                    <meta name="description" content="" />
                    <link rel="canonical" href="" />

                    <meta property="og:url" content="" />
                    <meta property="og:title" content="" />
                    <meta
                        property="og:description"
                        content=""
                    />
                    <meta property="og:image" content="/thumbnail.png" />

                    <meta property="og:image:width" content="460" />
                    <meta property="og:image:height" content="460" />
                    <meta property="og:image:alt" content="" />
                    <meta property="og:image:type" content="image/png" />
                    <meta property="og:site_name" content="" />

                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:site" content="@" />
                    <meta name="twitter:creator" content="@" />

                    <meta
                        name="keywords"
                        content=""
                    />

                    <meta name="author" content="Anderson 'Yagasaki' Marlon" />
                    <meta name="robots" content="index, follow" />

                    <link rel="shortcut icon" href="" type="image/png" />

                    <meta property="og:locale" content="pt_BR" />

                    <title></title>
                </Head>

                <body>
                    <Main />
                    <NextScript />
                </body>
            </Html>
        );
    }
}